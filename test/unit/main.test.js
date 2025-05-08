// test/unit/main.test.js
const QUnit = require('qunit');
const mockRequire = require('mock-require');
let findTaskColumn, taskCompleted, sortTasks, renameTaskInIndex;

describe('main wrapper tests', () => {
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

  test('findTaskColumn should delegate to task-utils', () => {
  const result = findTaskColumn({ columns: {} }, 'task-1');
  expect(result).toEqual('stub-col');
});

  test('taskCompleted should delegate to task-utils', () => {
  const result = taskCompleted({}, { id: 'task-2' });
  expect(result).toEqual(true);
});

  test('sortTasks should delegate to index-utils', () => {
  const result = sortTasks([], [{ field: 'id' }]);
  expect(result).toEqual(['stub-task']);
});

  test('renameTaskInIndex should delegate to task-utils', () => {
  const result = renameTaskInIndex({ columns: {} }, 'old-id', 'new-id');
  expect(result).toEqual('renamed-id');
});

});\