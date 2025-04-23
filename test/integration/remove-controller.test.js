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
    process.chdir(this.testDir);
  },

  after: function() {
    rimraf.sync(this.testDir);
  },

  beforeEach: async function() {
    // Set up a fresh board with tasks for each test
    this.index = fixtures({
      tasks: [
        { name: 'Task 1', description: 'Test task 1' },
        { name: 'Task 2', description: 'Test task 2' },
        { name: 'Task 3', description: 'Test task 3' }
      ],
      columns: {
        'Backlog': ['task-1'],
        'In Progress': ['task-2'],
        'Done': ['task-3']
      }
    });
  },

  afterEach: function() {
    mockRequire.stopAll();
  }
});

QUnit.test('should remove task with force flag', async function(assert) {
  const remove = require('../../src/controller/remove');

  // Remove task-2 with force flag
  await remove({
    _: ['task-2'],
    force: true
  });

  // Verify task is removed
  const index = await fixtures.kanbn.getIndex();
  assert.false(index.columns['In Progress'].includes('task-2'), 'Task should be removed from column');
  
  try {
    await fixtures.kanbn.getTask('task-2');
    assert.false(true, 'Task file should not exist');
  } catch (error) {
    assert.true(error.message.includes('No task file found'), 'Should throw appropriate error');
  }
});

QUnit.test('should fail without force flag', async function(assert) {
  const remove = require('../../src/controller/remove');

  try {
    await remove({
      _: ['task-1']
    });
    assert.false(true, 'Should throw without force flag');
  } catch (error) {
    assert.true(error.message.includes('force'), 'Should require force flag');
  }

  // Verify task still exists
  const index = await fixtures.kanbn.getIndex();
  assert.true(index.columns['Backlog'].includes('task-1'), 'Task should remain in column');
});

QUnit.test('should handle non-existent task', async function(assert) {
  const remove = require('../../src/controller/remove');

  try {
    await remove({
      _: ['missing-task'],
      force: true
    });
    assert.false(true, 'Should throw for non-existent task');
  } catch (error) {
    assert.true(error.message.includes('No task file found'), 'Should indicate task not found');
  }
});

QUnit.test('should update index when removing task', async function(assert) {
  const remove = require('../../src/controller/remove');

  // Get initial task count
  const initialIndex = await fixtures.kanbn.getIndex();
  const initialTaskCount = initialIndex.columns['Done'].length;

  // Remove task from Done column
  await remove({
    _: ['task-3'],
    force: true
  });

  // Verify index is updated
  const updatedIndex = await fixtures.kanbn.getIndex();
  assert.strictEqual(
    updatedIndex.columns['Done'].length,
    initialTaskCount - 1,
    'Column task count should decrease'
  );
  assert.false(updatedIndex.columns['Done'].includes('task-3'), 'Task should be removed from index');
});

QUnit.test('should handle removing tasks from different columns', async function(assert) {
  const remove = require('../../src/controller/remove');

  // Remove from each column
  await remove({ _: ['task-1'], force: true }); // Backlog
  await remove({ _: ['task-2'], force: true }); // In Progress
  await remove({ _: ['task-3'], force: true }); // Done

  const index = await fixtures.kanbn.getIndex();
  assert.strictEqual(index.columns['Backlog'].length, 0, 'Backlog should be empty');
  assert.strictEqual(index.columns['In Progress'].length, 0, 'In Progress should be empty');
  assert.strictEqual(index.columns['Done'].length, 0, 'Done should be empty');
});
