const QUnit = require('qunit');
const path = require('path');
const mockRequire = require('mock-require');

const testFolder = path.join(__dirname, '..', 'test-chat-board-state');

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
            description: 'Test project for board state validation',
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
        const taskId = `task-${Date.now()}`;
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
    
    async findTaskColumn(index, taskId) {
        for (const [column, tasks] of Object.entries(index.columns)) {
            if (tasks.includes(taskId)) {
                return column;
            }
        }
        return null;
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

// Board state validation helpers
const validateBoardState = {
    taskCount: (assert, kanbn, expectedCount) => {
        const totalTasks = kanbn.tasks.size;
        assert.equal(totalTasks, expectedCount, `Board should have ${expectedCount} tasks`);
    },

    columnIntegrity: (assert, kanbn) => {
        // Verify each task appears in exactly one column
        const taskIds = new Set(kanbn.tasks.keys());
        const columnTasks = new Set();
        
        Object.values(kanbn.columns).forEach(tasks => {
            tasks.forEach(taskId => {
                assert.ok(!columnTasks.has(taskId), `Task ${taskId} should not appear in multiple columns`);
                columnTasks.add(taskId);
                assert.ok(taskIds.has(taskId), `Column contains invalid task ID: ${taskId}`);
            });
        });

        assert.equal(columnTasks.size, taskIds.size, 'All tasks should be assigned to columns');
    },

    taskMetadata: (assert, task) => {
        assert.ok(task.metadata, 'Task should have metadata');
        assert.ok(Array.isArray(task.metadata.tags), 'Task should have tags array');
        assert.ok(task.metadata.created instanceof Date, 'Task should have creation date');
        assert.ok(task.metadata.updated instanceof Date, 'Task should have update date');
    },

    indexStructure: (assert, kanbn) => {
        assert.ok(kanbn.index.name, 'Index should have project name');
        assert.ok(kanbn.index.description, 'Index should have project description');
        assert.ok(kanbn.index.columns, 'Index should have columns');
        assert.equal(
            Object.keys(kanbn.index.columns).length,
            Object.keys(kanbn.columns).length,
            'Index columns should match actual columns'
        );
    }
};

QUnit.module('Chat Board State', {
    before: function() {
        this.originalEnv = { ...process.env };
        this.mockKanbn = new MockKanbn();
        
        const mockKanbn = this.mockKanbn;
        
        const mockKanbnModule = require('../mock-kanbn');
        mockRequire('../../src/main', {
            ...mockKanbnModule,
            Kanbn: function() {
                return mockKanbn;
            },
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
        
        // Update the mock for each test
        const mockKanbn = this.mockKanbn;
        
        const mockKanbnModule = require('../mock-kanbn');
        mockRequire('../../src/main', {
            ...mockKanbnModule,
            Kanbn: function() {
                return mockKanbn;
            },
            findTaskColumn: (index, taskId) => {
                for (const [column, tasks] of Object.entries(index.columns)) {
                    if (tasks.includes(taskId)) {
                        return column;
                    }
                }
                return null;
            }
        });
        
        // Clear module cache to ensure we get a fresh instance
        delete require.cache[require.resolve('../../src/controller/chat')];
    }
});

QUnit.test('should maintain valid board state when chat creates tasks', async function(assert) {
    const chat = require('../../src/controller/chat');

    // Initial state validation
    validateBoardState.taskCount(assert, this.mockKanbn, 0);
    validateBoardState.columnIntegrity(assert, this.mockKanbn);
    validateBoardState.indexStructure(assert, this.mockKanbn);

    // Simulate chat creating a task
    const result1 = await chat({ message: 'Create a new task called "Test Task"' });
    assert.ok(result1.includes('created'), 'Chat should confirm task creation');

    // Validate board state after task creation
    validateBoardState.taskCount(assert, this.mockKanbn, 1);
    validateBoardState.columnIntegrity(assert, this.mockKanbn);

    // Verify task metadata
    const tasks = await this.mockKanbn.loadAllTrackedTasks();
    const newTask = tasks.find(t => t.name?.includes('Test Task'));
    assert.ok(newTask, 'New task should exist');
    validateBoardState.taskMetadata(assert, newTask);

    // Simulate chat updating the task
    const result2 = await chat({ message: 'Move that task to In Progress' });
    assert.ok(result2.includes('moved') || result2.includes('updated'), 'Chat should confirm task update');

    // Validate board state after task update
    validateBoardState.taskCount(assert, this.mockKanbn, 1);
    validateBoardState.columnIntegrity(assert, this.mockKanbn);
    validateBoardState.indexStructure(assert, this.mockKanbn);

    // Verify column assignment
    const taskColumn = await this.mockKanbn.findTaskColumn(this.mockKanbn.index, newTask.id);
    assert.equal(taskColumn, 'In Progress', 'Task should be in correct column');
});

QUnit.test('should preserve column integrity during chat operations', async function(assert) {
    const chat = require('../../src/controller/chat');

    // Initial state validation
    validateBoardState.taskCount(assert, this.mockKanbn, 0);
    validateBoardState.columnIntegrity(assert, this.mockKanbn);

    // Create multiple tasks in different columns
    const result1 = await chat({ message: 'Create three tasks: "Task 1" in Backlog, "Task 2" in Progress, and "Task 3" in Done' });
    assert.ok(result1.includes('created'), 'Chat should confirm task creation');

    // Validate initial task creation
    validateBoardState.taskCount(assert, this.mockKanbn, 3);
    validateBoardState.columnIntegrity(assert, this.mockKanbn);

    // Verify column assignments
    const tasks = await this.mockKanbn.loadAllTrackedTasks();
    const task1 = tasks.find(t => t.name?.includes('Task 1'));
    const task2 = tasks.find(t => t.name?.includes('Task 2'));
    const task3 = tasks.find(t => t.name?.includes('Task 3'));

    assert.ok(task1 && task2 && task3, 'All tasks should exist');

    // Verify initial column assignments
    const columns = this.mockKanbn.columns;
    assert.ok(columns['Backlog'].includes(task1.id), 'Task 1 should be in Backlog');
    assert.ok(columns['In Progress'].includes(task2.id), 'Task 2 should be in Progress');
    assert.ok(columns['Done'].includes(task3.id), 'Task 3 should be in Done');

    // Move tasks between columns
    const result2 = await chat({ message: 'Move all tasks to In Progress' });
    assert.ok(result2.includes('moved') || result2.includes('updated'), 'Chat should confirm task moves');

    // Validate board state after moves
    validateBoardState.taskCount(assert, this.mockKanbn, 3);
    validateBoardState.columnIntegrity(assert, this.mockKanbn);
    validateBoardState.indexStructure(assert, this.mockKanbn);

    // Verify final column assignments
    const finalColumns = this.mockKanbn.columns;
    assert.equal(finalColumns['Backlog'].length, 0, 'Backlog should be empty');
    assert.equal(finalColumns['In Progress'].length, 3, 'All tasks should be in Progress');
    assert.equal(finalColumns['Done'].length, 0, 'Done should be empty');

    // Verify each task appears exactly once
    const inProgressTasks = new Set(finalColumns['In Progress']);
    assert.ok(inProgressTasks.has(task1.id), 'Task 1 should be in Progress');
    assert.ok(inProgressTasks.has(task2.id), 'Task 2 should be in Progress');
    assert.ok(inProgressTasks.has(task3.id), 'Task 3 should be in Progress');
});

QUnit.test('should maintain task metadata consistency', async function(assert) {
    const chat = require('../../src/controller/chat');

    // Initial state validation
    validateBoardState.taskCount(assert, this.mockKanbn, 0);
    validateBoardState.columnIntegrity(assert, this.mockKanbn);

    // Create a task with specific metadata
    const result1 = await chat({ message: 'Create a task called "Important Task" with tag "urgent"' });
    assert.ok(result1.includes('created'), 'Chat should confirm task creation');

    // Verify initial task metadata
    const tasks = await this.mockKanbn.loadAllTrackedTasks();
    const task = tasks.find(t => t.name?.includes('Important Task'));
    assert.ok(task, 'Task should exist');
    validateBoardState.taskMetadata(assert, task);
    assert.ok(task.metadata.tags.includes('urgent'), 'Task should have urgent tag');

    // Update task metadata via chat
    const result2 = await chat({ message: 'Add a comment to Important Task: "This needs review"' });
    assert.ok(result2.includes('comment') || result2.includes('updated'), 'Chat should confirm comment addition');

    // Verify updated task metadata
    const updatedTasks = await this.mockKanbn.loadAllTrackedTasks();
    const updatedTask = updatedTasks.find(t => t.name?.includes('Important Task'));
    assert.ok(updatedTask, 'Task should still exist');
    validateBoardState.taskMetadata(assert, updatedTask);

    // Verify metadata consistency
    assert.ok(updatedTask.metadata.tags.includes('urgent'), 'Task should retain urgent tag');
    assert.ok(updatedTask.comments?.some(c => c.text.includes('needs review')), 'Task should have new comment');
    assert.ok(updatedTask.metadata.updated > updatedTask.metadata.created, 'Update time should be after creation time');

    // Validate overall board state
    validateBoardState.taskCount(assert, this.mockKanbn, 1);
    validateBoardState.columnIntegrity(assert, this.mockKanbn);
    validateBoardState.indexStructure(assert, this.mockKanbn);
});
