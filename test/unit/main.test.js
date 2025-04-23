// test/unit/main.test.js
const QUnit = require('qunit');
const mockRequire = require('mock-require');
let findTaskColumn, taskCompleted, sortTasks, renameTaskInIndex;

QUnit.module('main wrapper tests', {
  before: () => {
    // Stub task-utils
    mockRequire('../../src/lib/task-utils', {
      findTaskColumn: (idx, id) => 'stub-col',
      taskCompleted: (idx, task) => true,
      renameTaskInIndex: (idx, id, newId) => 'renamed-id'
    });
    // Stub index-utils
    mockRequire('../../src/lib/index-utils', {
      sortTasks: (tasks, sorters) => ['stub-task']
    });
    // Import wrappers after stubbing
    ({ findTaskColumn, taskCompleted, sortTasks, renameTaskInIndex } = require('../../src/main'));
  },
  after: () => {
    // Remove all mocks
    mockRequire.stopAll();
  }
});

QUnit.test('findTaskColumn should delegate to task-utils', assert => {
  const result = findTaskColumn({ columns: {} }, 'task-1');
  assert.equal(result, 'stub-col', 'Wrapper returns stubbed column');
});

QUnit.test('taskCompleted should delegate to task-utils', assert => {
  const result = taskCompleted({}, { id: 'task-2' });
  assert.equal(result, true, 'Wrapper returns stubbed completion');
});

QUnit.test('sortTasks should delegate to index-utils', assert => {
  const result = sortTasks([], [{ field: 'id' }]);
  assert.deepEqual(result, ['stub-task'], 'Wrapper returns stubbed sorted list');
});

QUnit.test('renameTaskInIndex should delegate to task-utils', assert => {
  const result = renameTaskInIndex({ columns: {} }, 'old-id', 'new-id');
  assert.equal(result, 'renamed-id', 'Wrapper returns stubbed renamed ID');
});
