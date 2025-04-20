const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const mockRequire = require('mock-require');
const { Kanbn } = require('../../src/main');
const kanbn = new Kanbn();

const testFolder = path.join(__dirname, '..', 'test-chat');
const testTasksFolder = path.join(testFolder, '.kanbn', 'tasks');

// Store the original module
let originalChatModule;

// Create a mock for the callOpenRouterAPI function
const mockCallOpenRouterAPI = async function(message, projectContext) {
  return 'This is a test response from the mock AI assistant.';
};

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

// Create a mock for the chat controller
const createMockChat = () => {
  // Get the original chat module path
  const chatModulePath = require.resolve('../../src/controller/chat');

  // Clear the module cache to ensure we get a fresh copy
  delete require.cache[chatModulePath];

  // Mock axios before requiring the chat module
  mockRequire('axios', mockAxios);

  // Return the chat module with our mocked dependencies
  return require(chatModulePath);
};

QUnit.module('Chat controller tests', {
  before: function() {
    // Save the original modules
    const chatModulePath = require.resolve('../../src/controller/chat');
    const axiosModulePath = require.resolve('axios');

    if (require.cache[chatModulePath]) {
      originalChatModule = require.cache[chatModulePath];
    }

    // Set up our mocks
    mockRequire('axios', mockAxios);
  },

  after: function() {
    // Restore original modules
    mockRequire.stop('axios');

    // Clear the module cache to ensure clean state for other tests
    const chatModulePath = require.resolve('../../src/controller/chat');
    if (originalChatModule) {
      require.cache[chatModulePath] = originalChatModule;
    } else {
      delete require.cache[chatModulePath];
    }
  },

  beforeEach: async function() {
    if (!fs.existsSync(testFolder)) {
      fs.mkdirSync(testFolder);
    }

    process.chdir(testFolder);
    await kanbn.initialise({
      name: 'Test Project',
      description: 'Test project for chat controller',
      columns: ['Backlog', 'Todo', 'In Progress', 'Done']
    });

    await kanbn.createTask({
      name: 'Test Task',
      description: 'This is a test task',
      metadata: {
        tags: ['test']
      }
    }, 'Backlog');
  },

  afterEach: function() {
    rimraf.sync(testFolder);
  }
});

QUnit.test('should get project context correctly', async function(assert) {
    const getProjectContext = async function() {
      try {
        const index = await kanbn.getIndex();
        const tasks = await kanbn.loadAllTrackedTasks();
        const status = await kanbn.status(false, false, false, null, null);

        return {
          projectName: index.name,
          projectDescription: index.description,
          columns: Object.keys(index.columns),
          taskCount: tasks.length,
          tasksByColumn: Object.keys(index.columns).reduce((acc, column) => {
            acc[column] = tasks.filter(task =>
              kanbn.findTaskColumn(task.id) === column
            ).length;
            return acc;
          }, {}),
          tags: [...new Set(tasks.flatMap(task =>
            task.metadata.tags || []
          ))],
          statistics: status
        };
      } catch (error) {
        return {
          error: error.message
        };
      }
    };

    const context = await getProjectContext();

    assert.strictEqual(context.projectName, 'Test Project', 'Project name should match');
    assert.strictEqual(context.projectDescription, 'Test project for chat controller', 'Project description should match');
    assert.strictEqual(context.taskCount, 1, 'Task count should be 1');
    assert.deepEqual(context.tags, ['test'], 'Tags should include "test"');
    assert.strictEqual(context.columns.length, 4, 'Should have 4 columns');
});

QUnit.test('should log AI interaction when chat is used', async function(assert) {
    // Set environment variable for testing
    process.env.OPENROUTER_API_KEY = 'test-api-key';

    // Get the chat module with our mocks
    const chat = require('../../src/controller/chat');

    // Call the chat function
    await chat({
      message: 'Test message'
    });

    const tasks = await kanbn.loadAllTrackedTasks();
    const aiInteractions = tasks.filter(task =>
      task.metadata.tags &&
      task.metadata.tags.includes('ai-interaction')
    );

    assert.strictEqual(aiInteractions.length, 1, 'One AI interaction should be logged');
    assert.ok(aiInteractions[0].metadata.tags.includes('chat'), 'AI interaction should have "chat" tag');
});
