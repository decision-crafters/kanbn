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

    // Use the specific DomainMockKanbn for these tests
    const sharedMockKanbnInstance = new DomainMockKanbn(eventBus);

    // Mock src/main to return the shared instance when called as a function
    mockRequire('../../src/main', () => sharedMockKanbnInstance);
    // Mock the .Kanbn property if anything requires the class directly from src/main
    mockRequire('../../src/main').Kanbn = DomainMockKanbn; // Use the specific mock class

    // Reset cache for chat controller
    delete require.cache[require.resolve('../../src/controller/chat')];

    // Mock AI Service to prevent network calls
    const mockAIServiceInstance = testHelper.createMockAIService('Mock AI response for domain test.');
    mockRequire('../../src/lib/ai-service', function() {
        return mockAIServiceInstance; // Return the instance directly
    });
    mockRequire.reRequire('../../src/lib/ai-service'); // Re-require after mocking

        // Set test environment
        process.env.KANBN_ENV = 'test';
        // OPENROUTER_API_KEY is not needed now as AIService is mocked
        // process.env.OPENROUTER_API_KEY = 'test-api-key';
    },

    after: function() {
        mockRequire.stop('../../src/main');
        mockRequire.stop('../../src/lib/ai-service'); // Stop AI service mock
    },

    beforeEach: function() {
        this.eventBus.clear();
        if (!fs.existsSync(testFolder)) {
            fs.mkdirSync(testFolder, { recursive: true });
        }
        process.chdir(testFolder);

       // Use the specific DomainMockKanbn for these tests
       const sharedMockKanbnInstance = new DomainMockKanbn(this.eventBus);

       // Mock src/main to return the shared instance
       mockRequire('../../src/main', () => sharedMockKanbnInstance);
       mockRequire('../../src/main').Kanbn = DomainMockKanbn; // Use the specific mock class

        // Mock AI Service again for beforeEach scope if needed, or rely on 'before'
        const mockAIServiceInstance = testHelper.createMockAIService('Mock AI response for domain test.');
         mockRequire('../../src/lib/ai-service', function() {
            return mockAIServiceInstance; // Return the instance directly
        });
        mockRequire.reRequire('../../src/lib/ai-service'); // Re-require after mocking

        // Reset cache for chat controller
        delete require.cache[require.resolve('../../src/controller/chat')];
    },

    afterEach: function() {
        mockRequire.stop('../../src/lib/ai-service'); // Stop AI service mock for this scope
        // Note: Stopping main mock might interfere if other tests run after this beforeEach
        // Consider if mockRequire('../../src/main', ...) needs to be stopped here too
        rimraf.sync(testFolder);
    }
});

QUnit.test('chat should emit task creation event when logging interaction', async function(assert) {
    const chat = require('../../src/controller/chat');
    
    await chat({
        message: 'Create a new task'
    });

    const events = this.eventBus.getEvents();
    const taskCreatedEvent = events.find(e => e.event === 'taskCreated');
    
    assert.ok(taskCreatedEvent, 'Task creation event was emitted');
    assert.equal(taskCreatedEvent.args[0].column, 'Backlog', 'Task created in correct column');
    assert.ok(taskCreatedEvent.args[0].taskData.metadata.tags.includes('ai-interaction'), 'Task has correct tag');
});

QUnit.test('chat should maintain context across multiple interactions', async function(assert) {
    const chat = require('../../src/controller/chat');
    
    // First interaction
    await chat({
        message: 'What tasks do we have?'
    });
    
    const firstEvents = this.eventBus.getEvents();
    assert.ok(firstEvents.some(e => e.event === 'contextQueried'), 'Context query event emitted');
    
    // Second interaction
    this.eventBus.clear();
    await chat({
        message: 'Create a new task'
    });
    
    const secondEvents = this.eventBus.getEvents();
    assert.ok(secondEvents.some(e => e.event === 'taskCreated'), 'Task creation event emitted');
    assert.ok(secondEvents.some(e => e.event === 'contextUpdated'), 'Context update event emitted');
});

QUnit.test('chat should handle task state changes', async function(assert) {
    const chat = require('../../src/controller/chat');
    
    // Simulate task state change
    this.eventBus.emit('taskMoved', {
        taskId: 'test-task',
        fromColumn: 'Backlog',
        toColumn: 'In Progress'
    });
    
    await chat({
        message: 'What is the project status?'
    });
    
    const events = this.eventBus.getEvents();
    assert.ok(events.some(e => e.event === 'contextQueried'), 'Context query event emitted');
    assert.ok(events.some(e => e.event === 'statusReported'), 'Status report event emitted');
});
