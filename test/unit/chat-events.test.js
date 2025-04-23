const QUnit = require('qunit');
const mockRequire = require('mock-require');
const eventBus = require('../../src/lib/event-bus');

// Mock dependencies
const mockKanbn = {
  initialised: async () => true,
  getIndex: async () => ({
    name: 'Test Project',
    description: 'Test Description',
    columns: { 'Backlog': [], 'In Progress': [], 'Done': [] }
  }),
  loadAllTrackedTasks: async () => [],
  status: async () => ({}),
  createTask: async () => 'mock-task-id'
};

// Mock axios for API calls
const mockAxios = {
  post: async () => ({
    data: {
      choices: [
        {
          message: {
            content: 'Mock AI response'
          }
        }
      ]
    }
  })
};

// Set a longer timeout for tests
QUnit.config.testTimeout = 5000;

QUnit.module('Chat Controller Event Tests', {
  before: function() {
    // Mock the required modules
    mockRequire('axios', mockAxios);
    mockRequire('../../src/main', mockKanbn);

    // Set environment variables for testing
    process.env.KANBN_ENV = 'test';

    // Import the chat controller after mocking dependencies
    this.chatController = require('../../src/controller/chat');
  },
  beforeEach: function() {
    // Reset event listeners before each test
    eventBus.removeAllListeners();

    // Reset global chat history
    global.chatHistory = [];
  },
  afterEach: function() {
    // Clean up event listeners after each test
    eventBus.removeAllListeners();
  },
  after: function() {
    // Clean up mocks
    mockRequire.stopAll();
    delete process.env.KANBN_ENV;
  }
});

QUnit.test('logAIInteraction should emit taskCreated event', async function(assert) {
  const done = assert.async();

  // Access the internal logAIInteraction function
  const logAIInteraction = this.chatController.__logAIInteraction;

  if (!logAIInteraction) {
    assert.ok(false, 'Could not access logAIInteraction function');
    done();
    return;
  }

  // Set up event listener
  eventBus.once('taskCreated', (data) => {
    assert.equal(data.column, 'Backlog', 'Event contains correct column');
    assert.ok(data.taskId.startsWith('ai-interaction-'), 'Event contains correct taskId format');
    assert.equal(data.source, 'chat', 'Event contains correct source');
    assert.equal(data.taskData.metadata.tags[0], 'ai-interaction', 'Task has correct tag');
    done();
  });

  // Call the function that should emit the event
  await logAIInteraction('chat', 'Test input', 'Test output');
});

QUnit.test('getProjectContext should emit contextQueried event', async function(assert) {
  const done = assert.async();

  // Access the internal getProjectContext function
  const getProjectContext = this.chatController.__getProjectContext;

  if (!getProjectContext) {
    assert.ok(false, 'Could not access getProjectContext function');
    done();
    return;
  }

  // Set up event listener
  eventBus.once('contextQueried', (data) => {
    assert.ok(data.context, 'Event contains context data');
    assert.equal(data.context.projectName, 'Test Project', 'Context has correct project name');
    assert.deepEqual(data.context.columns, ['Backlog', 'In Progress', 'Done'], 'Context has correct columns');
    done();
  });

  // Call the function that should emit the event
  await getProjectContext();
});

QUnit.test('Chat command should trigger event chain', async function(assert) {
  const done = assert.async(2); // We expect 2 async callbacks

  // Set up event listeners
  eventBus.once('contextQueried', () => {
    assert.ok(true, 'contextQueried event was emitted');
    done();
  });

  eventBus.once('taskCreated', () => {
    assert.ok(true, 'taskCreated event was emitted');
    done();
  });

  // Call the chat controller with a message
  await this.chatController({
    message: 'Test message'
  });
});

QUnit.test('Events should be emitted in the correct order', async function(assert) {
  const done = assert.async();
  const eventOrder = [];

  // Set up event listeners
  eventBus.once('contextQueried', () => {
    eventOrder.push('contextQueried');
  });

  eventBus.once('taskCreated', () => {
    eventOrder.push('taskCreated');
  });

  eventBus.once('contextUpdated', () => {
    eventOrder.push('contextUpdated');

    // Check the order after all events have been emitted
    assert.deepEqual(
      eventOrder,
      ['contextQueried', 'taskCreated', 'contextUpdated'],
      'Events were emitted in the correct order'
    );
    done();
  });

  // Call the chat controller with a message
  await this.chatController({
    message: 'Test message'
  });
});
