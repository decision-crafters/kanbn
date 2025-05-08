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

describe('Chat Controller Event Tests', () => {

  test('logAIInteraction should emit taskCreated event', async function(assert) {
  const done = assert.async();

  // Access the internal logAIInteraction function
  const logAIInteraction = this.chatController.__logAIInteraction;

  if (!logAIInteraction) {
    expect(false).toBeTruthy();
    done();
    return;
  }

  // Set up event listener
  eventBus.once('taskCreated', (data) => {
    expect(data.column).toEqual('Backlog');
    expect(data.taskId.startsWith('ai-interaction-').toBeTruthy(), 'Event contains correct taskId format');
    expect(data.source).toEqual('chat');
    expect(data.taskData.metadata.tags[0]).toEqual('ai-interaction');
    done();
  });

  // Call the function that should emit the event
  await logAIInteraction('chat', 'Test input', 'Test output');
});

  test('getProjectContext should emit contextQueried event', async function(assert) {
  const done = assert.async();

  // Access the internal getProjectContext function
  const getProjectContext = this.chatController.__getProjectContext;

  if (!getProjectContext) {
    expect(false).toBeTruthy();
    done();
    return;
  }

  // Set up event listener
  eventBus.once('contextQueried', (data) => {
    expect(data.context).toBeTruthy();
    expect(data.context.projectName).toEqual('Test Project');
    assert.deepEqual(data.context.columns, ['Backlog', 'In Progress', 'Done'], 'Context has correct columns');
    done();
  });

  // Call the function that should emit the event
  await getProjectContext();
});

  test('Chat command should trigger event chain', async function(assert) {
  const done = assert.async(2); // We expect 2 async callbacks

  // Set up event listeners
  eventBus.once('contextQueried', () => {
    expect(true).toBeTruthy();
    done();
  });

  eventBus.once('taskCreated', () => {
    expect(true).toBeTruthy();
    done();
  });

  // Call the chat controller with a message
  await this.chatController({
    message: 'Test message'
  });
});

  test('Events should be emitted in the correct order', async function(assert) {
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

});\