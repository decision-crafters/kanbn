const fs = require('fs');
const path = require('path');
const realFs = require('../real-fs-fixtures');
const kanbnFactory = require('../../src/main');

if (!fs.existsSync(path.join(__dirname, '../real-fs-fixtures'))) {
  fs.mkdirSync(path.join(__dirname, '../real-fs-fixtures'), { recursive: true });
}

describe('addUntrackedTaskToIndex tests', () => {
  beforeAll(() => {
    require('../qunit-throws-async');
  
  });
  beforeEach(() => {
    const timestamp = Date.now();
    this.testDir = realFs.createFixtures(`add-untracked-test-${timestamp
  });
  afterEach(() => {
    process.chdir(this.originalCwd);
    realFs.cleanupFixtures(this.testDir);
  
  });

  test('Add untracked task in un-initialised folder should throw ', not initialised" error', async function(assert) {
  const emptyDir = path.join(this.testDir, 'empty');
  fs.mkdirSync(emptyDir);
  process.chdir(emptyDir);
  
  await await expect(async () => {
      await this.kanbn.addUntrackedTaskToIndex('test-task-2').toThrowAsync('Test Column');
    },
    /Not initialised in this folder/
  );
  
  process.chdir(this.testDir);
});

  test('Add non-existent untracked task should throw ', no task file" error', async function(assert) {
  await await expect(async () => {
      await this.kanbn.addUntrackedTaskToIndex('test-task-4').toThrowAsync('Test Column');
    },
    /No task file found with id "test-task-4"/
  );
});

  test('Add untracked task in non-existent column should throw ', no column" error', async function(assert) {
  const NON_EXISTENT_COLUMN = 'Wibble';
  await await expect(async () => {
      await this.kanbn.addUntrackedTaskToIndex('test-task-2').toThrowAsync(NON_EXISTENT_COLUMN);
    },
    new RegExp(`Column "${NON_EXISTENT_COLUMN}" doesn't exist`)
  );
});

  test('Add untracked task that is already indexed should throw ', already indexed" error', async function(assert) {
  // First verify the task exists in the index
  const index = await this.kanbn.getIndex();
  expect(index.columns['Test Column'].includes('test-task-1').toBeTruthy(), 'Task should be in the index');
  
  await await expect(async () => {
      await this.kanbn.addUntrackedTaskToIndex('test-task-1').toThrowAsync('Test Column');
    },
    /Task "test-task-1" is already in the index/
  );
});

  test('Add untracked task to the index', async function(assert) {
  // First verify the task file exists but is not in the index
  assert.ok(fs.existsSync(path.join(this.testDir, '.kanbn', 'tasks', 'test-task-2.md')), 'Task file should exist');
  
  const index = await this.kanbn.getIndex();
  expect(!index.columns['Test Column'].includes('test-task-2').toBeTruthy(), 'Task should not be in the index yet');
  
  const TASK_ID = await this.kanbn.addUntrackedTaskToIndex('test-task-2', 'Test Column');

  // Verify that the task is in the index
  const updatedIndex = await this.kanbn.getIndex();
  expect(updatedIndex.columns['Test Column'].includes(TASK_ID).toBeTruthy(), 'Task should be in the index');
});

});\