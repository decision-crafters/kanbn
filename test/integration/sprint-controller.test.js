const QUnit = require('qunit');
const mockRequire = require('mock-require');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const fixtures = require('../fixtures');

QUnit.module('Sprint Controller tests', {
  before: function() {
    // Create test board
    this.testDir = path.join(__dirname, '..', 'sprint-test');
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
        'Backlog': ['task-1', 'task-2', 'task-3']
      }
    });
  },

  afterEach: function() {
    mockRequire.stopAll();
  }
});

QUnit.test('should create sprint with name and description', async function(assert) {
  const sprint = require('../../src/controller/sprint');

  await sprint({
    name: 'Sprint 1',
    description: 'First sprint'
  });

  const index = await fixtures.kanbn.getIndex();
  // Verify both sprint entry and column are created
  assert.ok(index.options.sprints && index.options.sprints.length === 1, 'Sprint entry should be created');
  assert.strictEqual(index.options.sprints[0].name, 'Sprint 1', 'Sprint name should match');
  assert.strictEqual(index.options.sprints[0].description, 'First sprint', 'Sprint description should match');
  assert.true('Sprint 1' in index.columns, 'Sprint column should be created');
  assert.deepEqual(index.columns['Sprint 1'], [], 'Sprint column should start empty');
});

QUnit.test('should allow moving tasks to sprint column', async function(assert) {
  const sprint = require('../../src/controller/sprint');
  const move = require('../../src/controller/move');

  // Create sprint
  await sprint({
    name: 'Sprint 1',
    description: 'First sprint'
  });

  // Move tasks to sprint
  await move({
    _: ['task-1'],
    column: 'Sprint 1'
  });
  await move({
    _: ['task-2'],
    column: 'Sprint 1'
  });

  const index = await fixtures.kanbn.getIndex();
  assert.strictEqual(index.columns['Sprint 1'].length, 2, 'Sprint should have 2 tasks');
  assert.true(index.columns['Sprint 1'].includes('task-1'), 'First task should be in sprint');
  assert.true(index.columns['Sprint 1'].includes('task-2'), 'Second task should be in sprint');
});

QUnit.test('should not create duplicate sprint names', async function(assert) {
  const sprint = require('../../src/controller/sprint');

  // Create first sprint
  await sprint({
    name: 'Sprint 1',
    description: 'First sprint'
  });

  // Try to create duplicate
  try {
    await sprint({
      name: 'Sprint 1',
      description: 'Duplicate sprint'
    });
    assert.false(true, 'Should throw on duplicate sprint name');
  } catch (error) {
    assert.true(error.message.includes('already exists'), 'Should indicate column already exists');
  }

  const index = await fixtures.kanbn.getIndex();
  const sprintColumns = Object.keys(index.columns).filter(col => col.startsWith('Sprint'));
  assert.strictEqual(sprintColumns.length, 1, 'Should only have one sprint column');
});

QUnit.test('should handle sprint completion', async function(assert) {
  const sprint = require('../../src/controller/sprint');
  const move = require('../../src/controller/move');

  // Create and populate sprint
  await sprint({
    name: 'Sprint 1',
    description: 'First sprint'
  });
  await move({
    _: ['task-1'],
    column: 'Sprint 1'
  });

  // Mark task as complete
  const task = await fixtures.kanbn.getTask('task-1');
  task.metadata.completed = new Date();
  await fixtures.kanbn.updateTask('task-1', task);

  // Get burndown data
  const burndown = require('../../src/controller/burndown');
  const data = await burndown({
    sprint: 'Sprint 1',
    json: true
  });

  assert.strictEqual(data.total, 1, 'Should have 1 total task');
  assert.strictEqual(data.completed, 1, 'Should have 1 completed task');
});

QUnit.test('should handle interactive sprint creation', async function(assert) {
  const sprint = require('../../src/controller/sprint');

  // Mock inquirer responses
  mockRequire('inquirer', {
    prompt: async () => ({
      name: 'Interactive Sprint',
      description: 'Created interactively',
      tasks: ['task-1', 'task-2']
    })
  });

  await sprint({
    interactive: true
  });

  const index = await fixtures.kanbn.getIndex();
  assert.true('Interactive Sprint' in index.columns, 'Sprint column should be created');
  assert.deepEqual(
    index.columns['Interactive Sprint'],
    ['task-1', 'task-2'],
    'Tasks should be added to sprint'
  );
});

QUnit.test('should validate sprint name', async function(assert) {
  const sprint = require('../../src/controller/sprint');

  try {
    await sprint({
      name: '',
      description: 'Invalid sprint'
    });
    assert.false(true, 'Should throw on empty sprint name');
  } catch (error) {
    assert.true(error.message.includes('name'), 'Should indicate invalid name');
  }

  try {
    await sprint({
      name: 'In Progress',
      description: 'Reserved name'
    });
    assert.false(true, 'Should throw on reserved column name');
  } catch (error) {
    assert.true(error.message.includes('reserved'), 'Should indicate reserved name');
  }
});
