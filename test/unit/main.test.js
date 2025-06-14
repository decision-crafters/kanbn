// test/unit/main.test.js
const mockRequire = require('mock-require');
let findTaskColumn, taskCompleted, sortTasks, renameTaskInIndex;

describe('main wrapper tests', () => {
  beforeAll(() => {
    // Stub task-utils
    mockRequire(require.resolve('../../src/lib/task-utils'), {
      findTaskColumn: (idx, id) => 'stub-col',
      taskCompleted: (idx, task) => true,
      renameTaskInIndex: (idx, id, newId) => 'renamed-id'
    });
    // Stub index-utils
    mockRequire(require.resolve('../../src/lib/index-utils'), {
      sortTasks: (tasks, sorters) => ['stub-task']
    });
    // Import wrappers after stubbing
    ({ findTaskColumn, taskCompleted, sortTasks, renameTaskInIndex } = require('../../src/main'));
  });
  afterAll(() => {
    // Remove all mocks
    mockRequire.stopAll();
  });

  test('findTaskColumn should delegate to task-utils', () => {
    const result = findTaskColumn({ columns: {} }, 'task-1');
    expect(result).toBe('stub-col');
  });

  test('taskCompleted should delegate to task-utils', () => {
    const result = taskCompleted({}, { id: 'task-2' });
    expect(result).toBe(true);
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
