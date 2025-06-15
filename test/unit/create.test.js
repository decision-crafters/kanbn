const mockFileSystem = require('mock-fs');
const fs = require('fs');
const path = require('path');
const kanbnFactory = require('../../src/main');
const context = require('../jest-helpers');
let kanbn;

describe('createTask tests', () => {
  let fixtures;
  let originalCwd;
  let testDir;
  
  beforeEach(() => {
    originalCwd = process.cwd();
    fixtures = require('../fixtures')({
      countColumns: 4,
      countTasks: 5,
      options: {
        startedColumns: ['Column 2'],
        completedColumns: ['Column 4']
      }
    });
    testDir = fixtures.testPath;
    process.chdir(testDir);
    // Create kanbn instance with explicit root path to ensure correct file operations
    kanbn = kanbnFactory(testDir);
  });
  
  afterEach(() => {
    process.chdir(originalCwd);
  });

  // mockFs restore handled in Jest setup

  test('Create task in uninitialised folder should throw "not initialised" error', async () => {
    // Change to a directory without .kanbn folder
    const originalCwd = process.cwd();
    const tempDir = require('os').tmpdir();
    process.chdir(tempDir);
    
    try {
      const uninitializedKanbn = kanbnFactory();
      await expect(
        uninitializedKanbn.createTask({ name: 'Uninit task' }, 'Backlog')
      ).rejects.toThrow(/Not initialised in this folder/);
    } finally {
      process.chdir(originalCwd);
    }
  });

test('Create task with no options or blank name should throw "blank name" error', async () => {
  // Create a task with no options
  await expect(
    kanbn.createTask({}, 'Column 1')
  ).rejects.toThrow(/Task name cannot be blank/);

  // Create a task with an empty name
  await expect(
    kanbn.createTask({ name: '' }, 'Column 1')
  ).rejects.toThrow(/Task name cannot be blank/);
});

test('Create task in non-existent column should throw "column not found" error', async () => {
  const NON_EXISTENT_COLUMN = 'Wibble';
  await expect(
    kanbn.createTask({ name: 'Column test task' }, NON_EXISTENT_COLUMN)
  ).rejects.toThrow(new RegExp(`Column "${NON_EXISTENT_COLUMN}" doesn't exist`));
});

test('Create task with id that corresponds to an untracked task file should throw "task already exists" error', async () => {
  const TASK_ID = 'untracked-task';
  const TASK_NAME = 'Untracked task';

  // Create an untracked task file
  await fs.promises.writeFile(
    path.join(process.cwd(), `.kanbn/tasks/${TASK_ID}.md`),
    '# Test task'
  );

  // Try to create a task with the same id
  await expect(
    kanbn.createTask({ name: TASK_NAME }, 'Column 1')
  ).rejects.toThrow(new RegExp(`A task with id "${TASK_ID}" already exists`));
});

test('Create task with id that already exists in the index should throw "task already indexed" error', async () => {
  // Get the first task from fixtures and try to create a task with the same name
  const firstTask = fixtures.tasks[0];
  const TASK_NAME = firstTask.name; // Use the exact same name to trigger the duplicate error
  const TASK_ID = require('../../src/utility').getTaskId(TASK_NAME);

  // Try to create a task with a duplicate index entry
  await expect(
    kanbn.createTask({ name: TASK_NAME }, 'Column 1')
  ).rejects.toThrow(new RegExp(`A task with id "${TASK_ID}" is already in the index`));
});

test('Create task', async () => {
  console.log(`[DEBUG] === BEFORE createTask ===`);
  console.log(`[DEBUG] Current working directory: ${process.cwd()}`);
  console.log(`[DEBUG] kanbn.ROOT: ${kanbn.ROOT}`);
  console.log(`[DEBUG] testDir: ${testDir}`);
  
  // Use the current working directory (which should be testDir) instead of getMainFolder()
  const BASE_PATH = path.join(process.cwd(), '.kanbn');
  console.log(`[DEBUG] BASE_PATH (cwd + .kanbn): ${BASE_PATH}`);
  
  // Check initial state
  const indexPath = path.join(BASE_PATH, 'index.md');
  console.log(`[DEBUG] Index file exists BEFORE createTask: ${fs.existsSync(indexPath)}`);
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    console.log(`[DEBUG] Index content BEFORE createTask (first 200 chars): ${indexContent.substring(0, 200)}`);
  }
  
  console.log(`[DEBUG] === CALLING createTask ===`);
  const TASK_ID = await kanbn.createTask({ name: 'New task' }, 'Column 1');
  console.log(`[DEBUG] === AFTER createTask ===`);
  console.log(`[DEBUG] Created task ID: ${TASK_ID}`);
  
  // Check if files exist after createTask
  console.log(`[DEBUG] Index file exists AFTER createTask: ${fs.existsSync(indexPath)}`);
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    console.log(`[DEBUG] Index content AFTER createTask (first 200 chars): ${indexContent.substring(0, 200)}`);
    console.log(`[DEBUG] Index contains task ID ${TASK_ID}: ${indexContent.includes(TASK_ID)}`);
  }
  
  const taskPath = path.join(BASE_PATH, 'tasks', `${TASK_ID}.md`);
  console.log(`[DEBUG] Task file exists AFTER createTask: ${fs.existsSync(taskPath)}`);
  if (fs.existsSync(taskPath)) {
    const taskContent = fs.readFileSync(taskPath, 'utf8');
    console.log(`[DEBUG] Task file content (first 100 chars): ${taskContent.substring(0, 100)}`);
  }
  
  console.log(`[DEBUG] === CALLING context functions ===`);
  context.taskFileExists(BASE_PATH, TASK_ID);
  context.indexHasTask(BASE_PATH, TASK_ID, 'Column 1');
});

test('Create task in a started column should update the started date', async () => {
  const TASK_ID = await kanbn.createTask({ name: 'Started task' }, 'Column 2');

  // Verify that the task has a started date that matches the created date
  const task = await kanbn.getTask(TASK_ID);
  expect(task.metadata.started.toISOString()).toBe(task.metadata.created.toISOString());
});

test('Create task in a completed column should update the completed date', async () => {
  const TASK_ID = await kanbn.createTask({ name: 'Completed task' }, 'Column 4');

  // Verify that the task has a completed date that matches the created date
  const task = await kanbn.getTask(TASK_ID);
  expect(task.metadata.completed.toISOString()).toBe(task.metadata.created.toISOString());
});

});
