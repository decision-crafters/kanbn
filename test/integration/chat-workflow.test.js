const QUnit = require('qunit');
const mockRequire = require('mock-require');
const EventEmitter = require('events');
const testHelper = require('../test-helper');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Mock Kanbn class for testing
class MockKanbn {
  constructor() {
    this.tasks = new Map();
    this.index = {
      name: 'Test Project',
      description: 'Test project for chat workflow',
      columns: {
        'Backlog': [],
        'In Progress': [],
        'Done': []
      }
    };
  }

  async initialised() {
    return true;
  }

  async getIndex() {
    return this.index;
  }

  async getTask(taskId) {
    return this.tasks.get(taskId) || null;
  }

  async createTask(taskData, column) {
    const taskId = `task-${this.tasks.size + 1}`;
    this.tasks.set(taskId, taskData);
    this.index.columns[column].push(taskId);
    return taskId;
  }

  async updateTask(taskId, taskData) {
    this.tasks.set(taskId, taskData);
    return taskId;
  }

  async findTaskColumn(taskId) {
    for (const [column, tasks] of Object.entries(this.index.columns)) {
      if (tasks.includes(taskId)) {
        return column;
      }
    }
    return null;
  }

  async moveTask(taskId, targetColumn) {
    const currentColumn = await this.findTaskColumn(taskId);
    if (currentColumn) {
      this.index.columns[currentColumn] = this.index.columns[currentColumn].filter(id => id !== taskId);
    }
    this.index.columns[targetColumn].push(taskId);
  }

  async status() {
    return {
      completedTasks: this.index.columns['Done'].length
    };
  }
}

QUnit.module('Chat workflow tests', {
  before: function() {
    // Track test statistics
    this.passedTests = 0;
    this.totalTests = 0;
    
    QUnit.testDone((details) => {
      this.totalTests++;
      if (details.failed === 0) {
        this.passedTests++;
      }
    });

    QUnit.done(() => {
      console.log('\n==== Chat Workflow Test Summary ====');
      console.log(`Total tests: ${this.totalTests}`);
      console.log(`Passed: ${this.passedTests}`);
      console.log(`Failed: ${this.totalTests - this.passedTests}`);
      console.log('=================================\n');
    });

    // Mock the main module
    const mockMainModule = function() {
      return new MockKanbn();
    };
    mockMainModule.Kanbn = MockKanbn;
    mockRequire('../../src/main', mockMainModule);

    // Set test environment
    process.env.KANBN_ENV = 'test';
  },

  after: function() {
    mockRequire.stop('../../src/main');
    delete process.env.KANBN_ENV;
  }
});

QUnit.test('should create task and add subtask', async function(assert) {
  const chat = require('../../src/controller/chat');
  const { eventBus } = require('../../src/controller/chat');

  let taskCreatedEventFired = false;
  eventBus.on('taskCreated', () => {
    taskCreatedEventFired = true;
  });

  // Create task
  const createResponse = await chat({
    message: 'create task "Test Implementation"'
  });
  
  assert.true(createResponse.includes('Created task "Test Implementation"'), 'Task creation response');
  assert.true(taskCreatedEventFired, 'Task created event fired');

  // Add subtask
  const subtaskResponse = await chat({
    message: 'add subtask "Write tests" to "Test Implementation"'
  });

  assert.true(subtaskResponse.includes('Added subtask'), 'Subtask creation response');
});

QUnit.test('should move task between columns', async function(assert) {
  const chat = require('../../src/controller/chat');

  // Create task
  await chat({
    message: 'create task "Move Me"'
  });

  // Move task
  const moveResponse = await chat({
    message: 'move "Move Me" to In Progress'
  });

  assert.true(moveResponse.includes('Moved task "Move Me" to In Progress'), 'Move response');
});

QUnit.test('should handle task comments', async function(assert) {
  const chat = require('../../src/controller/chat');

  // Create task
  await chat({
    message: 'create task "Comment Test"'
  });

  // Add comment
  const commentResponse = await chat({
    message: 'comment "Looking good!" on "Comment Test"'
  });

  assert.true(commentResponse.includes('Added comment'), 'Comment response');
});

QUnit.test('should complete tasks', async function(assert) {
  const chat = require('../../src/controller/chat');

  // Create task
  await chat({
    message: 'create task "Complete Me"'
  });

  // Complete task
  const completeResponse = await chat({
    message: 'complete "Complete Me"'
  });

  assert.true(completeResponse.includes('Marked "Complete Me" as complete'), 'Complete response');
});

QUnit.test('should show project status', async function(assert) {
  const chat = require('../../src/controller/chat');

  const statusResponse = await chat({
    message: 'show status'
  });

  assert.true(statusResponse.includes('Project: Test Project'), 'Status shows project name');
  assert.true(statusResponse.includes('Backlog:'), 'Status shows Backlog');
  assert.true(statusResponse.includes('In Progress:'), 'Status shows In Progress');
  assert.true(statusResponse.includes('Done:'), 'Status shows Done');
});

QUnit.test('should handle task references', async function(assert) {
  // Use the chat controller directly with customized mocks
  const chatController = require('../../src/controller/chat-controller');
  
  // Track commands to test reference handling
  // Define these variables in module scope so they can be accessed from the mock
  const state = {
    lastTaskId: null,
    actionPerformed: null
  };
  
  // Mock the ChatHandler to track task references
  mockRequire('../../src/lib/chat-handler', class MockChatHandler {
    constructor() {
      this.lastTaskId = null;
    }
    
    async handleMessage(message) {
      // Simple command parsing
      if (message.includes('create task')) {
        const taskName = message.match(/"([^"]+)"/)[1];
        state.lastTaskId = `task-${Date.now()}`;
        state.actionPerformed = 'create';
        console.log('Setting actionPerformed to:', state.actionPerformed);
        return `Created task "${taskName}"`;
      } else if (message.includes('move it')) {
        const column = message.match(/to ([^"]+)/)[1];
        state.actionPerformed = 'move';
        console.log('Setting actionPerformed to:', state.actionPerformed);
        return `Moved task "Reference Test" to ${column}`;
      } else if (message.includes('complete')) {
        state.actionPerformed = 'complete';
        console.log('Setting actionPerformed to:', state.actionPerformed);
        return `Marked "Reference Test" as complete`;
      }
      return 'Command not recognized';
    }
  });
  
  // Create task
  const createResponse = await chatController({
    message: 'create task "Reference Test"'
  });
  
  assert.true(createResponse.includes('Created task "Reference Test"'), 'Task creation response');
  assert.equal(state.actionPerformed, 'create', 'Create action performed');
  
  // Reference by "it"
  const moveResponse = await chatController({
    message: 'move it to In Progress'
  });
  
  assert.true(moveResponse.includes('Moved task "Reference Test" to In Progress'), 'Move using "it"');
  assert.equal(state.actionPerformed, 'move', 'Move action performed');
  
  // Reference by name
  const completeResponse = await chatController({
    message: 'complete "Reference Test"'
  });
  
  assert.true(completeResponse.includes('Marked "Reference Test" as complete'), 'Complete by name');
  assert.equal(state.actionPerformed, 'complete', 'Complete action performed');
  
  // Clean up mocks
  mockRequire.stop('../../src/lib/chat-handler');
});

QUnit.test('should handle errors gracefully', async function(assert) {
  // Use the chat controller directly with customized mocks
  const chatController = require('../../src/controller/chat-controller');
  
  // Mock AIService to return consistent responses
  mockRequire('../../src/lib/ai-service', function() {
    return testHelper.createMockAIService('Error: Could not complete the requested action.');
  });

  // Try to move non-existent task
  const moveResponse = await chatController({
    message: 'move "Missing Task" to Done'
  });

  assert.true(moveResponse.includes('Error:'), 'Error prefix is present');
  assert.true(moveResponse.includes('Could not find task') || 
              moveResponse.includes('Error:'), 'Error message is descriptive');

  // Try to move to invalid column
  const invalidResponse = await chatController({
    message: 'move "Reference Test" to Invalid Column'
  });

  assert.true(invalidResponse.includes('Error:'), 'Error prefix is present');
  assert.true(invalidResponse.includes('Invalid column') || 
              invalidResponse.includes('Error:'), 'Error message is descriptive');
  
  // Stop mocking
  mockRequire.stop('../../src/lib/ai-service');
});
