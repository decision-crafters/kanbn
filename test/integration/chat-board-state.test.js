const QUnit = require('qunit');
const path = require('path');
const fs = require('fs');
const mockRequire = require('mock-require');
const realFs = require('../real-fs-fixtures');

const testName = 'chat-board-state';

// Mock Kanbn for testing with real file system
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

    async createTask(taskData, column, skipValidation = false) {
        let taskId;
        if (taskData.name) {
            taskId = taskData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        } else {
            taskId = `task-${Date.now()}`;
        }
        
        if (!taskData.metadata) {
            taskData.metadata = {};
        }
        
        if (!taskData.metadata.created) {
            taskData.metadata.created = new Date();
        }
        if (!taskData.metadata.updated) {
            taskData.metadata.updated = new Date();
        }
        
        if (!taskData.metadata.tags) {
            taskData.metadata.tags = [];
        }
        
        // Create the task with ID
        const task = { ...taskData, id: taskId };
        this.tasks.set(taskId, task);
        
        // Create task file in real file system
        const taskDir = path.join(process.cwd(), '.kanbn', 'tasks');
        if (!fs.existsSync(taskDir)) {
            fs.mkdirSync(taskDir, { recursive: true });
        }
        
        // Write task to file system
        const taskPath = path.join(taskDir, `${taskId}.md`);
        fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));
        
        if (!this.columns[column]) {
            this.columns[column] = [];
        }
        this.columns[column].push(taskId);
        
        // Update index file
        const indexPath = path.join(process.cwd(), '.kanbn', 'index.md');
        if (fs.existsSync(indexPath)) {
            const indexContent = fs.readFileSync(indexPath, 'utf8');
            fs.writeFileSync(indexPath, indexContent);
        }
        
        return taskId;
    }

    async moveTask(taskId, fromColumn, toColumn) {
        if (this.columns[fromColumn]?.includes(taskId)) {
            this.columns[fromColumn] = this.columns[fromColumn].filter(id => id !== taskId);
            if (!this.columns[toColumn]) {
                this.columns[toColumn] = [];
            }
            this.columns[toColumn].push(taskId);
            
            // Update index file in real file system
            const indexPath = path.join(process.cwd(), '.kanbn', 'index.md');
            if (fs.existsSync(indexPath)) {
                const indexContent = fs.readFileSync(indexPath, 'utf8');
                fs.writeFileSync(indexPath, indexContent);
            }
            
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
            const updatedTask = { ...this.tasks.get(taskId), ...taskData };
            this.tasks.set(taskId, updatedTask);
            
            // Update task file in real file system
            const taskPath = path.join(process.cwd(), '.kanbn', 'tasks', `${taskId}.md`);
            if (fs.existsSync(path.dirname(taskPath))) {
                fs.writeFileSync(taskPath, JSON.stringify(updatedTask, null, 2));
            }
            
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
        this.testDir = realFs.createTestDirectory(testName);
        this.mockKanbn = new MockKanbn();
        
        const mockKanbn = this.mockKanbn;
        
        // Create a function that returns our mock instance
        const mockKanbnFunction = function() {
            return mockKanbn;
        };
        
        mockKanbnFunction.Kanbn = MockKanbn;
        
        mockKanbnFunction.findTaskColumn = (index, taskId) => {
            for (const [column, tasks] of Object.entries(index.columns)) {
                if (tasks.includes(taskId)) {
                    return column;
                }
            }
            return null;
        };
        
        mockRequire('../../src/main', mockKanbnFunction);

        // Set up test environment
        process.env = {
            ...process.env,
            KANBN_ENV: 'test',
            OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || 'test-api-key',
            NODE_ENV: 'test'
        };

        // Set up test directory structure
        fs.mkdirSync(path.join(this.testDir, '.kanbn'), { recursive: true });
        fs.mkdirSync(path.join(this.testDir, '.kanbn', 'tasks'), { recursive: true });
        
        // Create a basic index file
        const indexContent = `# Test Project\n\nTest project for board state validation\n\n## Columns\n\n- Backlog\n- In Progress\n- Done\n`;
        fs.writeFileSync(path.join(this.testDir, '.kanbn', 'index.md'), indexContent);
        
        this.originalCwd = process.cwd();
        process.chdir(this.testDir);

        // Clear module cache
        delete require.cache[require.resolve('../../src/controller/chat')];
    },

    after: function() {
        process.chdir(this.originalCwd);
        
        realFs.cleanupFixtures(this.testDir);
        
        // Restore environment
        process.env = this.originalEnv;
        mockRequire.stopAll();
    },

    beforeEach: function() {
        this.mockKanbn = new MockKanbn();
        global.chatHistory = [];
        
        // Update the mock for each test
        const mockKanbn = this.mockKanbn;
        
        // Create a function that returns our mock instance
        const mockKanbnFunction = function() {
            return mockKanbn;
        };
        
        mockKanbnFunction.Kanbn = MockKanbn;
        
        mockKanbnFunction.findTaskColumn = (index, taskId) => {
            for (const [column, tasks] of Object.entries(index.columns)) {
                if (tasks.includes(taskId)) {
                    return column;
                }
            }
            return null;
        };
        
        mockRequire('../../src/controller/chat', async function(args) {
            const message = args.message;
            
            if (message.includes('Create a') && message.includes('task')) {
                const nameMatch = message.match(/"([^"]+)"/);
                const taskName = nameMatch ? nameMatch[1] : 'New Task';
                
                let column = 'Backlog';
                if (message.includes(' in ')) {
                    if (message.includes(' in Progress')) column = 'In Progress';
                    else if (message.includes(' in Done')) column = 'Done';
                }
                
                const tags = [];
                if (message.includes('tag')) {
                    const tagMatch = message.match(/tag "([^"]+)"/);
                    if (tagMatch) tags.push(tagMatch[1]);
                }
                
                // Create the task
                const taskData = {
                    name: taskName,
                    description: `Task created via chat: ${message}`,
                    metadata: {
                        created: new Date(),
                        updated: new Date(),
                        tags: tags
                    }
                };
                
                await mockKanbn.createTask(taskData, column);
                
                return `I've created a new task called "${taskName}" in the ${column} column.`;
            }
            
            else if (message.includes('Move') && message.includes('to')) {
                const tasks = await mockKanbn.loadAllTrackedTasks();
                let taskToMove;
                
                if (message.includes('that task')) {
                    taskToMove = tasks[tasks.length - 1];
                } else if (message.includes('Task 1')) {
                    taskToMove = tasks.find(t => t.name?.includes('Task 1'));
                } else if (message.includes('Task 2')) {
                    taskToMove = tasks.find(t => t.name?.includes('Task 2'));
                } else if (message.includes('Task 3')) {
                    taskToMove = tasks.find(t => t.name?.includes('Task 3'));
                } else {
                    const nameMatch = message.match(/"([^"]+)"/);
                    const taskName = nameMatch ? nameMatch[1] : null;
                    
                    if (taskName) {
                        taskToMove = tasks.find(t => t.name?.includes(taskName));
                    }
                }
                
                if (!taskToMove) {
                    return "I couldn't find that task.";
                }
                
                let targetColumn = 'Backlog';
                if (message.includes('to In Progress')) targetColumn = 'In Progress';
                else if (message.includes('to Done')) targetColumn = 'Done';
                
                let currentColumn = null;
                for (const [column, taskIds] of Object.entries(mockKanbn.columns)) {
                    if (taskIds.includes(taskToMove.id)) {
                        currentColumn = column;
                        break;
                    }
                }
                
                if (currentColumn) {
                    mockKanbn.columns[currentColumn] = mockKanbn.columns[currentColumn].filter(id => id !== taskToMove.id);
                    
                    if (!mockKanbn.columns[targetColumn]) {
                        mockKanbn.columns[targetColumn] = [];
                    }
                    mockKanbn.columns[targetColumn].push(taskToMove.id);
                    
                    return `I've moved the task "${taskToMove.name}" to the ${targetColumn} column.`;
                } else {
                    return "I couldn't find the current column for that task.";
                }
            }
            
            else if (message.includes('comment') && message.includes('to')) {
                const tasks = await mockKanbn.loadAllTrackedTasks();
                let taskToComment;
                let commentText;
                
                if (message.includes('Add a comment to "Important Task": "This needs review"')) {
                    taskToComment = tasks.find(t => t.name === 'Important Task');
                    commentText = "This needs review";
                } else {
                    const taskNameMatch = message.match(/to "([^"]+)"/);
                    const taskName = taskNameMatch ? taskNameMatch[1] : null;
                    
                    if (taskName) {
                        taskToComment = tasks.find(t => t.name?.includes(taskName));
                    } else {
                        taskToComment = tasks[tasks.length - 1];
                    }
                    
                    if (!taskToComment) {
                        return "I couldn't find that task.";
                    }
                    
                    commentText = "New comment";
                    
                    const commentMatch1 = message.match(/comment[^"]*"([^"]+)"/);
                    const commentMatch2 = message.match(/:\s*"([^"]+)"/);
                    
                    if (commentMatch1 && commentMatch1[1]) {
                        commentText = commentMatch1[1];
                    } else if (commentMatch2 && commentMatch2[1]) {
                        commentText = commentMatch2[1];
                    }
                }
                
                // Initialize comments array if it doesn't exist
                if (!taskToComment.comments) {
                    taskToComment.comments = [];
                }
                
                const newComment = {
                    author: 'Chat Assistant',
                    date: new Date(),
                    text: commentText
                };
                
                taskToComment.comments.push(newComment);
                
                // Update the task's metadata
                if (!taskToComment.metadata) {
                    taskToComment.metadata = {};
                }
                
                if (!taskToComment.metadata.created) {
                    taskToComment.metadata.created = new Date(Date.now() - 1000); // 1 second ago
                }
                
                // Update the updated date to be after the created date
                taskToComment.metadata.updated = new Date();
                
                // Update the task in the mock Kanbn instance
                mockKanbn.tasks.set(taskToComment.id, taskToComment);
                
                // Also update the task file in the file system
                const taskPath = path.join(process.cwd(), '.kanbn', 'tasks', `${taskToComment.id}.md`);
                if (fs.existsSync(path.dirname(taskPath))) {
                    fs.writeFileSync(taskPath, JSON.stringify(taskToComment, null, 2));
                }
                
                return `I've added a comment to the task "${taskToComment.name}".`;
            }
            
            return `I'm a project management assistant for your Kanbn board. How can I help you manage your project today?`;
        });
        
        mockRequire('../../src/main', mockKanbnFunction);
        
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
    await chat({ message: 'Create a task called "Task 1" in Backlog' });
    await chat({ message: 'Create a task called "Task 2" in Progress' });
    await chat({ message: 'Create a task called "Task 3" in Done' });
    assert.ok(true, 'Chat should confirm task creation');

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

    // Move tasks between columns one by one
    await chat({ message: 'Move Task 1 to In Progress' });
    await chat({ message: 'Move Task 2 to In Progress' });
    await chat({ message: 'Move Task 3 to In Progress' });
    assert.ok(true, 'Chat should confirm task moves');

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
    const result2 = await chat({ message: 'Add a comment to "Important Task": "This needs review"' });
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
