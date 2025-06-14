// test/unit/main.test.js
jest.mock('../../src/lib/task-utils', () => ({
  findTaskColumn: jest.fn(() => 'stub-col'),
  taskCompleted: jest.fn(() => true),
  renameTaskInIndex: jest.fn(() => 'renamed-id'),
}));

jest.mock('../../src/lib/index-utils', () => ({
  sortTasks: jest.fn(() => ['stub-task']),
}));

let findTaskColumn, taskCompleted, sortTasks, renameTaskInIndex;

describe('main wrapper tests', () => {
  beforeAll(() => {
    // Import wrappers after jest.mock stubs are in place
    ({ findTaskColumn, taskCompleted, sortTasks, renameTaskInIndex } = require('../../src/main'));
  });

  afterAll(() => {
    // Reset any mocked modules
    jest.resetModules();
    jest.clearAllMocks();
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
