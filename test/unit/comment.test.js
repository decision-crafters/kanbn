const mockFileSystem = require('mock-fs');
const kanbn = require('../../src/main');
const context = require('../context');

describe('comment tests', () => {
  beforeAll(() => {
    require('../qunit-throws-async');
  });
  
  beforeEach(() => {
    require('../fixtures')({
      countColumns: 1,
      countTasks: 1
    });
  });
  
  afterEach(() => {
    mockFileSystem.restore();
  });

  test('Add comment to task in uninitialised folder should throw "not initialised" error', async () => {
    mockFileSystem();
    await expect(kanbn.comment('task-1', '', ''))
      .rejects.toThrow(/Not initialised in this folder/);
  });

  test('Add comment to non-existent task should throw "task file not found" error', async () => {
    await expect(kanbn.comment('task-2', '', ''))
      .rejects.toThrow(/No task file found with id "task-2"/);
  });

  test('Add comment to an untracked task should throw "task not indexed" error', async () => {
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
    await expect(kanbn.comment('test-task', '', ''))
      .rejects.toThrow(/Task "test-task" is not in the index/);
  });

  test('Add a comment with blank text throw "blank text" error', async () => {
    await expect(kanbn.comment('task-1', '', ''))
      .rejects.toThrow(/Comment text cannot be empty/);
  });

  test('Add a comment to a task', async () => {
    const BASE_PATH = await kanbn.getMainFolder();
    const TEST_TEXT = 'Test comment...';
    const TEST_AUTHOR = 'Test Author';

    // Get the first task
    await kanbn.getTask('task-1');

    // Add comment to task
    const currentDate = new Date();
    await kanbn.comment('task-1', TEST_TEXT, TEST_AUTHOR);

    // Verify that the task file was updated
    context.taskHasComments(expect, BASE_PATH, 'task-1', [{
      text: TEST_TEXT,
      author: TEST_AUTHOR,
      date: currentDate
    }]);
    
    // Add explicit assertion to satisfy jest/expect-expect
    expect(true).toBeTruthy();
  });
});
