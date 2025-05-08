const mockFileSystem = require('mock-fs');
const fs = require('fs');
const path = require('path');
const Kanbn = require('../../src/main');
const context = require('../context');

describe('createTask tests', () => {
  let kanbn;
  
  beforeEach(() => {
    mockFileSystem();
    kanbn = Kanbn();
  });
  
  afterEach(() => {
    mockFileSystem.restore();
  });

  test('Create task in uninitialised folder should throw "not initialised" error', async () => {
    await expect(async () => {
      await kanbn.createTask({ name: 'Test name' }, 'Backlog');
    }).rejects.toThrow(/Not initialised in this folder/);
  });

  test('Create task with no options or blank name should throw "blank name" error', async () => {
    await kanbn.initialise();

    // Create a task with no options
    await expect(async () => {
      await kanbn.createTask({}, 'Backlog');
    }).rejects.toThrow(/Task name cannot be blank/);

    // Create a task with an empty name
    await expect(async () => {
      await kanbn.createTask({ name: '' }, 'Backlog');
    }).rejects.toThrow(/Task name cannot be blank/);
  });

  test('Create task in non-existent column should throw "column not found" error', async () => {
    const NON_EXISTENT_COLUMN = 'Wibble';
    await kanbn.initialise();
    
    await expect(async () => {
      await kanbn.createTask({ name: 'Test name' }, NON_EXISTENT_COLUMN);
    }).rejects.toThrow(new RegExp(`Column "${NON_EXISTENT_COLUMN}" doesn't exist`));
  });

  test('Create task with id that already exists as an untracked task should throw "task already exists" error', async () => {
    const TASK_ID = 'test-name';
    const TASK_NAME = 'Test name';
    await kanbn.initialise();

    // Create a task file without adding it to the index
    await fs.promises.writeFile(
      path.join(process.cwd(), `.kanbn/tasks/${TASK_ID}.md`),
      'Hello, world!'
    );

    // Try to create a task with a duplicate filename
    await expect(async () => {
      await kanbn.createTask({ name: TASK_NAME }, 'Backlog');
    }).rejects.toThrow(new RegExp(`A task with id "${TASK_ID}" already exists`));
  });

  test('Create task with id that already exists in the index should throw "task already indexed" error', async () => {
    const TASK_ID = 'test-name';
    const TASK_NAME = 'Test name';
    await kanbn.initialise();

    // Re-write the index file to contain the task without creating a file
    await fs.promises.writeFile(
      path.join(process.cwd(), '.kanbn/index.md'),
      `# Project title\n\n## Backlog\n\n- [${TASK_ID}](tasks\\${TASK_ID}.md)`
    );

    // Try to create a task with a duplicate index entry
    await expect(async () => {
      await kanbn.createTask({ name: TASK_NAME }, 'Backlog');
    }).rejects.toThrow(new RegExp(`A task with id "${TASK_ID}" is already in the index`));
  });

  test('Create task', async () => {
    await kanbn.initialise();
    const TASK_ID = await kanbn.createTask({ name: 'Test name' }, 'Backlog');

    // Verify that the file exists and is indexed
    const BASE_PATH = await kanbn.getMainFolder();
    
    // Adapt context helper functions to work with Jest
    const taskExists = context.taskFileExists({ ok: expect }, BASE_PATH, TASK_ID);
    const indexHasTask = context.indexHasTask({ ok: expect }, BASE_PATH, TASK_ID, 'Backlog');
    
    expect(taskExists).toBeTruthy();
    expect(indexHasTask).toBeTruthy();
  });

  test('Create task in a started column should update the started date', async () => {
    await kanbn.initialise();
    const TASK_ID = await kanbn.createTask({ name: 'Test name' }, 'In Progress');

    // Verify that the task has a started date that matches the created date
    const task = await kanbn.getTask(TASK_ID);
    expect(task.metadata.started.toISOString()).toEqual(task.metadata.created.toISOString());
  });

  test('Create task in a completed column should update the completed date', async () => {
    await kanbn.initialise();
    const TASK_ID = await kanbn.createTask({ name: 'Test name' }, 'Done');

    // Verify that the task has a completed date that matches the created date
    const task = await kanbn.getTask(TASK_ID);
    expect(task.metadata.completed.toISOString()).toEqual(task.metadata.created.toISOString());
  });
});
