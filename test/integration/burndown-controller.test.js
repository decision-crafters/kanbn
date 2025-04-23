const QUnit = require('qunit');
const mockRequire = require('mock-require');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const fixtures = require('../fixtures');

QUnit.module('Burndown Controller tests', {
  before: function() {
    // Create test board
    this.testDir = path.join(__dirname, '..', 'burndown-test');
    fs.mkdirSync(this.testDir, { recursive: true });
    process.chdir(this.testDir);
  },

  after: function() {
    rimraf.sync(this.testDir);
  },

  beforeEach: async function() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    
    // Set up a fresh board with tasks for each test
    this.index = fixtures({
      tasks: [
        {
          name: 'Task 1',
          description: 'Test task 1',
          metadata: {
            created: twoDaysAgo,
            completed: yesterday
          }
        },
        {
          name: 'Task 2',
          description: 'Test task 2',
          metadata: {
            created: twoDaysAgo,
            assigned: 'user1'
          }
        },
        {
          name: 'Task 3',
          description: 'Test task 3',
          metadata: {
            created: yesterday
          }
        }
      ],
      columns: {
        'Sprint 1': ['task-1', 'task-2'],
        'Sprint 2': ['task-3'],
        'Done': []
      }
    });
  },

  afterEach: function() {
    mockRequire.stopAll();
  }
});

QUnit.test('should generate burndown data in JSON format', async function(assert) {
  const burndown = require('../../src/controller/burndown');

  const data = await burndown({
    json: true
  });

  assert.true('total' in data, 'Should include total tasks');
  assert.true('completed' in data, 'Should include completed tasks');
  assert.true('data' in data, 'Should include burndown data');
  assert.strictEqual(data.total, 3, 'Should count all tasks');
  assert.strictEqual(data.completed, 1, 'Should count completed tasks');
});

QUnit.test('should handle comma-separated sprint list', async function(assert) {
  const burndown = require('../../src/controller/burndown');

  const data = await burndown({
    sprint: 'Sprint 1,Sprint 2',
    json: true
  });

  assert.strictEqual(data.series.length, 2, 'Should handle both sprints');
  assert.strictEqual(data.total, 3, 'Should include tasks from both sprints');
});

QUnit.test('should handle repeated sprint options', async function(assert) {
  const burndown = require('../../src/controller/burndown');

  const data = await burndown({
    sprint: ['Sprint 1', 'Sprint 2'],
    json: true
  });

  assert.strictEqual(data.series.length, 2, 'Should handle both sprints');
  assert.strictEqual(data.total, 3, 'Should include tasks from both sprints');
});

QUnit.test('should ignore empty entries in comma-separated list', async function(assert) {
  const burndown = require('../../src/controller/burndown');

  const data = await burndown({
    sprint: 'Sprint 1,,Sprint 2,',
    json: true
  });

  assert.strictEqual(data.series.length, 2, 'Should ignore empty entries');
  assert.strictEqual(data.total, 3, 'Should include tasks from valid sprints');
});

QUnit.test('should trim whitespace from sprint names', async function(assert) {
  const burndown = require('../../src/controller/burndown');

  const data = await burndown({
    sprint: ' Sprint 1 , Sprint 2 ',
    json: true
  });

  assert.strictEqual(data.series.length, 2, 'Should handle trimmed sprint names');
  assert.strictEqual(data.total, 3, 'Should include tasks from both sprints');
});

QUnit.test('should filter by sprint', async function(assert) {
  const burndown = require('../../src/controller/burndown');

  const data = await burndown({
    sprint: 'Sprint 1',
    json: true
  });

  assert.strictEqual(data.total, 2, 'Should only count sprint tasks');
  assert.strictEqual(data.completed, 1, 'Should count completed sprint tasks');
});

QUnit.test('should filter by assigned user', async function(assert) {
  const burndown = require('../../src/controller/burndown');

  const data = await burndown({
    assigned: 'user1',
    json: true
  });

  assert.strictEqual(data.total, 1, 'Should only count assigned tasks');
  assert.strictEqual(
    data.data[0].remaining,
    1,
    'Should show correct remaining tasks'
  );
});

QUnit.test('should filter by column', async function(assert) {
  const burndown = require('../../src/controller/burndown');

  const data = await burndown({
    column: 'Done',
    json: true
  });

  assert.strictEqual(data.total, 0, 'Should only count tasks in column');
});

QUnit.test('should respect date range', async function(assert) {
  const burndown = require('../../src/controller/burndown');
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const data = await burndown({
    date: yesterday,
    json: true
  });

  assert.strictEqual(
    data.data[0].date.split('T')[0],
    yesterday,
    'Should start from specified date'
  );
});

QUnit.test('should normalize data when requested', async function(assert) {
  const burndown = require('../../src/controller/burndown');

  const data = await burndown({
    normalise: '10',
    json: true
  });

  assert.true(
    data.data.every(point => point.remaining <= 10),
    'All data points should be normalized to max 10'
  );
});

QUnit.test('should handle missing sprint', async function(assert) {
  const burndown = require('../../src/controller/burndown');

  try {
    await burndown({
      sprint: 'Missing Sprint',
      json: true
    });
    assert.false(true, 'Should throw for missing sprint');
  } catch (error) {
    assert.true(error.message.includes('sprint'), 'Should indicate invalid sprint');
  }
});

QUnit.test('should handle invalid date format', async function(assert) {
  const burndown = require('../../src/controller/burndown');

  try {
    await burndown({
      date: 'invalid-date',
      json: true
    });
    assert.false(true, 'Should throw for invalid date');
  } catch (error) {
    assert.true(error.message.includes('date'), 'Should indicate invalid date');
  }
});

QUnit.test('should handle normalisation value of zero', async function(assert) {
  const burndown = require('../../src/controller/burndown');

  try {
    await burndown({
      normalise: '0',
      json: true
    });
    assert.false(true, 'Should throw for zero normalisation');
  } catch (error) {
    assert.true(error.message.includes('normalise'), 'Should indicate invalid normalisation');
  }
});
