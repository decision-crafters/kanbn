const QUnit = require('qunit');
const mockRequire = require('mock-require');

// Mock Kanbn for testing
class MockKanbn {
    constructor() {
        this.tasks = new Map();
        this.columns = {
            'Backlog': [],
            'In Progress': [],
            'Done': []
        };
        this.index = {
            name: 'Test Project',
            description: 'Test project for workflow validation',
            columns: this.columns
        };
    }

    async initialised() {
        return true;
    }

    async getIndex() {
        return this.index;
    }

    async loadAllTrackedTasks() {
        return Array.from(this.tasks.values());
    }

    async createTask(taskData, column) {
        const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        this.tasks.set(taskId, { ...taskData, id: taskId });
        if (!this.columns[column]) {
            this.columns[column] = [];
        }
        this.columns[column].push(taskId);
        return taskId;
    }

    async moveTask(taskId, fromColumn, toColumn) {
        if (this.columns[fromColumn]?.includes(taskId)) {
            this.columns[fromColumn] = this.columns[fromColumn].filter(id => id !== taskId);
            if (!this.columns[toColumn]) {
                this.columns[toColumn] = [];
            }
            this.columns[toColumn].push(taskId);
            return true;
        }
        return false;
    }

    async updateTask(taskId, taskData) {
        if (this.tasks.has(taskId)) {
            this.tasks.set(taskId, { ...this.tasks.get(taskId), ...taskData });
            return true;
        }
        return false;
    }

    async status() {
        return {
            totalTasks: this.tasks.size,
            tasksByColumn: Object.fromEntries(
                Object.entries(this.columns).map(([col, tasks]) => [col, tasks.length])
            )
        };
    }
}

QUnit.module('Chat Workflow', {
    before: function() {
        this.originalEnv = { ...process.env };
        this.mockKanbn = new MockKanbn();

        mockRequire('../../src/main', {
            Kanbn: () => this.mockKanbn,
            findTaskColumn: (index, taskId) => {
                for (const [column, tasks] of Object.entries(index.columns)) {
                    if (tasks.includes(taskId)) {
                        return column;
                    }
                }
                return null;
            }
        });

        // Set up test environment
        process.env = {
            ...process.env,
            KANBN_ENV: 'test',
            OPENROUTER_API_KEY: 'test-api-key',
            NODE_ENV: 'test'
        };

        // Clear module cache
        delete require.cache[require.resolve('../../src/controller/chat')];
    },

    after: function() {
        process.env = this.originalEnv;
        mockRequire.stopAll();
    },

    beforeEach: function() {
        this.mockKanbn = new MockKanbn();
        global.chatHistory = [];
    }
});

QUnit.test('should handle complex chat workflows', async function(assert) {
    const chat = require('../../src/controller/chat');

    // Step 1: Create a project task
    const result1 = await chat({ message: 'Create a task called "Project Setup" with tag "high-priority"' });
    assert.ok(result1.includes('created'), 'Task should be created');

    // Verify task creation
    let tasks = await this.mockKanbn.loadAllTrackedTasks();
    let projectTask = tasks.find(t => t.name?.includes('Project Setup'));
    assert.ok(projectTask, 'Project task should exist');
    assert.ok(projectTask.metadata.tags.includes('high-priority'), 'Task should have priority tag');

    // Step 2: Add subtasks through chat
    const result2 = await chat({ message: 'Add three subtasks to Project Setup: "Install Dependencies", "Configure Environment", and "Setup Tests"' });
    assert.ok(result2.includes('created') || result2.includes('added'), 'Subtasks should be created');

    // Verify subtasks
    tasks = await this.mockKanbn.loadAllTrackedTasks();
    const subtasks = tasks.filter(t => 
        t.name?.includes('Dependencies') || 
        t.name?.includes('Environment') || 
        t.name?.includes('Tests')
    );
    assert.equal(subtasks.length, 3, 'Should have three subtasks');

    // Step 3: Move tasks through workflow
    const result3 = await chat({ message: 'Move Install Dependencies to In Progress' });
    assert.ok(result3.includes('moved'), 'Task should be moved');

    // Verify task movement
    tasks = await this.mockKanbn.loadAllTrackedTasks();
    const inProgressTask = tasks.find(t => t.name?.includes('Dependencies'));
    const { findTaskColumn } = require('../../src/main');
    const column = findTaskColumn(this.mockKanbn.index, inProgressTask.id);
    assert.equal(column, 'In Progress', 'Task should be in Progress');

    // Step 4: Add comments and update status
    const result4 = await chat({ message: 'Add comment to Install Dependencies: "NPM packages installed successfully"' });
    assert.ok(result4.includes('comment') || result4.includes('updated'), 'Comment should be added');

    // Verify comment addition
    tasks = await this.mockKanbn.loadAllTrackedTasks();
    const updatedTask = tasks.find(t => t.name?.includes('Dependencies'));
    assert.ok(
        updatedTask.comments?.some(c => c.text.includes('NPM packages')),
        'Task should have the new comment'
    );

    // Step 5: Complete task
    const result5 = await chat({ message: 'Move Install Dependencies to Done and mark as completed' });
    assert.ok(result5.includes('moved') || result5.includes('updated'), 'Task should be completed');

    // Verify task completion
    tasks = await this.mockKanbn.loadAllTrackedTasks();
    const completedTask = tasks.find(t => t.name?.includes('Dependencies'));
    const finalColumn = await this.mockKanbn.findTaskColumn(this.mockKanbn.index, completedTask.id);
    assert.equal(finalColumn, 'Done', 'Task should be in Done column');
});

QUnit.test('should maintain user context across interactions', async function(assert) {
    const chat = require('../../src/controller/chat');

    // Step 1: Initial task creation
    const result1 = await chat({ message: 'Create a task called "Feature Implementation"' });
    assert.ok(result1.includes('created'), 'Task should be created');

    // Step 2: Reference task without explicit name
    const result2 = await chat({ message: 'Add a tag "in-progress" to that task' });
    assert.ok(result2.includes('updated'), 'Task should be updated');

    // Verify tag was added to correct task
    let tasks = await this.mockKanbn.loadAllTrackedTasks();
    let featureTask = tasks.find(t => t.name?.includes('Feature Implementation'));
    assert.ok(featureTask.metadata.tags.includes('in-progress'), 'Tag should be added to correct task');

    // Step 3: Multi-step interaction
    const result3 = await chat({ message: 'Move it to In Progress and add a comment "Starting implementation"' });
    assert.ok(result3.includes('moved') || result3.includes('updated'), 'Task should be updated');

    // Verify both actions were performed
    tasks = await this.mockKanbn.loadAllTrackedTasks();
    featureTask = tasks.find(t => t.name?.includes('Feature Implementation'));
    const { findTaskColumn } = require('../../src/main');
    const column = findTaskColumn(this.mockKanbn.index, featureTask.id);
    
    assert.equal(column, 'In Progress', 'Task should be moved to In Progress');
    assert.ok(
        featureTask.comments?.some(c => c.text.includes('Starting implementation')),
        'Comment should be added'
    );

    // Step 4: Complex context-aware update
    const result4 = await chat({ message: 'Create a subtask called "Unit Tests" and link it to the feature task' });
    assert.ok(result4.includes('created'), 'Subtask should be created');

    // Verify subtask creation and relationship
    tasks = await this.mockKanbn.loadAllTrackedTasks();
    const subtask = tasks.find(t => t.name?.includes('Unit Tests'));
    assert.ok(subtask, 'Subtask should exist');
    assert.ok(
        subtask.metadata.tags?.includes('subtask') || 
        subtask.metadata.related?.includes(featureTask.id),
        'Subtask should be linked to parent task'
    );

    // Step 5: Context-aware status update
    const result5 = await chat({ message: 'What is the current status of the feature implementation?' });
    assert.ok(result5.includes('In Progress'), 'Should report correct status');
    assert.ok(result5.includes('Unit Tests'), 'Should include subtask information');
});
