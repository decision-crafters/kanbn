const fs = require('fs');
const path = require('path');
const { quickSetup } = require('../migration-utils');
const realFs = require('../real-fs-fixtures');
const kanbnFactory = require('../../src/main');
const context = require('../context-jest');
require('../jest-helpers');

if (!fs.existsSync(path.join(__dirname, '../real-fs-fixtures'))) {
  fs.mkdirSync(path.join(__dirname, '../real-fs-fixtures'), { recursive: true });
}

describe('comment tests', () => {
  let testDir, originalCwd, kanbn;

  beforeEach(() => {
    const timestamp = Date.now();
    testDir = realFs.createFixtures(`comment-test-${timestamp}`, {
      countColumns: 1,
      countTasks: 1
    }).testDir;
    
    originalCwd = process.cwd();
    process.chdir(testDir);
    
    kanbn = kanbnFactory();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    realFs.cleanupFixtures(testDir);
  });

  test('Add comment to task in uninitialised folder should throw "not initialised" error', async () => {
    const { kanbn: testKanbn, cleanup } = quickSetup('comment-uninit-test', { countTasks: 0 });
    try {
      await expect(async () => {
        await testKanbn.comment('task-1', '', '');
      }).toThrowAsync(/Not initialised in this folder/);
    } finally {
      cleanup();
    }
  });

  test('Add comment to non-existent task should throw "task file not found" error', async () => {
    await expect(async () => {
      await kanbn.comment('task-2', '', '');
    }).toThrowAsync(/No task file found with id "task-2"/);
  });

  test('Add comment to an untracked task should throw "task not indexed" error', async () => {
    // Create a mock index and untracked task
    const { kanbn: testKanbn, testDir, cleanup } = quickSetup('comment-untracked-test', { countTasks: 0 });
    try {
      // Create an untracked task file
      const fs = require('fs');
      const path = require('path');
      fs.writeFileSync(path.join(testDir, '.kanbn', 'tasks', 'test-task.md'), '# Test Task');

      await expect(async () => {
        await testKanbn.comment('test-task', '', '');
      }).toThrowAsync(/Task "test-task" is not in the index/);
    } finally {
      cleanup();
    }
  });

  test('Add a comment with blank text throw "blank text" error', async () => {
    await expect(async () => {
      await kanbn.comment('task-1', '', '');
    }).toThrowAsync(/Comment text cannot be empty/);
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
    context.taskHasComments(BASE_PATH, 'task-1', [{
      text: TEST_TEXT,
      author: TEST_AUTHOR,
      date: currentDate
    }]);
  });
});
