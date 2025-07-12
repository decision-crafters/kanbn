const fs = require('fs');
const path = require('path');
const realFs = require('../real-fs-fixtures');
const kanbnFactory = require('../../src/main');
const context = require('../jest-helpers');
require('../jest-helpers');

if (!fs.existsSync(path.join(__dirname, '../real-fs-fixtures'))) {
  fs.mkdirSync(path.join(__dirname, '../real-fs-fixtures'), { recursive: true });
}

describe('archive tests', () => {
  let testDir, originalCwd, kanbn;

  beforeEach(() => {
    const timestamp = Date.now();
    testDir = realFs.createFixtures(`archive-test-${timestamp}`, {
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

  test('Archive task in uninitialised folder should throw "not initialised" error', async () => {
    // Create a fresh directory without kanbn initialization
    const timestamp = Date.now();
    const uninitializedDir = realFs.createTestDirectory(`uninitialized-test-${timestamp}`);
    
    const originalCwd = process.cwd();
    process.chdir(uninitializedDir);
    
    const uninitializedKanbn = kanbnFactory();
    
    await expect(async () => {
      await uninitializedKanbn.archiveTask('task-1');
    }).toThrowAsync(/Not initialised in this folder/);
    
    process.chdir(originalCwd);
    realFs.cleanupFixtures(uninitializedDir);
  });

  test('Archive non-existent task should throw "task file not found" error', async () => {
    await expect(async () => {
      await kanbn.archiveTask('task-2');
    }).toThrowAsync(/No task file found with id "task-2"/);
  });

  test('Archive untracked task should throw "task not indexed" error', async () => {
    // Create a task file that's not in the index
    const fs = require('fs');
    const taskPath = path.join(testDir, '.kanbn', 'tasks', 'untracked-task.md');
    fs.writeFileSync(taskPath, '# Untracked Task\n\nThis task is not in the index.');

    await expect(async () => {
      await kanbn.archiveTask('untracked-task');
    }).toThrowAsync(/Task "untracked-task" is not in the index/);
  });

  test('Archive task with a duplicate already in the archive should throw "already archived" error', async () => {
    // Create an archived task file manually
    const fs = require('fs');
    const archivedTaskPath = path.join(testDir, '.kanbn', 'archive', 'task-1.md');
    fs.writeFileSync(archivedTaskPath, '# Task 1\n\nThis task is already archived.');

    // Try to archive a task that has a duplicate in the archive
    await expect(async () => {
      await kanbn.archiveTask('task-1');
    }).toThrowAsync(/An archived task with id "task-1" already exists/);
  });

  test('Archive a task', async () => {
    const BASE_PATH = await kanbn.getMainFolder();

    await kanbn.archiveTask('task-1');
    // Check archive folder exists
    expect(fs.existsSync(path.join(BASE_PATH, 'archive'))).toBe(true);
    // Check archived task file exists
    expect(fs.existsSync(path.join(BASE_PATH, 'archive', 'task-1.md'))).toBe(true);
    // Check original task file no longer exists
    context.taskFileExists(BASE_PATH, 'task-1', false);
  });
});
