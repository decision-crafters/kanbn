const mockFileSystem = require('mock-fs');
const kanbnFactory = require('../../src/main');
let kanbn;
const context = require('../context-jest');

describe('renameTask tests', () => {
  beforeEach(() => {
    require('../fixtures')({
      countColumns: 1,
      countTasks: 2
    });
    kanbn = kanbnFactory();
  });

  // mockFs restore handled in Jest setup

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
  const BASE_PATH = await kanbn.getMainFolder();
  const currentDate = new Date().toISOString();
  await kanbn.renameTask('task-1', 'task-3');

  // Verify that the task was renamed
  context.indexHasTask(BASE_PATH, 'task-3');
  context.indexHasTask(BASE_PATH, 'task-1', null, false);

  // Verify that the file was renamed
  context.taskFileExists(BASE_PATH, 'task-3');
  context.taskFileExists(BASE_PATH, 'task-1', false);

  const task = await kanbn.getTask('task-3');
  expect(task.metadata.updated.toISOString().substr(0, 9)).toBe(currentDate.substr(0, 9));
});

});
