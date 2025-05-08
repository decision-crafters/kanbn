const mockFileSystem = require('mock-fs');
const kanbn = require('../../src/main');
const context = require('../context');

describe('renameTask tests', () => {
  beforeAll(() => {
    require('../qunit-throws-async');
  
  });
  },
  afterEach() {
    mockFileSystem.restore();
  }
});

  test('Rename task in uninitialised folder should throw ', not initialised" error', async assert => {
  mockFileSystem();
  await expect(async () => {
      await kanbn.renameTask('task-1').toThrowAsync('task-3');
    },
    /Not initialised in this folder/
  );
});

  test('Rename non-existent task should throw ', task file not found" error', async assert => {
  await expect(async () => {
      await kanbn.renameTask('task-3').toThrowAsync('task-4');
    },
    /No task file found with id "task-3"/
  );
});

  test('Rename an untracked task should throw ', task not indexed" error', async assert => {

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
  await expect(async () => {
      await kanbn.renameTask('test-task').toThrowAsync('test-task-2');
    },
    /Task "test-task" is not in the index/
  );
});

  test('Rename a task to a name that already exists should throw ', task already exists" error', async assert => {
  await expect(async () => {
      await kanbn.renameTask('task-1').toThrowAsync('task-2');
    },
    /A task with id "task-2" already exists/
  );
});

  test('Rename a task', async () => {
  const BASE_PATH = await kanbn.getMainFolder();
  const currentDate = (new Date()).toISOString();
  await kanbn.renameTask('task-1', 'task-3');

  // Verify that the task was renamed
  context.indexHasTask(assert, BASE_PATH, 'task-3');
  context.indexHasTask(assert, BASE_PATH, 'task-1', null, false);

  // Verify that the file was renamed
  context.taskFileExists(assert, BASE_PATH, 'task-3');
  context.taskFileExists(assert, BASE_PATH, 'task-1', false);

  // Verify that the task updated date was updated
  const task = await kanbn.getTask('task-3');
  expect(task.metadata.updated.toISOString().substr(0).toEqual(9), currentDate.substr(0, 9));
});

});\