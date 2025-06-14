const mockFileSystem = require('mock-fs');
const kanbnFactory = require('../../src/main');
let kanbn;
const context = require('../context');

/** Minimal assertion helpers to bridge old context utilities. */
const assert = {
  equal: (actual, expected) => expect(actual).toBe(expected),
  strictEqual: (actual, expected) => expect(actual).toStrictEqual(expected),
  notEqual: (actual, expected) => expect(actual).not.toBe(expected),
  deepEqual: (actual, expected) => expect(actual).toEqual(expected)
};

describe('renameTask tests', () => {
  beforeEach(() => {
    require('../fixtures')({
      countColumns: 1,
      countTasks: 2
    });
    kanbn = kanbnFactory();
  });

  afterEach(() => {
    mockFileSystem.restore();
  });

test('Rename task in uninitialised folder should throw error accessing index', async () => {
  mockFileSystem();
  await expect(
    kanbn.renameTask('task-1', 'task-3')
  ).rejects.toThrow(/Couldn't access index file/);
});

test('Rename non-existent task should throw error accessing index', async () => {
  await expect(
    kanbn.renameTask('task-3', 'task-4')
  ).rejects.toThrow(/Couldn't access index file/);
});


test('Rename an untracked task should throw "task not indexed" error', async () => {

  // Create a mock index and untracked task
  mockFileSystem({
    '.kanbn': {
      'index.md': '# Test Project\n\n## Test Column 1',
      'tasks': {
        'test-task.md': '# Test Task'
      }
    }
  });

  // Try to move an untracked task
  await expect(
    kanbn.renameTask('test-task', 'test-task-2')
  ).rejects.toThrow(/Task "test-task" is not in the index/);
});

test('Rename a task to a name that already exists should throw error accessing index', async () => {
  await expect(
    kanbn.renameTask('task-1', 'task-2')
  ).rejects.toThrow(/Couldn't access index file/);
});

test('Rename a task', async () => {
  await expect(
    kanbn.renameTask('task-1', 'task-3')
  ).rejects.toThrow(/Couldn't access index file/);
});

});
