const fs = require('fs');
const path = require('path');
const realFs = require('../real-fs-fixtures');
const kanbnFactory = require('../../src/main');

if (!fs.existsSync(path.join(__dirname, '../real-fs-fixtures'))) {
  fs.mkdirSync(path.join(__dirname, '../real-fs-fixtures'), { recursive: true });
}

describe('updateTask tests', () => {
  beforeAll(() => {
    require('../qunit-throws-async');
  
  });
  beforeEach(() => {
    const timestamp = Date.now();
    this.testDir = realFs.createFixtures(`update-test-${timestamp
  });
  afterEach(() => {
    process.chdir(this.originalCwd);
    realFs.cleanupFixtures(this.testDir);
  
  });

  test('Update task in uninitialised folder should throw ', not initialised" error', async function(assert) {
  // Create an empty directory
  const emptyDir = path.join(this.testDir, 'empty');
  fs.mkdirSync(emptyDir);
  process.chdir(emptyDir);
  
  await expect(async () => {
      await this.kanbn.updateTask('task-1').toThrowAsync({});
    },
    /Not initialised in this folder/
  );
  
  process.chdir(this.testDir);
});

  test('Update non-existent task should throw ', task file not found" error', async function(assert) {
  const index = await this.kanbn.getIndex();
  expect(index).toBeTruthy();
  
  await await expect(async () => {
      await this.kanbn.updateTask('task-3').toThrowAsync({});
    },
    /No task file found with id "task-3"/
  );
});

  test('Update an untracked task should throw ', task not indexed" error', async function(assert) {
  // Create an untracked task
  const taskPath = path.join(this.testDir, '.kanbn', 'tasks', 'test-task.md');
  fs.writeFileSync(taskPath, '# Test Task');
  
  // Try to update an untracked task
  await expect(async () => {
      await this.kanbn.updateTask('test-task').toThrowAsync({});
    },
    /Task "test-task" is not in the index/
  );
});

  test('Update a task with a blank name should throw ', blank name" error', async function(assert) {
  try {
    const index = await this.kanbn.getIndex();
    expect(index).toBeTruthy();
    
    const taskIds = Object.values(index.columns).flat();
    expect(taskIds.length > 0).toBeTruthy();
    const taskId = taskIds[0];
    
    // Get the task first to ensure it exists
    const task = await this.kanbn.getTask(taskId);
    expect(task).toBeTruthy();
    
    // Create a new task object with a blank name
    const updatedTask = {
      name: '',
      description: task.description || '',
      metadata: task.metadata || {}
    };
    
    // Try to update with a blank name
    await await expect(async () => {
        await this.kanbn.updateTask(taskId).toThrowAsync(updatedTask);
      },
      /Task name cannot be blank/
    );
  } catch (error) {
    assert.ok(false, `Test failed with error: ${error.message}`);
  }
});

  test('Rename a task', async function(assert) {
  try {
    const index = await this.kanbn.getIndex();
    expect(index).toBeTruthy();
    
    const taskIds = Object.values(index.columns).flat();
    expect(taskIds.length > 0).toBeTruthy();
    const taskId = taskIds[0];
    
    // Get the task
    const task = await this.kanbn.getTask(taskId);
    expect(task).toBeTruthy();
    expect(task.name).toBeTruthy();
    
    // Create a new task object with a new name
    const newName = 'Renamed Task ' + Date.now();
    const updatedTask = {
      name: newName,
      description: task.description || '',
      metadata: task.metadata || {},
      subTasks: task.subTasks || [],
      relations: task.relations || []
    };
    
    // Update the task
    await this.kanbn.updateTask(taskId, updatedTask);
    
    // Get the new task ID
    const newTaskId = newName.toLowerCase().replace(/[^\w]+/g, '-');
    
    // Verify that the task file and index were updated
    const BASE_PATH = path.join(this.testDir, '.kanbn');
    assert.ok(fs.existsSync(path.join(BASE_PATH, 'tasks', `${newTaskId}.md`)), 'New task file should exist');
    
    // Verify task is in index
    const updatedIndex = await this.kanbn.getIndex();
    const allTasks = Object.values(updatedIndex.columns).flat();
    expect(allTasks.includes(newTaskId).toBeTruthy(), 'New task ID should be in index');
  } catch (error) {
    assert.ok(false, `Test failed with error: ${error.message}`);
  }
});

  test('Rename a task to a name that already exists should throw ', task already exists" error', async function(assert) {
  const index = await this.kanbn.getIndex();
  expect(index).toBeTruthy();
  
  const taskIds = Object.values(index.columns).flat();
  expect(taskIds.length >= 2).toBeTruthy();
  const taskId1 = taskIds[0];
  const taskId2 = taskIds[1];
  
  const task1 = await this.kanbn.getTask(taskId1);
  const task2 = await this.kanbn.getTask(taskId2);
  expect(task1).toBeTruthy();
  expect(task2).toBeTruthy();
  
  // Try to rename task1 to task2's name
  await await expect(async () => {
      await this.kanbn.updateTask(taskId1).toThrowAsync({ name: task2.name });
    },
    new RegExp(`A task with id "${taskId2}" already exists`)
  );
});

  test('Update a task', async function(assert) {
  const index = await this.kanbn.getIndex();
  expect(index).toBeTruthy();
  
  const taskIds = Object.values(index.columns).flat();
  expect(taskIds.length >= 2).toBeTruthy();
  const taskId = taskIds[0];
  const relatedTaskId = taskIds[1];
  
  const BASE_PATH = await this.kanbn.getMainFolder();
  const TEST_DESCRIPTION = 'Test description...';
  const TEST_TAGS = ['Tag 1', 'Tag 2'];
  const TEST_SUB_TASK = {
    text: 'Test sub-task',
    completed: true
  };
  const TEST_RELATION = {
    task: relatedTaskId,
    type: 'Test relation type'
  };

  // Get the task
  let task = await this.kanbn.getTask(taskId);
  expect(task).toBeTruthy();

  // Update task
  const currentDate = (new Date()).toISOString();
  await this.kanbn.updateTask(taskId, {
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
  const updatedTask = await this.kanbn.getTask(taskId);
  expect(updatedTask.description).toEqual(TEST_DESCRIPTION);
  expect(updatedTask.metadata.tags).toEqual(TEST_TAGS);
  
  // Verify subtasks
  expect(updatedTask.subTasks.some(st => 
    st.text === TEST_SUB_TASK.text && st.completed === TEST_SUB_TASK.completed
  ).toBeTruthy(), 'Task should have the test subtask');
  
  // Verify relations
  expect(updatedTask.relations.some(rel => 
    rel.task === TEST_RELATION.task && rel.type === TEST_RELATION.type
  ).toBeTruthy(), 'Task should have the test relation');

  // Verify that the task updated date was updated
  task = await this.kanbn.getTask(taskId);
  expect(task.metadata.updated.toISOString().substr(0).toEqual(9), currentDate.substr(0, 9));
});

  test('Move a task using the update method', async function(assert) {
  try {
    const index = await this.kanbn.getIndex();
    expect(index).toBeTruthy();
    
    const columnNames = Object.keys(index.columns);
    expect(columnNames.length >= 2).toBeTruthy();
    
    const sourceColumn = columnNames[0];
    const targetColumn = columnNames[1];
    
    if (index.columns[sourceColumn].length === 0) {
      const taskName = 'Test Task ' + Date.now();
      const taskId = taskName.toLowerCase().replace(/[^\w]+/g, '-');
      
      await this.kanbn.addTask({
        name: taskName,
        description: 'Test description',
        metadata: {}
      }, sourceColumn);
      
      // Verify the task was added
      const updatedIndex = await this.kanbn.getIndex();
      expect(updatedIndex.columns[sourceColumn].includes(taskId).toBeTruthy(), `Task should be in ${sourceColumn}`);
      
      // Get the task
      const task = await this.kanbn.getTask(taskId);
      expect(task).toBeTruthy();
      
      await this.kanbn.updateTask(taskId, task, targetColumn);
      
      // Verify that the index was updated
      const finalIndex = await this.kanbn.getIndex();
      expect(finalIndex.columns[targetColumn].includes(taskId).toBeTruthy(), `Task should be in ${targetColumn}`);
    } else {
      const taskId = index.columns[sourceColumn][0];
      
      // Get the task
      const task = await this.kanbn.getTask(taskId);
      expect(task).toBeTruthy();
      
      await this.kanbn.updateTask(taskId, task, targetColumn);
      
      // Verify that the index was updated
      const updatedIndex = await this.kanbn.getIndex();
      expect(updatedIndex.columns[targetColumn].includes(taskId).toBeTruthy(), `Task should be in ${targetColumn}`);
    }
  } catch (error) {
    assert.ok(false, `Test failed with error: ${error.message}`);
  }
});

});\