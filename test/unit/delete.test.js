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

describe('deleteTask tests', () => {
  let testDir, originalCwd, kanbn;

  beforeEach(() => {
    const timestamp = Date.now();
    testDir = realFs.createFixtures(`delete-test-${timestamp}`, {
      countColumns: 3,
      countTasks: 10
    }).testDir;
    
    originalCwd = process.cwd();
    process.chdir(testDir);
    
    kanbn = kanbnFactory();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    realFs.cleanupFixtures(testDir);
  });

  test('Delete task in uninitialised folder should throw "not initialised" error', async () => {
    const { kanbn: testKanbn, cleanup } = quickSetup('delete-uninit-test', { countTasks: 0 });
    try {
      await expect(async () => {
        await testKanbn.deleteTask('task-1', {});
      }).toThrowAsync(/Not initialised in this folder/);
    } finally {
      cleanup();
    }
  });

  test('Delete non-existent task should throw "task not indexed" error', async () => {
    await expect(async () => {
      await kanbn.deleteTask('task-11', {});
    }).toThrowAsync(/Task "task-11" is not in the index/);
  });

  test('Delete an untracked task should throw "task not indexed" error', async () => {
    // Create untracked task file
    const { kanbn: testKanbn, testDir, cleanup } = quickSetup('delete-untracked-test', { countTasks: 0 });
    try {
      // Create an untracked task file
      const fs = require('fs');
      const path = require('path');
      fs.writeFileSync(path.join(testDir, '.kanbn', 'tasks', 'test-task.md'), '# Test Task');

      await expect(async () => {
        await testKanbn.deleteTask('test-task', {});
      }).toThrowAsync(/Task "test-task" is not in the index/);
    } finally {
      cleanup();
    }
  });

  test('Delete a task from the index but leave the file', async () => {
    await kanbn.deleteTask('task-1', false);

    // Verify that the task was removed from the index
    const BASE_PATH = await kanbn.getMainFolder();
    context.indexHasTask(BASE_PATH, 'task-1', null, false);

    // Verify that the task file still exists
    context.taskFileExists(BASE_PATH, 'task-1');
  });

  test('Delete a task from the index and remove the file', async () => {
    await kanbn.deleteTask('task-1', true);

    // Verify that the task was removed from the index
    const BASE_PATH = await kanbn.getMainFolder();
    context.indexHasTask(BASE_PATH, 'task-1', null, false);

    // Verify that the task file no longer exists
    context.taskFileExists(BASE_PATH, 'task-1', false);
  });
});
