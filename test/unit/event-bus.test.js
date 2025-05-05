const QUnit = require('qunit');
const eventBus = require('../../src/lib/event-bus');
const ChatHandler = require('../../src/lib/chat-handler');

// Mock task data for testing
const mockTaskData = {
  name: 'Test Task',
  description: 'This is a test task',
  metadata: {
    created: new Date(),
    tags: ['test']
  }
};

// Set a longer timeout for tests
QUnit.config.testTimeout = 5000;

QUnit.module('Event Bus Communication Tests', {
  beforeEach: function() {
    // Reset event listeners before each test
    eventBus.removeAllListeners();

    // Create a mock Kanbn instance with all required methods
    this.kanbn = {
      initialised: async () => true, // Add the missing initialised method
      getIndex: async () => ({ // Add mock index data
        name: 'Test Project',
        description: 'Test project for event testing',
        columns: {
          'Backlog': ['test-task-id'],
          'In Progress': [],
          'Done': []
        }
      }),
      createTask: async () => 'test-task-id',
      getTask: async () => ({ name: 'Test Task', metadata: {} }),
      updateTask: async () => true,
      findTaskColumn: async () => 'Backlog',
      moveTask: async () => true
    };

    // Create a chat handler instance with the mock Kanbn
    this.chatHandler = new ChatHandler(this.kanbn);
  },
  afterEach: function() {
    // Clean up event listeners after each test
    eventBus.removeAllListeners();
  }
});

QUnit.test('eventBus should emit and receive taskCreated event', function(assert) {
  const done = assert.async();
  const taskId = 'test-task-1';
  const column = 'Backlog';

  // Set up event listener
  eventBus.once('taskCreated', (data) => {
    assert.equal(data.taskId, taskId, 'Event contains correct taskId');
    assert.equal(data.column, column, 'Event contains correct column');
    assert.deepEqual(data.taskData, mockTaskData, 'Event contains correct task data');
    assert.equal(data.source, 'test', 'Event contains correct source');
    done();
  });

  // Emit the event
  eventBus.emit('taskCreated', {
    taskId,
    column,
    taskData: mockTaskData,
    source: 'test'
  });
});

QUnit.test('eventBus should emit and receive contextQueried event', function(assert) {
  const done = assert.async();
  const mockContext = {
    projectName: 'Test Project',
    columns: ['Backlog', 'In Progress', 'Done'],
    taskCount: 5
  };

  // Set up event listener
  eventBus.once('contextQueried', (data) => {
    assert.deepEqual(data.context, mockContext, 'Event contains correct context data');
    done();
  });

  // Emit the event
  eventBus.emit('contextQueried', { context: mockContext });
});

QUnit.test('eventBus should emit and receive contextUpdated event', function(assert) {
  const done = assert.async();
  const taskId = 'test-task-1';

  // Set up event listener
  eventBus.once('contextUpdated', (data) => {
    assert.equal(data.taskId, taskId, 'Event contains correct taskId');
    assert.equal(data.type, 'chat', 'Event contains correct type');
    done();
  });

  // Emit the event
  eventBus.emit('contextUpdated', { taskId, type: 'chat' });
});

QUnit.test('eventBus should emit and receive taskCreationFailed event', function(assert) {
  const done = assert.async();
  const errorMessage = 'Failed to create task';

  // Set up event listener
  eventBus.once('taskCreationFailed', (data) => {
    assert.equal(data.error, errorMessage, 'Event contains correct error message');
    done();
  });

  // Emit the event
  eventBus.emit('taskCreationFailed', { error: errorMessage });
});

QUnit.test('Multiple events should be handled correctly', function(assert) {
  const done = assert.async(2); // We expect 2 async callbacks

  // Set up event listeners
  eventBus.once('taskCreated', (data) => {
    assert.equal(data.taskId, 'test-task-1', 'taskCreated event received with correct data');
    done();
  });

  eventBus.once('contextUpdated', (data) => {
    assert.equal(data.taskId, 'test-task-1', 'contextUpdated event received with correct data');
    done();
  });

  // Emit the events
  eventBus.emit('taskCreated', {
    taskId: 'test-task-1',
    column: 'Backlog',
    taskData: mockTaskData,
    source: 'test'
  });

  eventBus.emit('contextUpdated', {
    taskId: 'test-task-1',
    type: 'chat'
  });
});

QUnit.test('ChatHandler should emit events when creating a task', function(assert) {
  const done = assert.async();
  const taskName = 'New Test Task';

  // Mock the createTask method to return a predictable taskId
  this.kanbn.createTask = async () => 'new-test-task';

  // Set up event listener
  eventBus.once('taskCreated', (data) => {
    assert.equal(data.taskId, 'new-test-task', 'taskCreated event emitted with correct taskId');
    assert.equal(data.column, 'Backlog', 'taskCreated event emitted with correct column');
    assert.equal(data.taskData.name, taskName, 'taskCreated event emitted with correct task name');
    assert.equal(data.source, 'chat', 'taskCreated event emitted with correct source');
    done();
  });

  // Call the method that should emit the event
  this.chatHandler.handleCreateTask([null, null, null, taskName]);
});

QUnit.test('Events should trigger expected side effects', function(assert) {
  const done = assert.async();
  let sideEffectTriggered = false;

  // Set up a function that will be triggered by an event
  function handleTaskCreation(data) {
    sideEffectTriggered = true;
    assert.equal(data.taskId, 'side-effect-task', 'Side effect function received correct data');
    done();
  }

  // Register the event handler
  eventBus.once('taskCreated', handleTaskCreation);

  // Emit the event
  eventBus.emit('taskCreated', {
    taskId: 'side-effect-task',
    column: 'Backlog',
    taskData: mockTaskData,
    source: 'test'
  });

  // Verify the side effect was triggered
  assert.true(sideEffectTriggered, 'Side effect was triggered by the event');
});
