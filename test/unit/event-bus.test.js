const QUnit = require('qunit');
const eventBus = require('../../src/lib/event-bus');
const ChatHandler = require('../../src/lib/chat-handler');
const mockKanbn = require('../mock-kanbn');

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

describe('Event Bus Communication Tests', () => {

  test('eventBus should emit and receive taskCreated event', function(assert) {
  const done = assert.async();
  const taskId = 'test-task-1';
  const column = 'Backlog';

  // Set up event listener
  eventBus.once('taskCreated', (data) => {
    expect(data.taskId).toEqual(taskId);
    expect(data.column).toEqual(column);
    expect(data.taskData).toEqual(mockTaskData);
    expect(data.source).toEqual('test');
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

  test('eventBus should emit and receive contextQueried event', function(assert) {
  const done = assert.async();
  const mockContext = {
    projectName: 'Test Project',
    columns: ['Backlog', 'In Progress', 'Done'],
    taskCount: 5
  };

  // Set up event listener
  eventBus.once('contextQueried', (data) => {
    expect(data.context).toEqual(mockContext);
    done();
  });

  // Emit the event
  eventBus.emit('contextQueried', { context: mockContext });
});

  test('eventBus should emit and receive contextUpdated event', function(assert) {
  const done = assert.async();
  const taskId = 'test-task-1';

  // Set up event listener
  eventBus.once('contextUpdated', (data) => {
    expect(data.taskId).toEqual(taskId);
    expect(data.type).toEqual('chat');
    done();
  });

  // Emit the event
  eventBus.emit('contextUpdated', { taskId, type: 'chat' });
});

  test('eventBus should emit and receive taskCreationFailed event', function(assert) {
  const done = assert.async();
  const errorMessage = 'Failed to create task';

  // Set up event listener
  eventBus.once('taskCreationFailed', (data) => {
    expect(data.error).toEqual(errorMessage);
    done();
  });

  // Emit the event
  eventBus.emit('taskCreationFailed', { error: errorMessage });
});

  test('Multiple events should be handled correctly', function(assert) {
  const done = assert.async(2); // We expect 2 async callbacks

  // Set up event listeners
  eventBus.once('taskCreated', (data) => {
    expect(data.taskId).toEqual('test-task-1');
    done();
  });

  eventBus.once('contextUpdated', (data) => {
    expect(data.taskId).toEqual('test-task-1');
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

  test('ChatHandler should emit events when creating a task', function(assert) {
  const done = assert.async();
  const taskName = 'New Test Task';

  // Mock the createTask method to return a predictable taskId
  this.kanbn.createTask = async () => 'new-test-task';

  // Set up event listener
  eventBus.once('taskCreated', (data) => {
    expect(data.taskId).toEqual('new-test-task');
    expect(data.column).toEqual('Backlog');
    expect(data.taskData.name).toEqual(taskName);
    expect(data.source).toEqual('chat');
    done();
  });

  // Call the method that should emit the event
  this.chatHandler.handleCreateTask([null, null, null, taskName]);
});

  test('Events should trigger expected side effects', function(assert) {
  const done = assert.async();
  let sideEffectTriggered = false;

  // Set up a function that will be triggered by an event
  function handleTaskCreation(data) {
    sideEffectTriggered = true;
    expect(data.taskId).toEqual('side-effect-task');
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

});\