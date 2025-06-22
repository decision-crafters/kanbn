/**
 * Migration Examples: QUnit/mock-fs to Jest/real-fs
 * 
 * This file contains example migrations showing before/after patterns
 * for common test scenarios. Use these as templates for migrating tests.
 */

const { createTestEnvironment, quickSetup, assertions, mapColumnNames } = require('./migration-utils');
const { convertAsyncTest, convertAssertions } = require('./jest-helpers');
const kanbnFactory = require('../src/main');

// =============================================================================
// EXAMPLE 1: Basic Status Test Migration
// =============================================================================

/* BEFORE (QUnit + mock-fs):

const QUnit = require('qunit');
const mockFileSystem = require('mock-fs');
const kanbn = require('../src/main');

QUnit.module('Status Command', {
  beforeEach() {
    mockFileSystem({
      '.kanbn': {
        'index.md': '# Kanbn\n\n## Backlog\n- task1\n\n## Done\n- task2\n',
        'tasks': {
          'task1.md': '# Task 1\nDescription',
          'task2.md': '# Task 2\nDescription'
        }
      }
    });
  },
  afterEach() {
    mockFileSystem.restore();
  }
});

QUnit.test('shows task status', function(assert) {
  const result = kanbn().status();
  assert.ok(result.includes('task1'));
  assert.ok(result.includes('Backlog'));
});

*/

// AFTER (Jest + real-fs):
describe('Status Command', () => {
  let env;
  let testData;

  beforeEach(() => {
    env = createTestEnvironment('status-command');
    testData = env.setup({
      countTasks: 2,
      columnNames: ['Backlog', 'Done'],
      tasksPerColumn: 1
    });
  });

  afterEach(() => {
    env.cleanup();
  });

  test('shows task status', async () => {
    const result = await testData.kanbn.status();
    expect(result).toContain('Backlog');
    expect(result.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// EXAMPLE 2: Async Test with Error Handling Migration
// =============================================================================

/* BEFORE (QUnit + mock-fs):

QUnit.test('handles uninitialized folder', function(assert) {
  const done = assert.async();
  
  mockFileSystem({
    'empty-folder': {}
  });
  
  process.chdir('empty-folder');
  
  kanbn().status().catch(error => {
    assert.ok(error.message.includes('Not a kanbn folder'));
    done();
  });
});

*/

// AFTER (Jest + real-fs):
test('handles uninitialized folder', async () => {
  const { env } = quickSetup('uninitialized-test');
  
  try {
    const uninitDir = env.createUninitializedDir();
    const uninitKanbn = kanbnFactory(uninitDir);
    
    await assertions.expectError(
      uninitKanbn.status(),
      /Not a kanbn folder/
    );
  } finally {
    env.cleanup();
  }
});

// =============================================================================
// EXAMPLE 3: Task Creation and Verification Migration
// =============================================================================

/* BEFORE (QUnit + mock-fs):

QUnit.test('creates new task', function(assert) {
  const done = assert.async();
  
  mockFileSystem({
    '.kanbn': {
      'index.md': '# Kanbn\n\n## Backlog\n\n## Done\n',
      'tasks': {}
    }
  });
  
  kanbn().createTask('New Task', 'Description').then(() => {
    assert.ok(fs.existsSync('.kanbn/tasks/new-task.md'));
    const indexContent = fs.readFileSync('.kanbn/index.md', 'utf8');
    assert.ok(indexContent.includes('new-task'));
    done();
  });
});

*/

// AFTER (Jest + real-fs):
test('creates new task', async () => {
  const { kanbn, testDir, cleanup } = quickSetup('create-task-test', {
    countTasks: 0,
    columnNames: ['Backlog', 'Done']
  });
  
  try {
    await kanbn.createTask('New Task', 'Description');
    
    assertions.taskExists(testDir, 'new-task');
    assertions.taskInColumn(testDir, 'new-task', 'Backlog');
  } finally {
    cleanup();
  }
});

// =============================================================================
// EXAMPLE 4: Complex Test with Multiple Operations Migration
// =============================================================================

/* BEFORE (QUnit + mock-fs):

QUnit.module('Task Operations', {
  beforeEach() {
    mockFileSystem({
      '.kanbn': {
        'index.md': '# Kanbn\n\n## Column 1\n- task1\n\n## Column 2\n\n## Column 3\n',
        'tasks': {
          'task1.md': '# Task 1\nDescription'
        }
      }
    });
  },
  afterEach() {
    mockFileSystem.restore();
  }
});

QUnit.test('moves task between columns', function(assert) {
  const done = assert.async();
  
  kanbn().moveTask('task1', 'Column 2').then(() => {
    const indexContent = fs.readFileSync('.kanbn/index.md', 'utf8');
    assert.ok(!indexContent.match(/## Column 1[\s\S]*?task1/));
    assert.ok(indexContent.match(/## Column 2[\s\S]*?task1/));
    done();
  });
});

*/

// AFTER (Jest + real-fs):
describe('Task Operations', () => {
  let env;
  let testData;

  beforeEach(() => {
    env = createTestEnvironment('task-operations');
    testData = env.setup({
      countTasks: 1,
      columnNames: mapColumnNames(['Column 1', 'Column 2', 'Column 3']),
      tasksPerColumn: 1
    });
  });

  afterEach(() => {
    env.cleanup();
  });

  test('moves task between columns', async () => {
    // Get the first task ID from fixtures
    const tasks = Object.keys(testData.index.tasks);
    const taskId = tasks[0];
    
    await testData.kanbn.moveTask(taskId, 'In Progress');
    
    assertions.taskInColumn(testData.testDir, taskId, 'In Progress');
    assertions.taskInColumn(testData.testDir, taskId, 'Backlog', false);
  });
});

// =============================================================================
// EXAMPLE 5: Date Mocking Migration
// =============================================================================

/* BEFORE (QUnit + mock-fs):

const mockDate = require('mockdate');

QUnit.module('Date Operations', {
  beforeEach() {
    mockDate.set('2023-01-01');
    mockFileSystem({
      '.kanbn': {
        'index.md': '# Kanbn\n\n## Backlog\n',
        'tasks': {}
      }
    });
  },
  afterEach() {
    mockDate.reset();
    mockFileSystem.restore();
  }
});

QUnit.test('creates task with current date', function(assert) {
  const done = assert.async();
  
  kanbn().createTask('Dated Task').then(() => {
    const taskContent = fs.readFileSync('.kanbn/tasks/dated-task.md', 'utf8');
    assert.ok(taskContent.includes('2023-01-01'));
    done();
  });
});

*/

// AFTER (Jest + real-fs):
const mockDate = require('mockdate');

describe('Date Operations', () => {
  let env;
  let testData;

  beforeEach(() => {
    mockDate.set('2023-01-01');
    env = createTestEnvironment('date-operations');
    testData = env.setup({
      countTasks: 0,
      columnNames: ['Backlog']
    });
  });

  afterEach(() => {
    env.cleanup(); // This also calls mockDate.reset()
  });

  test('creates task with current date', async () => {
    await testData.kanbn.createTask('Dated Task');
    
    const fs = require('fs');
    const path = require('path');
    const taskPath = path.join(testData.testDir, '.kanbn', 'tasks', 'dated-task.md');
    const taskContent = fs.readFileSync(taskPath, 'utf8');
    
    expect(taskContent).toContain('2023-01-01');
  });
});

// =============================================================================
// EXAMPLE 6: Integration Test Migration
// =============================================================================

/* BEFORE (QUnit + mock-fs):

QUnit.module('Integration Tests', {
  beforeEach() {
    mockFileSystem({
      '.kanbn': {
        'index.md': '# Kanbn\n\n## Backlog\n- task1\n- task2\n\n## Done\n',
        'tasks': {
          'task1.md': '# Task 1\n',
          'task2.md': '# Task 2\n'
        }
      }
    });
  },
  afterEach() {
    mockFileSystem.restore();
  }
});

QUnit.test('complete workflow', function(assert) {
  const done = assert.async(3); // Multiple async operations
  
  const k = kanbn();
  
  k.createTask('New Task').then(() => {
    assert.ok(true, 'Task created');
    done();
    
    return k.moveTask('new-task', 'Done');
  }).then(() => {
    assert.ok(true, 'Task moved');
    done();
    
    return k.status();
  }).then(status => {
    assert.ok(status.includes('new-task'));
    done();
  });
});

*/

// AFTER (Jest + real-fs):
describe('Integration Tests', () => {
  let env;
  let testData;

  beforeEach(() => {
    env = createTestEnvironment('integration-tests');
    testData = env.setup({
      countTasks: 2,
      columnNames: ['Backlog', 'Done'],
      tasksPerColumn: 1
    });
  });

  afterEach(() => {
    env.cleanup();
  });

  test('complete workflow', async () => {
    const k = testData.kanbn;
    
    // Create task
    await k.createTask('New Task');
    assertions.taskExists(testData.testDir, 'new-task');
    
    // Move task
    await k.moveTask('new-task', 'Done');
    assertions.taskInColumn(testData.testDir, 'new-task', 'Done');
    
    // Check status
    const status = await k.status();
    expect(status).toContain('new-task');
  });
});

// =============================================================================
// EXAMPLE 7: Error Condition Testing Migration
// =============================================================================

/* BEFORE (QUnit + mock-fs):

QUnit.test('handles missing task file', function(assert) {
  const done = assert.async();
  
  mockFileSystem({
    '.kanbn': {
      'index.md': '# Kanbn\n\n## Backlog\n- missing-task\n',
      'tasks': {} // No task files
    }
  });
  
  kanbn().status().catch(error => {
    assert.ok(error.message.includes('missing'));
    done();
  });
});

*/

// AFTER (Jest + real-fs):
test('handles missing task file', async () => {
  const { kanbn, testDir, cleanup } = quickSetup('missing-task-test', {
    countTasks: 0,
    columnNames: ['Backlog']
  });
  
  try {
    // Manually create inconsistent state
    const fs = require('fs');
    const path = require('path');
    const indexPath = path.join(testDir, '.kanbn', 'index.md');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const modifiedIndex = indexContent.replace('## Backlog\n', '## Backlog\n- missing-task\n');
    fs.writeFileSync(indexPath, modifiedIndex);
    
    await assertions.expectError(
      kanbn.status(),
      /missing/
    );
  } finally {
    cleanup();
  }
});

module.exports = {
  // Export examples for reference
  statusCommandExample: 'See describe("Status Command")',
  asyncErrorExample: 'See test("handles uninitialized folder")',
  taskCreationExample: 'See test("creates new task")',
  complexOperationsExample: 'See describe("Task Operations")',
  dateMockingExample: 'See describe("Date Operations")',
  integrationExample: 'See describe("Integration Tests")',
  errorConditionExample: 'See test("handles missing task file")'
};