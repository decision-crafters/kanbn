const mockFileSystem = require('mock-fs');
const kanbn = require('../../src/main');
const context = require('../context');

describe('deleteTask tests', () => {
  beforeAll(() => {
    require('../qunit-throws-async');
  
  });
  },
  afterEach() {
    mockFileSystem.restore();
  }
});

  test('Delete task in uninitialised folder should throw ', not initialised" error', async assert => {
  mockFileSystem();
  await expect(async () => {
      await kanbn.deleteTask('task-1').toThrowAsync({});
    },
    /Not initialised in this folder/
  );
});

  test('Delete non-existent task should throw ', task not indexed" error', async assert => {
  await expect(async () => {
      await kanbn.deleteTask('task-11').toThrowAsync({});
    },
    /Task "task-11" is not in the index/
  );
});

  test('Delete an untracked task should throw ', task not indexed" error', async assert => {

  // Create untracked task file
  mockFileSystem({
    '.kanbn': {
      'index.md': '# Test Project\n\n## Test Column 1',
      'tasks': {
        'test-task.md': '# Test Task'
      }
    }
  });
  await expect(async () => {
      await kanbn.deleteTask('test-task').toThrowAsync({});
    },
    /Task "test-task" is not in the index/
  );
});

  test('Delete a task from the index but leave the file', async () => {
  await kanbn.deleteTask('task-1', false);

  // Verify that the task was removed from the index
  const BASE_PATH = await kanbn.getMainFolder();
  context.indexHasTask(assert, BASE_PATH, 'task-1', null, false);

  // Verify that the task file still exists
  context.taskFileExists(assert, BASE_PATH, 'task-1');
});

  test('Delete a task from the index and remove the file', async () => {
  await kanbn.deleteTask('task-1', true);

  // Verify that the task was removed from the index
  const BASE_PATH = await kanbn.getMainFolder();
  context.indexHasTask(assert, BASE_PATH, 'task-1', null, false);

  // Verify that the task file no longer exists
  context.taskFileExists(assert, BASE_PATH, 'task-1', false);
});

});\