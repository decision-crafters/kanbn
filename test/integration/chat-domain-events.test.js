const QUnit = require('qunit');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const mockRequire = require('mock-require');
const EventEmitter = require('events');

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
    }

    async initialised() {
        return true;
    }

    async getIndex() {
        const index = {
            name: 'Test Project',
            description: 'Test project for domain events',
            columns: {
                'Backlog': ['test-task'],
                'In Progress': []
            }
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
        return [{
            id: 'test-task',
            name: 'Test Task',
            description: 'A test task',
            metadata: { tags: ['test'] }
        }];
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
    
    // Set up mocks
    const MockKanbnWithEvents = class extends DomainMockKanbn {
      constructor() {
        super(eventBus);
      }
    };

    // Create a function that returns our mock instance
    const mockKanbnFunction = function() {
      return new MockKanbnWithEvents(eventBus);
    };
    
   mockKanbnFunction.Kanbn = MockKanbnWithEvents; // Ensure the class is exported correctly

   // Add other necessary mock methods directly to the function object if needed elsewhere
   mockKanbnFunction.findTaskColumn = async () => 'Backlog'; // Make async if needed
   mockKanbnFunction.getProjectContext = async () => {
     const kanbn = new MockKanbnWithEvents(eventBus);
     return await kanbn.getProjectContext(); // Ensure await is used
   };
   mockKanbnFunction.loadIndex = async () => { // Add missing mock methods
       const kanbn = new MockKanbnWithEvents(eventBus);
       return await kanbn.loadIndex();
   };
    mockKanbnFunction.taskExists = async (taskId) => {
       const kanbn = new MockKanbnWithEvents(eventBus);
       return await kanbn.taskExists(taskId);
   };
    mockKanbnFunction.createTask = async (taskData, column) => {
       const kanbn = new MockKanbnWithEvents(eventBus);
       return await kanbn.createTask(taskData, column);
   };


   mockRequire('../../src/main', mockKanbnFunction);

    // Reset cache for chat controller
    delete require.cache[require.resolve('../../src/controller/chat')];

        // Set test environment
        process.env.KANBN_ENV = 'test';
        process.env.OPENROUTER_API_KEY = 'test-api-key';
    },

    after: function() {
        mockRequire.stop('../../src/main');
    },

    beforeEach: function() {
        this.eventBus.clear();
        if (!fs.existsSync(testFolder)) {
            fs.mkdirSync(testFolder, { recursive: true });
        }
        process.chdir(testFolder);
        
        const eventBus = this.eventBus;
        
        // Set up mocks
        const MockKanbnWithEvents = class extends DomainMockKanbn {
          constructor() {
            super(eventBus);
          }
        };

        // Create a function that returns our mock instance
        const mockKanbnFunction = function() {
          return new MockKanbnWithEvents(eventBus);
        };

        // Create a function that returns our mock instance
        const mockKanbnFunction = function() {
          return new MockKanbnWithEvents(eventBus);
        };

        mockKanbnFunction.Kanbn = MockKanbnWithEvents; // Ensure the class is exported correctly

        // Add other necessary mock methods directly to the function object
        mockKanbnFunction.findTaskColumn = async () => 'Backlog'; // Make async
        mockKanbnFunction.getProjectContext = async () => {
          const kanbn = new MockKanbnWithEvents(eventBus);
          return await kanbn.getProjectContext(); // Ensure await
        };
        mockKanbnFunction.loadIndex = async () => { // Add missing mock methods
            const kanbn = new MockKanbnWithEvents(eventBus);
            return await kanbn.loadIndex();
        };
         mockKanbnFunction.taskExists = async (taskId) => {
            const kanbn = new MockKanbnWithEvents(eventBus);
            return await kanbn.taskExists(taskId);
        };
         mockKanbnFunction.createTask = async (taskData, column) => {
            const kanbn = new MockKanbnWithEvents(eventBus);
            return await kanbn.createTask(taskData, column);
        };

        mockRequire('../../src/main', mockKanbnFunction);
        // Reset cache for chat controller
        delete require.cache[require.resolve('../../src/controller/chat')];
    },

    afterEach: function() {
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
