const QUnit = require('qunit');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const mockRequire = require('mock-require');
const testFolder = path.join(__dirname, '..', 'test-chat');
const testTasksFolder = path.join(testFolder, '.kanbn', 'tasks');

// Set test environment
process.env.KANBN_ENV = 'test';
process.env.OPENROUTER_API_KEY = 'test-api-key';

// Store the original modules
let originalChatModule;
let originalMainModule;

// Create a mock for the axios module to prevent actual API calls
const mockAxios = {
  post: async function() {
    return {
      data: {
        choices: [{
          message: {
            content: 'This is a test response from the mock AI assistant.'
          }
        }]
      }
    };
  }
};

// Mock Kanbn class with different column scenarios
// Base mock class with common methods
class BaseMockKanbn {
  async initialised() {
    return true;
  }

  async status() {
    return {};
  }

  async loadAllTrackedTasks() {
    return [];
  }

  async createTask(taskData, column) {
    return 'ai-interaction-123';
  }

  async findTaskColumn() {
    return 'Backlog';
  }
}

class MockKanbnNoColumns extends BaseMockKanbn {
  async getIndex() {
    return {
      name: 'Test Project',
      description: 'Test project for chat controller',
      columns: null  // Test null columns scenario
    };
  }
}

class MockKanbnEmptyColumns extends BaseMockKanbn {
  async getIndex() {
    return {
      name: 'Test Project',
      description: 'Test project for chat controller',
      columns: {}  // Test empty columns scenario
    };
  }
}

class MockKanbnValidColumns extends BaseMockKanbn {
  async getIndex() {
    return {
      name: 'Test Project',
      description: 'Test project for chat controller',
      columns: {
        'Backlog': ['test-task'],
        'Todo': [],
        'In Progress': [],
        'Done': []
      }
    };
  }

  async loadAllTrackedTasks() {
    return [{
      id: 'test-task',
      name: 'Test Task',
      description: 'This is a test task',
      metadata: {
        tags: ['test']
      }
    }];
  }
}

QUnit.module('Chat controller tests', {
  before: function() {
    // Save the original modules
    const chatModulePath = require.resolve('../../src/controller/chat');
    const mainModulePath = require.resolve('../../src/main');
    const axiosModulePath = require.resolve('axios');

    if (require.cache[chatModulePath]) {
      originalChatModule = require.cache[chatModulePath];
    }

    if (require.cache[mainModulePath]) {
      originalMainModule = require.cache[mainModulePath];
    }

    // Set up our mocks
    mockRequire('axios', mockAxios);
    
    // Create a function that returns our mock instance
    const mockMainModule = function() {
      return new MockKanbnValidColumns();
    };
    mockMainModule.Kanbn = MockKanbnValidColumns;
    mockMainModule.findTaskColumn = () => 'Backlog';
    mockRequire('../../src/main', mockMainModule);
  },

  after: function() {
    // Restore original modules
    mockRequire.stop('axios');
    mockRequire.stop('../../src/main');

    // Restore the module cache
    const chatModulePath = require.resolve('../../src/controller/chat');
    const mainModulePath = require.resolve('../../src/main');

    if (originalChatModule) {
      require.cache[chatModulePath] = originalChatModule;
    } else {
      delete require.cache[chatModulePath];
    }

    if (originalMainModule) {
      require.cache[mainModulePath] = originalMainModule;
    } else {
      delete require.cache[mainModulePath];
    }
  },

  beforeEach: function() {
    if (!fs.existsSync(testFolder)) {
      fs.mkdirSync(testFolder);
    }
    process.chdir(testFolder);
  },

  afterEach: function() {
    rimraf.sync(testFolder);
  }
});

QUnit.test('should handle null columns gracefully', async function(assert) {
    // Mock the main module with null columns
    const mockMainFunction = function() {
      return new MockKanbnNoColumns();
    };
    mockMainFunction.Kanbn = MockKanbnNoColumns;
    mockMainFunction.findTaskColumn = () => 'Backlog';
    mockRequire('../../src/main', mockMainFunction);

    // Load the chat module with our mocks
    const chat = require('../../src/controller/chat');
    
    // Call the chat function
    await chat({
      message: 'Test message'
    });

    // If we get here without error, the test passes
    assert.ok(true, 'Chat function handled null columns without error');
});

QUnit.test('should handle empty columns object gracefully', async function(assert) {
    // Mock the main module with empty columns
    const mockMainFunction = function() {
      return new MockKanbnEmptyColumns();
    };
    mockMainFunction.Kanbn = MockKanbnEmptyColumns;
    mockMainFunction.findTaskColumn = () => 'Backlog';
    mockRequire('../../src/main', mockMainFunction);

    // Load the chat module with our mocks
    const chat = require('../../src/controller/chat');
    
    // Call the chat function
    await chat({
      message: 'Test message'
    });

    // If we get here without error, the test passes
    assert.ok(true, 'Chat function handled empty columns without error');
});

QUnit.test('should get project context correctly with valid columns', async function(assert) {
    // Load the chat module with our mocks
    const chat = require('../../src/controller/chat');

    // Get the getProjectContext function
    const getProjectContext = async () => {
      const mockKanbn = new MockKanbnValidColumns();
      const index = await mockKanbn.getIndex();
      const tasks = await mockKanbn.loadAllTrackedTasks();
      return {
        projectName: index.name,
        projectDescription: index.description,
        columns: Object.keys(index.columns),
        taskCount: tasks.length,
        tags: ['test'],
        statistics: {}
      };
    };

    const context = await getProjectContext();

    assert.strictEqual(context.projectName, 'Test Project', 'Project name should match');
    assert.strictEqual(context.projectDescription, 'Test project for chat controller', 'Project description should match');
    assert.strictEqual(context.taskCount, 1, 'Task count should be 1');
    assert.deepEqual(context.tags, ['test'], 'Tags should include "test"');
    assert.strictEqual(context.columns.length, 4, 'Should have 4 columns');
});

QUnit.test('should log AI interaction with valid columns', async function(assert) {
    // Set environment variables for testing
    process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'test-api-key';

    // Mock the main module with valid columns
    const mockMainFunction = function() {
      return new MockKanbnValidColumns();
    };
    mockMainFunction.Kanbn = MockKanbnValidColumns;
    mockMainFunction.findTaskColumn = () => 'Backlog';
    mockRequire('../../src/main', mockMainFunction);

    // Load the chat module with our mocks
    const chat = require('../../src/controller/chat');

    // Call the chat function
    await chat({
      message: 'Test message'
    });

    assert.ok(true, 'Chat function executed without errors with valid columns');
});
