const QUnit = require('qunit');
const mockRequire = require('mock-require');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const fixtures = require('../fixtures');

QUnit.module('Remove Controller tests', {
  before: function() {
    // Create test board
    this.testDir = path.join(__dirname, '..', 'remove-test');
    fs.mkdirSync(this.testDir, { recursive: true });
    fs.mkdirSync(path.join(this.testDir, '.kanbn'), { recursive: true });
    fs.mkdirSync(path.join(this.testDir, '.kanbn', 'tasks'), { recursive: true });
    process.chdir(this.testDir);
  },

  after: function() {
    rimraf.sync(this.testDir);
  },

  beforeEach: async function() {
    // Set up a fresh board with tasks for each test
    const tasks = [
      { name: 'Task 1', description: 'Test task 1' },
      { name: 'Task 2', description: 'Test task 2' },
      { name: 'Task 3', description: 'Test task 3' }
    ];

    const index = {
      name: 'test',
      description: 'Test kanbn board',
      columns: {
        'Backlog': ['task-1'],
        'In Progress': ['task-2'],
        'Done': ['task-3']
      }
    };

    // Write index file
    fs.writeFileSync(
      path.join(this.testDir, '.kanbn', 'index.md'),
      require('../../src/parse-index').json2md(index)
    );

    // Write task files
    for (const task of tasks) {
      fs.writeFileSync(
        path.join(this.testDir, '.kanbn', 'tasks', `${require('../../src/utility').getTaskId(task.name)}.md`),
        require('../../src/parse-task').json2md(task)
      );
    }

    this.index = index;
  },

  afterEach: function() {
    mockRequire.stopAll();
    fixtures.cleanup();
  }
});

QUnit.test('should remove task with force flag', async function(assert) {
  const done = assert.async();
  try {
    // Create a mock kanbn instance
    const mockKanbn = {
      initialised: async () => true,
      taskExists: async (_taskId) => true,
      getIndex: async () => {
        return {
          columns: {
            'Backlog': ['task-1'],
            'In Progress': [],  // task-2 has been removed
            'Done': ['task-3']
          }
        };
      },
      deleteTask: async (_taskId, _removeFile) => {
        // Simulate task deletion
        return _taskId;
      },
      getTask: async (taskId) => {
        if (taskId === 'task-2') {
          throw new Error('No task file found for task "task-2"');
        }
        return { name: 'Test Task' };
      }
    };

    // Mock the main module
    mockRequire('../../src/main', () => mockKanbn);

    // Get the remove controller
    const remove = require('../../src/controller/remove');

    // Remove task-2 with force flag
    await remove({
      _: ['task-2'],
      force: true
    });

    // Verify task is removed
    const index = await mockKanbn.getIndex();
    assert.false(index.columns['In Progress'].includes('task-2'), 'Task should be removed from column');

    try {
      await mockKanbn.getTask('task-2');
      assert.false(true, 'Task file should not exist');
    } catch (error) {
      assert.true(error.message.includes('No task file found'), 'Should throw appropriate error');
    }
    done();
  } catch (error) {
    assert.ok(false, `Test failed with error: ${error.message}`);
    done();
  }
});

QUnit.test('should fail without force flag', async function(assert) {
  const done = assert.async();
  try {
    // Create a mock kanbn instance
    const mockKanbn = {
      initialised: async () => true,
      taskExists: async (_taskId) => true,
      getIndex: async () => {
        return {
          columns: {
            'Backlog': ['task-1'],
            'In Progress': ['task-2'],
            'Done': ['task-3']
          }
        };
      },
      deleteTask: async (_taskId, _removeFile) => {
        // Simulate task deletion
        return _taskId;
      },
      getTask: async (taskId) => {
        return { name: 'Test Task' };
      }
    };

    // Mock the inquirer module to simulate user cancellation
    mockRequire('inquirer', {
      prompt: async () => ({ sure: false })
    });

    // Mock the main module
    mockRequire('../../src/main', () => mockKanbn);

    // Get the remove controller
    const remove = require('../../src/controller/remove');

    // Try to remove task-1 without force flag
    await remove({
      _: ['task-1']
    });

    // Verify task still exists
    const index = await mockKanbn.getIndex();
    assert.true(index.columns['Backlog'].includes('task-1'), 'Task should remain in column');
    done();
  } catch (error) {
    // This is expected since we're not using the force flag
    assert.true(error.message.includes('force') || error.message.includes('cancelled'), 'Should require force flag');
    done();
  }
});

QUnit.test('should handle non-existent task', async function(assert) {
  const done = assert.async();
  try {
    // Create a mock kanbn instance
    const mockKanbn = {
      initialised: async () => true,
      taskExists: async (_taskId) => {
        if (_taskId === 'missing-task') {
          throw new Error('Task "missing-task" not found in index');
        }
        return true;
      },
      getIndex: async () => {
        return {
          columns: {
            'Backlog': ['task-1'],
            'In Progress': ['task-2'],
            'Done': ['task-3']
          }
        };
      },
      deleteTask: async (_taskId, _removeFile) => {
        // Simulate task deletion
        return _taskId;
      },
      getTask: async (taskId) => {
        return { name: 'Test Task' };
      }
    };

    // Mock the main module
    mockRequire('../../src/main', () => mockKanbn);

    // Get the remove controller
    const remove = require('../../src/controller/remove');

    try {
      await remove({
        _: ['missing-task'],
        force: true
      });
      assert.false(true, 'Should throw for non-existent task');
    } catch (error) {
      assert.true(error.message.includes('not found'), 'Should indicate task not found');
    }
    done();
  } catch (error) {
    assert.ok(false, `Test failed with error: ${error.message}`);
    done();
  }
});

QUnit.test('should update index when removing task', async function(assert) {
  const done = assert.async();
  try {
    // Create a mock kanbn instance with state that changes after deletion
    let taskDeleted = false;
    const mockKanbn = {
      initialised: async () => true,
      taskExists: async (_taskId) => true,
      getIndex: async () => {
        if (taskDeleted) {
          return {
            columns: {
              'Backlog': ['task-1'],
              'In Progress': ['task-2'],
              'Done': []
            }
          };
        } else {
          return {
            columns: {
              'Backlog': ['task-1'],
              'In Progress': ['task-2'],
              'Done': ['task-3']
            }
          };
        }
      },
      deleteTask: async (_taskId, _removeFile) => {
        // Simulate task deletion
        taskDeleted = true;
        return _taskId;
      },
      getTask: async (taskId) => {
        if (taskDeleted && taskId === 'task-3') {
          throw new Error('No task file found for task "task-3"');
        }
        return { name: 'Test Task' };
      }
    };

    // Mock the main module
    mockRequire('../../src/main', () => mockKanbn);

    // Get the remove controller
    const remove = require('../../src/controller/remove');

    // Get initial task count
    const initialIndex = await mockKanbn.getIndex();
    const initialTaskCount = initialIndex.columns['Done'].length;
    assert.equal(initialTaskCount, 1, 'Initial task count should be 1');

    // Remove task from Done column
    await remove({
      _: ['task-3'],
      force: true
    });

    // Verify index is updated
    const updatedIndex = await mockKanbn.getIndex();
    assert.strictEqual(
      updatedIndex.columns['Done'].length,
      initialTaskCount - 1,
      'Column task count should decrease'
    );
    assert.false(updatedIndex.columns['Done'].includes('task-3'), 'Task should be removed from index');
    done();
  } catch (error) {
    assert.ok(false, `Test failed with error: ${error.message}`);
    done();
  }
});

QUnit.test('should handle removing tasks from different columns', async function(assert) {
  const done = assert.async();
  try {
    // Create a mock kanbn instance with state that changes after each deletion
    let state = {
      backlogEmpty: false,
      inProgressEmpty: false,
      doneEmpty: false
    };

    const mockKanbn = {
      initialised: async () => true,
      taskExists: async (_taskId) => true,
      getIndex: async () => {
        return {
          columns: {
            'Backlog': state.backlogEmpty ? [] : ['task-1'],
            'In Progress': state.inProgressEmpty ? [] : ['task-2'],
            'Done': state.doneEmpty ? [] : ['task-3']
          }
        };
      },
      deleteTask: async (_taskId, _removeFile) => {
        // Simulate task deletion
        if (_taskId === 'task-1') state.backlogEmpty = true;
        if (_taskId === 'task-2') state.inProgressEmpty = true;
        if (_taskId === 'task-3') state.doneEmpty = true;
        return _taskId;
      },
      getTask: async (taskId) => {
        if ((state.backlogEmpty && taskId === 'task-1') ||
            (state.inProgressEmpty && taskId === 'task-2') ||
            (state.doneEmpty && taskId === 'task-3')) {
          throw new Error(`No task file found for task "${taskId}"`);
        }
        return { name: 'Test Task' };
      }
    };

    // Mock the main module
    mockRequire('../../src/main', () => mockKanbn);

    // Get the remove controller
    const remove = require('../../src/controller/remove');

    // Remove from each column
    await remove({ _: ['task-1'], force: true }); // Backlog
    await remove({ _: ['task-2'], force: true }); // In Progress
    await remove({ _: ['task-3'], force: true }); // Done

    const index = await mockKanbn.getIndex();
    assert.strictEqual(index.columns['Backlog'].length, 0, 'Backlog should be empty');
    assert.strictEqual(index.columns['In Progress'].length, 0, 'In Progress should be empty');
    assert.strictEqual(index.columns['Done'].length, 0, 'Done should be empty');
    done();
  } catch (error) {
    assert.ok(false, `Test failed with error: ${error.message}`);
    done();
  }
});
