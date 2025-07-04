const fs = require('fs');
const path = require('path');
const realFs = require('../real-fs-fixtures');
const kanbnFactory = require('../../src/main');

if (!fs.existsSync(path.join(__dirname, '../real-fs-fixtures'))) {
  fs.mkdirSync(path.join(__dirname, '../real-fs-fixtures'), { recursive: true });
}

describe('addUntrackedTaskToIndex tests', () => {
  let originalCwd;
  let testDir;
  let kanbn;
  beforeAll(() => {
    // no-op, kept for parity with QUnit setup
  });

  beforeEach(() => {
    const timestamp = Date.now();
    testDir = realFs.createFixtures(`add-untracked-test-${timestamp}`, {
      countColumns: 1,
      countTasks: 1,
      columnNames: ['Test Column']
    }).testDir;

    fs.writeFileSync(
      path.join(testDir, '.kanbn', 'tasks', 'test-task-2.md'),
      '# Test Task 2'
    );
    fs.writeFileSync(
      path.join(testDir, '.kanbn', 'tasks', 'test-task-3.md'),
      '# Test Task 3'
    );

    originalCwd = process.cwd();
    process.chdir(testDir);

    kanbn = kanbnFactory();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    realFs.cleanupFixtures(testDir);
  });

test('Add untracked task in un-initialised folder should throw "not initialised" error', async () => {
  const emptyDir = path.join(testDir, 'empty');
  fs.mkdirSync(emptyDir);
  process.chdir(emptyDir);
  
  await expect(
    kanbn.addUntrackedTaskToIndex('test-task-2', 'Test Column')
  ).rejects.toThrow(/Not initialised in this folder/);

  process.chdir(testDir);
});

test('Add non-existent untracked task should throw "no task file" error', async () => {
  await expect(
    kanbn.addUntrackedTaskToIndex('test-task-4', 'Test Column')
  ).rejects.toThrow(/No task file found with id "test-task-4"/);
});

test('Add untracked task in non-existent column should throw "no column" error', async () => {
  const NON_EXISTENT_COLUMN = 'Wibble';
  await expect(
    kanbn.addUntrackedTaskToIndex('test-task-2', NON_EXISTENT_COLUMN)
  ).rejects.toThrow(new RegExp(`Column "${NON_EXISTENT_COLUMN}" doesn't exist`));
});

test('Add untracked task that is already indexed should throw "already indexed" error', async () => {
  // First verify the task exists in the index
  const index = await kanbn.getIndex();
  expect(index.columns['Test Column']).toContain('test-task-1');

  await expect(
    kanbn.addUntrackedTaskToIndex('test-task-1', 'Test Column')
  ).rejects.toThrow(/Task "test-task-1" is already in the index/);
});

test('Add untracked task to the index', async () => {
  // First verify the task file exists but is not in the index
  expect(fs.existsSync(path.join(testDir, '.kanbn', 'tasks', 'test-task-2.md'))).toBe(true);

  const index = await kanbn.getIndex();
  expect(index.columns['Test Column']).not.toContain('test-task-2');

  const TASK_ID = await kanbn.addUntrackedTaskToIndex('test-task-2', 'Test Column');

  // Verify that the task is in the index
  const updatedIndex = await kanbn.getIndex();
  expect(updatedIndex.columns['Test Column']).toContain(TASK_ID);
});

});
