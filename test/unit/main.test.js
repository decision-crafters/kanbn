// test/unit/main.test.js

const mockRequire = require('mock-require');
let findTaskColumn, sortTasks, renameTaskInIndex;

describe('main wrapper tests', () => {
  beforeAll(() => {
    // Stub task-utils
    mockRequire('../../src/lib/task-utils', {
      findTaskColumn: (_idx, _id) => 'stub-col',
      taskCompleted: (_idx, _task) => true,
      renameTaskInIndex: (_idx, _id, _newId) => 'renamed-id'
    });
    // Stub index-utils
    mockRequire('../../src/lib/index-utils', {
      sortTasks: (_tasks, _sorters) => ['stub-task']
    });
    // Import wrappers after stubbing
    ({ findTaskColumn, sortTasks, renameTaskInIndex } = require('../../src/main'));
  });
  
  afterAll(() => {
    // Remove all mocks
    mockRequire.stopAll();
  });

  test('findTaskColumn should delegate to task-utils', () => {
    const result = findTaskColumn({ columns: {} }, 'task-1');
    expect(result).toBe('stub-col');
  });

  test('sortTasks should delegate to index-utils', () => {
    const result = sortTasks([], [{ field: 'id' }]);
    expect(result).toEqual(['stub-task']);
  });

  test('renameTaskInIndex should delegate to task-utils', () => {
    const result = renameTaskInIndex({ columns: {} }, 'old-id', 'new-id');
    expect(result).toBe('renamed-id');
  });
});
