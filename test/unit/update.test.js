const fs = require('fs');
const path = require('path');
const realFs = require('../real-fs-fixtures');
const Kanbn = require('../../src/main');
const context = require('../context');

QUnit.module('updateTask tests', {
  before() {
    require('../qunit-throws-async');
  },
  beforeEach() {
    this.testDir = realFs.createFixtures('update-test', {
      countColumns: 2,
      countTasks: 2
    }).testDir;
    
    this.originalCwd = process.cwd();
    process.chdir(this.testDir);
    
    // Create a new Kanbn instance
    this.kanbn = Kanbn();
  },
  afterEach() {
    process.chdir(this.originalCwd);
    
    realFs.cleanupFixtures(this.testDir);
  }
});

QUnit.test('Update task in uninitialised folder should throw "not initialised" error', async function(assert) {
  // Create an empty directory
  const emptyDir = path.join(this.testDir, 'empty');
  fs.mkdirSync(emptyDir);
  process.chdir(emptyDir);
  
  assert.throwsAsync(
    async () => {
      await this.kanbn.updateTask('task-1', {});
    },
    /Not initialised in this folder/
  );
  
  process.chdir(this.testDir);
});

QUnit.test('Update non-existent task should throw "task file not found" error', async function(assert) {
  assert.throwsAsync(
    async () => {
      await this.kanbn.updateTask('task-3', {});
    },
    /No task file found with id "task-3"/
  );
});

QUnit.test('Update an untracked task should throw "task not indexed" error', async function(assert) {
  // Create an untracked task
  const taskPath = path.join(this.testDir, '.kanbn', 'tasks', 'test-task.md');
  fs.writeFileSync(taskPath, '# Test Task');
  
  // Try to update an untracked task
  assert.throwsAsync(
    async () => {
      await this.kanbn.updateTask('test-task', {});
    },
    /Task "test-task" is not in the index/
  );
});

QUnit.test('Update a task with a blank name should throw "blank name" error', async function(assert) {
  assert.throwsAsync(
    async () => {
      await this.kanbn.updateTask('task-1', {});
    },
    /Task name cannot be blank/
  );
});

QUnit.test('Rename a task', async function(assert) {
  await this.kanbn.updateTask('task-1', { name: 'Task 3' });

  // Verify that the task file and index were updated
  const BASE_PATH = await this.kanbn.getMainFolder();
  context.taskFileExists(assert, BASE_PATH, 'task-3');
  context.indexHasTask(assert, BASE_PATH, 'task-3');
});

QUnit.test('Rename a task to a name that already exists should throw "task already exists" error', async function(assert) {
  assert.throwsAsync(
    async () => {
      await this.kanbn.updateTask('task-1', { name: 'Task 2' });
    },
    /A task with id "task-2" already exists/
  );
});

QUnit.test('Update a task', async function(assert) {
  const BASE_PATH = await this.kanbn.getMainFolder();
  const TEST_DESCRIPTION = 'Test description...';
  const TEST_TAGS = ['Tag 1', 'Tag 2'];
  const TEST_SUB_TASK = {
    text: 'Test sub-task',
    completed: true
  };
  const TEST_RELATION = {
    task: 'task-2',
    type: 'Test relation type'
  };

  // Get the first task
  let task = await this.kanbn.getTask('task-1');

  // Update task
  const currentDate = (new Date()).toISOString();
  await this.kanbn.updateTask('task-1', {
    name: task.name,
    description: TEST_DESCRIPTION,
    metadata: {
      tags: TEST_TAGS
    },
    subTasks: [
      TEST_SUB_TASK
    ],
    relations: [
      TEST_RELATION
    ]
  });

  // Verify that the task file was updated
  context.taskHasDescription(assert, BASE_PATH, 'task-1', TEST_DESCRIPTION);
  context.taskHasMetadata(assert, BASE_PATH, 'task-1', {
    tags: TEST_TAGS
  });
  context.taskHasSubTasks(assert, BASE_PATH, 'task-1', [TEST_SUB_TASK]);
  context.taskHasRelations(assert, BASE_PATH, 'task-1', [TEST_RELATION]);

  // Verify that the task updated date was updated
  task = await this.kanbn.getTask('task-1');
  assert.equal(task.metadata.updated.toISOString().substr(0, 9), currentDate.substr(0, 9));
});

QUnit.test('Move a task using the update method', async function(assert) {
  const task = await this.kanbn.getTask('task-1');

  // Update task
  await this.kanbn.updateTask('task-1', task, 'Column 2');

  // Verify that the index was updated
  context.indexHasTask(assert, await this.kanbn.getMainFolder(), 'task-1', 'Column 2');
});
