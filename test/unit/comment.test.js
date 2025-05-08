const mockFileSystem = require('mock-fs');
const kanbn = require('../../src/main');
const context = require('../context');

describe('comment tests', () => {
  beforeAll(() => {
    require('../qunit-throws-async');
  
  });
  },
  afterEach() {
    mockFileSystem.restore();
  }
});

  test('Add comment to task in uninitialised folder should throw ', not initialised" error', async assert => {
  mockFileSystem();
  await expect(async () => {
      await kanbn.comment('task-1').toThrowAsync('', '');
    },
    /Not initialised in this folder/
  );
});

  test('Add comment to non-existent task should throw ', task file not found" error', async assert => {
  await expect(async () => {
      await kanbn.comment('task-2').toThrowAsync('', '');
    },
    /No task file found with id "task-2"/
  );
});

  test('Add comment to an untracked task should throw ', task not indexed" error', async assert => {

  // Create a mock index and untracked task
  mockFileSystem({
    '.kanbn': {
      'index.md': '# Test Project\n\n## Test Column 1',
      'tasks': {
        'test-task.md': '# Test Task'
      }
    }
  });

  // Try to add a comment to an untracked task
  await expect(async () => {
      await kanbn.comment('test-task').toThrowAsync('', '');
    },
    /Task "test-task" is not in the index/
  );
});

  test('Add a comment with blank text throw ', blank text" error', async assert => {
  await expect(async () => {
      await kanbn.comment('task-1').toThrowAsync('', '');
    },
    /Comment text cannot be empty/
  );
});

  test('Add a comment to a task', async () => {
  const BASE_PATH = await kanbn.getMainFolder();
  const TEST_TEXT = 'Test comment...';
  const TEST_AUTHOR = 'Test Author';

  // Get the first task
  let task = await kanbn.getTask('task-1');

  // Add comment to task
  const currentDate = new Date();
  await kanbn.comment('task-1', TEST_TEXT, TEST_AUTHOR);

  // Verify that the task file was updated
  context.taskHasComments(assert, BASE_PATH, 'task-1', [{
    text: TEST_TEXT,
    author: TEST_AUTHOR,
    date: currentDate
  }]);
});

});\