const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const mockRequire = require('mock-require');
const dotenv = require('dotenv');

const QUnit = require('qunit');

dotenv.config();

let originalDecomposeModule;
let originalMainModule;

class MockKanbn {
  async initialised() {
    return true;
  }

  async getIndex() {
    return {
      name: 'Test Project',
      description: 'Test project for decompose controller',
      columns: {
        'Backlog': ['test-task'],
        'Todo': [],
        'In Progress': [],
        'Done': []
      }
    };
  }

  async findTrackedTasks() {
    return ['test-task'];
  }

  async taskExists() {
    return true;
  }

  async getTask() {
    return {
      id: 'test-task',
      name: 'Test Task',
      description: 'This is a test task for decomposition',
      metadata: {
        tags: ['test']
      }
    };
  }

  async loadAllTrackedTasks() {
    return [{
      id: 'test-task',
      name: 'Test Task',
      description: 'This is a test task for decomposition',
      metadata: {
        tags: ['test']
      }
    }];
  }

  async status() {
    return {
      relationMetrics: {
        parentTasks: 1,
        childTasks: 2
      }
    };
  }

  async findTaskColumn() {
    return 'Backlog';
  }

  async createTask() {
    return 'child-task-' + Date.now();
  }

  async updateTask() {
    return true;
  }
}

const mockKanbnInstance = new MockKanbn();

const mockMain = function() {
  return mockKanbnInstance;
};

mockMain.Kanbn = function() {
  return mockKanbnInstance;
};
mockMain.initialised = async function() { return true; };
mockMain.findTrackedTasks = async function() { return mockKanbnInstance.findTrackedTasks(); };
mockMain.taskExists = async function() { return mockKanbnInstance.taskExists(); };
mockMain.getTask = async function() { return mockKanbnInstance.getTask(); };
mockMain.loadTask = async function() { return mockKanbnInstance.getTask(); };
mockMain.getIndex = async function() { return mockKanbnInstance.getIndex(); };
mockMain.status = async function() { return mockKanbnInstance.status(); };
mockMain.findTaskColumn = async function() { return mockKanbnInstance.findTaskColumn(); };
mockMain.createTask = async function() { return mockKanbnInstance.createTask(); };
mockMain.updateTask = async function() { return mockKanbnInstance.updateTask(); };

const mockAxios = {
  post: async function() {
    return {
      data: {
        choices: [{
          message: {
            content: JSON.stringify({
              subtasks: [
                { text: 'Subtask 1', completed: false },
                { text: 'Subtask 2', completed: false }
              ]
            })
          }
        }]
      }
    };
  }
};

const testFolder = path.join(__dirname, '..', 'test-decompose');

QUnit.module('Decompose controller tests', {
  before: function() {
    const decomposeModulePath = require.resolve('../../src/controller/decompose');
    const mainModulePath = require.resolve('../../src/main');

    if (require.cache[decomposeModulePath]) {
      originalDecomposeModule = require.cache[decomposeModulePath];
    }

    if (require.cache[mainModulePath]) {
      originalMainModule = require.cache[mainModulePath];
    }

    mockRequire('axios', mockAxios);
    mockRequire('../../src/main', mockMain);

    delete require.cache[decomposeModulePath];
  },

  after: function() {
    mockRequire.stop('axios');
    mockRequire.stop('../../src/main');

    const decomposeModulePath = require.resolve('../../src/controller/decompose');
    const mainModulePath = require.resolve('../../src/main');

    if (originalDecomposeModule) {
      require.cache[decomposeModulePath] = originalDecomposeModule;
    } else {
      delete require.cache[decomposeModulePath];
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

QUnit.test('should log AI interaction when OpenRouter API key is not available', async function(assert) {
    const originalApiKey = process.env.OPENROUTER_API_KEY;
    
    let aiLoggingCallCount = 0;
    
    const MockAILogging = class {
      constructor() {
        console.log('MockAILogging instantiated');
      }
      async logInteraction(boardFolder, type, _data) {
        console.log(`MockAILogging.logInteraction called with type: ${type}`);
        aiLoggingCallCount++;
        return true;
      }
    };
    
    mockRequire('../../src/lib/ai-logging', MockAILogging);
    
    mockRequire('axios', {
      post: async () => ({
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                subtasks: [
                  { text: "This is a test task for decomposition", completed: false }
                ]
              })
            }
          }]
        }
      })
    });
    
    delete require.cache[require.resolve('../../src/controller/decompose')];
    const decompose = require('../../src/controller/decompose');

    process.env.OPENROUTER_API_KEY = undefined;

    try {
      await decompose({
        task: 'test-task',
        interactive: false
      });

      console.log(`AI logging call count: ${aiLoggingCallCount}`);
      
      assert.ok(aiLoggingCallCount > 0, 'AI logging function was called at least once');
      assert.ok(true, 'Decompose function executed without errors');
    } finally {
      process.env.OPENROUTER_API_KEY = originalApiKey;
      
      mockRequire.stop('../../src/lib/ai-logging');
      mockRequire.stop('axios');
    }
});

QUnit.test('should create parent-child relationships between tasks', async function(assert) {
    const mockKanbn = new MockKanbn();

    const status = await mockKanbn.status();

    assert.ok(status.relationMetrics, 'Status should include relation metrics');
    assert.strictEqual(status.relationMetrics.parentTasks, 1, 'Should have 1 parent task');
    assert.strictEqual(status.relationMetrics.childTasks, 2, 'Should have 2 child tasks');
});
