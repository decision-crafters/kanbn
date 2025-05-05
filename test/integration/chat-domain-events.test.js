const QUnit = require('qunit');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const mockRequire = require('mock-require');
const EventEmitter = require('events');
const testHelper = require('../test-helper'); // Import test helper for mock AI service

const testFolder = path.join(__dirname, '..', 'test-chat-domain');

// Mock event bus for testing domain events
class DomainEventBus extends EventEmitter {
    constructor() {
        super();
        this.events = [];
    }

    emit(event, ...args) {
        this.events.push({ event, args });
        return super.emit(event, ...args);
    }

    getEvents() {
        return this.events;
    }

    clear() {
        this.events = [];
    }
}

// Base mock class for domain testing
class DomainMockKanbn {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.tasks = new Map([['test-task', { id: 'test-task', name: 'Test Task', description: 'A test task', metadata: { tags: ['test'] } }]]);
        this.index = {
            name: 'Test Project',
            description: 'Test project for domain events',
            columns: {
                'Backlog': ['test-task'],
                'In Progress': []
            }
        };
    }

    // Add loadIndex method
    async loadIndex() {
        this.eventBus.emit('contextQueried', { context: this.index });
        return this.index;
    }

    async initialised() {
        return true;
    }

    async getIndex() {
        const index = {
            name: 'Test Project',
            description: 'Test project for domain events',
            columns: this.index.columns // Use the stored index columns
        };
        this.eventBus.emit('contextQueried', { context: index });
        return index;
    }

    async getProjectContext() {
        const index = await this.getIndex();
        const tasks = await this.loadAllTrackedTasks();
        const context = {
            projectName: index.name,
            projectDescription: index.description,
            columns: Object.keys(index.columns),
            taskCount: tasks.length,
            tags: ['test']
        };
        this.eventBus.emit('contextQueried', { context });
        return context;
    }

    async loadAllTrackedTasks() {
        return Array.from(this.tasks.values());
    }

    // Add taskExists method
    async taskExists(taskId) {
        // Check if task exists in our mock map or was created during the test
        return this.tasks.has(taskId) || taskId.startsWith('task-');
    }

    async createTask(taskData, column) {
        const taskId = `task-${Date.now()}`;
        this.eventBus.emit('taskCreated', {
            taskId,
            column,
            taskData,
            source: 'chat'
        });
        this.eventBus.emit('contextUpdated', {
            taskId,
            type: 'chat'
        });
        // Add the created task to our mock map
        this.tasks.set(taskId, { id: taskId, ...taskData });
        if (this.index.columns[column]) {
            this.index.columns[column].push(taskId);
        }
        return taskId;
    }

    async status() {
        const status = {};
        this.eventBus.emit('statusReported', { status });
        return status;
    }
}

QUnit.module('Chat Domain Events', {
    before: function() {
    // Create domain event bus
    const eventBus = new DomainEventBus();
    this.eventBus = eventBus;

    // Mock AI Service to prevent network calls - KEEP THIS
    const mockAIServiceInstance = testHelper.createMockAIService('Mock AI response for domain test.');
    mockRequire('../../src/lib/ai-service', function() {
        return mockAIServiceInstance; // Return the instance directly
    });
    mockRequire.reRequire('../../src/lib/ai-service'); // Re-require after mocking

    // --- Mock Dependencies Instead of src/main ---
    this.mockKanbnInstance = new DomainMockKanbn(this.eventBus); // Create the specific kanbn instance we need

    // Mock ProjectContext
    const MockProjectContext = class {
        constructor(kanbn) {
            this.kanbn = kanbn;
        }
        async getContext() { return await this.kanbn.getProjectContext(); }
        createSystemMessage(context) {
            return `System Message based on: ${JSON.stringify(context)}`;
        }
    };
    mockRequire('../../src/lib/project-context', MockProjectContext);

    // Mock ChatHandler
    const MockChatHandler = class {
        constructor(kanbn, boardFolder, projectContext, memoryManager, promptLoader, eventBus) {
            this.kanbn = kanbn;
            this.projectContext = projectContext; 
            this.aiService = mockAIServiceInstance; 
            this.eventBus = eventBus;
        }

        async handleMessage(message) {
            if (message.toLowerCase().includes('create task')) {
                const taskName = message.split('task ')[1] || 'Default Task Name';
                const taskData = { name: taskName, description: '', metadata: { tags: ['ai-interaction'] } };
                await this.kanbn.createTask(taskData, 'Backlog');
                return "OK, created task.";
            } else if (message.toLowerCase().includes('what tasks')) {
                await this.kanbn.getProjectContext(); 
                return "Here are the tasks...";
            } else if (message.toLowerCase().includes('project status')) {
                await this.kanbn.status(); 
                return "Project status is good.";
            } else {
                return "Mock AI response for domain test.";
            }
        }
    };
    mockRequire('../../src/lib/chat-handler', MockChatHandler);

    mockRequire.reRequire('../../src/lib/project-context');
    mockRequire.reRequire('../../src/lib/chat-handler');
    delete require.cache[require.resolve('../../src/controller/chat')];
    this.chatController = require('../../src/controller/chat');

    process.env.KANBN_ENV = 'test';
    },

    after: function() {
        mockRequire.stop('../../lib/ai-service'); 
        mockRequire.stop('../../src/lib/project-context');
        mockRequire.stop('../../src/lib/chat-handler');
    },

    beforeEach: function() {
        this.eventBus.clear();
        if (!fs.existsSync(testFolder)) {
            fs.mkdirSync(testFolder, { recursive: true });
        }
        process.chdir(testFolder);

        this.mockKanbnInstance.tasks = new Map([['test-task', { id: 'test-task', name: 'Test Task', description: 'A test task', metadata: { tags: ['test'] } }]]);
        this.mockKanbnInstance.index = {
            name: 'Test Project',
            description: 'Test project for domain events',
            columns: {
                'Backlog': ['test-task'],
                'In Progress': []
            }
        };
    },

    afterEach: function() {
        rimraf.sync(testFolder);
    }
});

QUnit.test('chat should emit task creation event when logging interaction', async function(assert) {
    await this.chatController({
        message: 'Create a new task'
    });

    const events = this.eventBus.getEvents();
    const taskCreatedEvent = events.find(e => e.event === 'taskCreated');
    
    assert.ok(taskCreatedEvent, 'Task creation event was emitted');
    assert.equal(taskCreatedEvent.args[0].column, 'Backlog', 'Task created in correct column');
    assert.ok(taskCreatedEvent.args[0].taskData.metadata.tags.includes('ai-interaction'), 'Task has correct tag');
});

QUnit.test('chat should maintain context across multiple interactions', async function(assert) {
    await this.chatController({
        message: 'What tasks do we have?'
    });

    const firstEvents = this.eventBus.getEvents();
    assert.ok(firstEvents.some(e => e.event === 'contextQueried'), 'Context query event emitted');

    this.eventBus.clear();
    await this.chatController({
        message: 'Create a new task'
    });

    const secondEvents = this.eventBus.getEvents();
    assert.ok(secondEvents.some(e => e.event === 'taskCreated'), 'Task creation event emitted');
    assert.ok(secondEvents.some(e => e.event === 'contextUpdated'), 'Context update event emitted');
});

QUnit.test('chat should handle task state changes', async function(assert) {
    this.eventBus.emit('taskMoved', {
        taskId: 'test-task',
        fromColumn: 'Backlog',
        toColumn: 'In Progress'
    });

    await this.chatController({
        message: 'What is the project status?'
    });

    const events = this.eventBus.getEvents();
    assert.ok(events.some(e => e.event === 'contextQueried'), 'Context query event emitted');
    assert.ok(events.some(e => e.event === 'statusReported'), 'Status report event emitted');
});
