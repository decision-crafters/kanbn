const fs = require('fs');
const path = require('path');
const realFs = require('../real-fs-fixtures');
const kanbnFactory = require('../../src/main');
const mockDate = require('mockdate');

if (!fs.existsSync(path.join(__dirname, '../real-fs-fixtures'))) {
  fs.mkdirSync(path.join(__dirname, '../real-fs-fixtures'), { recursive: true });
}

describe('moveTask tests', () => {
  beforeEach(() => {
    const timestamp = Date.now();
    this.testDir = realFs.createFixtures(`move-test-${timestamp}`, {
      countColumns: 4,
      countTasks: 17,
      tasksPerColumn: 5,
      options: {
        startedColumns: ['Column 2'],
        completedColumns: ['Column 3']
      }
    }).testDir;
    
    this.originalCwd = process.cwd();
    process.chdir(this.testDir);
    this.kanbn = kanbnFactory();
  });

  afterEach(() => {
    process.chdir(this.originalCwd);
    realFs.cleanupFixtures(this.testDir);
  });

  test('Move task in uninitialised folder should throw "not initialised" error', async () => {
    const emptyDir = path.join(this.testDir, 'empty');
    fs.mkdirSync(emptyDir);
    process.chdir(emptyDir);

    await expect(this.kanbn.moveTask('task-1', 'Column 2')).rejects.toThrow('Not initialised in this folder');

    process.chdir(this.testDir);
  });

  test('Move non-existent task should throw "task file not found" error', async () => {
    await expect(this.kanbn.moveTask('task-18', 'Column 2')).rejects.toThrow(/No task file found with id "task-18"/);
  });

  test('Move an untracked task should throw "task not indexed" error', async () => {
    // Create a test directory with an untracked task
    const untrackedDir = path.join(this.testDir, 'untracked');
    fs.mkdirSync(path.join(untrackedDir, '.kanbn', 'tasks'), { recursive: true });

    // Create a simple index file
    fs.writeFileSync(
      path.join(untrackedDir, '.kanbn', 'index.md'),
      '# Test Project\n\n## Test Column 1'
    );

    // Create an untracked task file
    fs.writeFileSync(
      path.join(untrackedDir, '.kanbn', 'tasks', 'test-task.md'),
      '# Test Task'
    );

    process.chdir(untrackedDir);
    const untrackedKanbn = kanbnFactory();

    await expect(untrackedKanbn.moveTask('test-task', 'Test Column 1')).rejects.toThrow('Task "test-task" is not in the index');

    process.chdir(this.testDir);
  });

  test('Move a task to a non-existent column should throw "column not found" error', async () => {
    await expect(this.kanbn.moveTask('task-1', 'Column 5')).rejects.toThrow("Column \"Column 5\" doesn't exist");
  });

  test('Move a task', async () => {
    const BASE_PATH = await this.kanbn.getMainFolder();
    const currentDate = (new Date()).toISOString();
    await this.kanbn.moveTask('task-1', 'Column 2');

    // Verify that the task was moved
    const index = await this.kanbn.getIndex();
    expect(index.columns['Column 2'].includes('task-1')).toBeTruthy();
    expect(index.columns['Column 1'].includes('task-1')).toBeFalsy();

    // Verify that the task updated date was updated
    const task = await this.kanbn.getTask('task-1');
    expect(task.metadata.updated.toISOString().substr(0, 9)).toBe(currentDate.substr(0, 9));
  });

  test('Move a task into a started column should update the started date', async () => {
    const currentDate = (new Date()).toISOString();
    await this.kanbn.moveTask('task-1', 'Column 2');

    // Verify that the task was moved
    const index = await this.kanbn.getIndex();
    expect(index.columns['Column 2'].includes('task-1')).toBeTruthy();
    expect(index.columns['Column 1'].includes('task-1')).toBeFalsy();

    // Verify that the task started date was updated
    const task = await this.kanbn.getTask('task-1');
    expect(task.metadata.started.toISOString().substr(0, 9)).toBe(currentDate.substr(0, 9));
  });

  test('Move a task into a completed column should update the completed date', async () => {
    const currentDate = (new Date()).toISOString();
    await this.kanbn.moveTask('task-1', 'Column 3');
  // Move the task again
  mockDate.set(TEST_DATE_2);
  await customKanbn.moveTask('task-1', 'Column 3');

  // Verify that the task's metadata property was updated again
  task = await customKanbn.getTask('task-1');
  expect(task.metadata.test.toISOString(), TEST_DATE_2);
  
  process.chdir(this.testDir);
  
  realFs.cleanupFixtures(fixtures.testDir);
});

test('Move a task to an absolute position in the same column', async () => {
  await this.kanbn.moveTask('task-1', 'Column 1', -1);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 1', 0);

  await this.kanbn.moveTask('task-1', 'Column 1', 0);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 1', 0);

  await this.kanbn.moveTask('task-1', 'Column 1', 1);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 1', 1);

  await this.kanbn.moveTask('task-1', 'Column 1', 2);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 1', 2);

  await this.kanbn.moveTask('task-1', 'Column 1', 3);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 1', 3);

  await this.kanbn.moveTask('task-1', 'Column 1', 4);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 1', 4);

  await this.kanbn.moveTask('task-1', 'Column 1', 5);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 1', 4);

  await this.kanbn.moveTask('task-1', 'Column 1', 0);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 1', 0);

  await this.kanbn.moveTask('task-1', 'Column 1', 4);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 1', 4);

  await this.kanbn.moveTask('task-1', 'Column 1', 1);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 1', 1);

  await this.kanbn.moveTask('task-1', 'Column 1', 3);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 1', 3);
});

test('Move a task to an absolute position in another column', async () => {
  await this.kanbn.moveTask('task-1', 'Column 2', -1);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 2', 0);

  await this.kanbn.moveTask('task-1', 'Column 3', 0);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 3', 0);

  await this.kanbn.moveTask('task-1', 'Column 2', 1);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 2', 1);

  await this.kanbn.moveTask('task-1', 'Column 3', 2);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 3', 2);

  await this.kanbn.moveTask('task-1', 'Column 2', 3);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 2', 3);

  await this.kanbn.moveTask('task-1', 'Column 3', 4);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 3', 4);

  await this.kanbn.moveTask('task-1', 'Column 2', 5);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 2', 5);

  await this.kanbn.moveTask('task-1', 'Column 3', 6);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 3', 5);
});

test('Move a task to a relative position in the same column', async () => {
  await this.kanbn.moveTask('task-1', 'Column 1', -1, true);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 1', 0);

  await this.kanbn.moveTask('task-1', 'Column 1', 2, true);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 1', 2);

  await this.kanbn.moveTask('task-1', 'Column 1', -1, true);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 1', 1);

  await this.kanbn.moveTask('task-1', 'Column 1', -10, true);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 1', 0);

  await this.kanbn.moveTask('task-1', 'Column 1', 10, true);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 1', 4);
});

test('Move a task to a relative position in another column', async () => {
  await this.kanbn.moveTask('task-1', 'Column 2', 1, true);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 2', 1);

  await this.kanbn.moveTask('task-1', 'Column 3', 2, true);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 3', 3);

  await this.kanbn.moveTask('task-1', 'Column 2', -1, true);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 2', 2);

  await this.kanbn.moveTask('task-1', 'Column 3', -10, true);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 3', 0);

  await this.kanbn.moveTask('task-1', 'Column 2', 10, true);
  await verifyTaskPosition(this.kanbn, 'task-1', 'Column 2', 5);
});

/**
 * Helper function to verify a task's position in a column
 * @param {object} kanbn The Kanbn instance
 * @param {string} taskId The task ID to check
 * @param {string} columnName The column name to check
 * @param {number} position The expected position in the column
 */
async function verifyTaskPosition(kanbn, taskId, columnName, position) {
  const index = await kanbn.getIndex();
  expect(index.columns[columnName].includes(taskId)).toBeTruthy();
  expect(index.columns[columnName].indexOf(taskId)).toBe(position);
}
