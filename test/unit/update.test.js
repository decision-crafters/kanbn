const fs = require('fs');
const path = require('path');
const realFs = require('../real-fs-fixtures');
const kanbnFactory = require('../../src/main');

if (!fs.existsSync(path.join(__dirname, '../real-fs-fixtures'))) {
  fs.mkdirSync(path.join(__dirname, '../real-fs-fixtures'), { recursive: true });
}

describe('updateTask tests', () => {
  let testDir;
  let kanbn;
  let originalCwd;

  beforeAll(async () => {
    console.log('Running beforeAll hook');
  });
  
  beforeEach(async () => {
    console.log('Running beforeEach hook');
    const timestamp = Date.now();
    testDir = realFs.createFixtures(`update-test-${timestamp}`, {
      countColumns: 2,
      countTasks: 2
    }).testDir;
    
    originalCwd = process.cwd();
    process.chdir(testDir);
    
    // Create a new Kanbn instance
    kanbn = kanbnFactory();
    console.log('Kanbn instance created');
  });
  
  afterEach(async () => {
    console.log('Running afterEach hook');
    process.chdir(originalCwd);
    await realFs.cleanupFixtures(testDir);
  });

  test('Update task in uninitialised folder should throw "not initialised" error', async () => {
    console.log('Running test: Update task in uninitialised folder should throw "not initialised" error');
    // Create an empty directory
    const emptyDir = path.join(testDir, 'empty');
    fs.mkdirSync(emptyDir);
    process.chdir(emptyDir);
    
    await expect(kanbn.updateTask('task-1', {}))
      .rejects.toThrow(/Not initialised in this folder/);
    
    process.chdir(testDir);
  });

  test('Update non-existent task should throw "task file not found" error', async () => {
    console.log('Running test: Update non-existent task should throw "task file not found" error');
    const index = await kanbn.getIndex();
    expect(index).toBeDefined();
    
    await expect(kanbn.updateTask('task-3', {}))
      .rejects.toThrow(/No task file found with id "task-3"/);
  });

  test('Update an untracked task should throw "task not indexed" error', async () => {
    console.log('Running test: Update an untracked task should throw "task not indexed" error');
    // Create an untracked task
    const taskPath = path.join(testDir, '.kanbn', 'tasks', 'test-task.md');
    fs.writeFileSync(taskPath, '# Test Task');
    
    // Try to update an untracked task
    await expect(kanbn.updateTask('test-task', {}))
      .rejects.toThrow(/Task "test-task" is not in the index/);
  });

  test('Update a task with a blank name should throw "blank name" error', async () => {
    console.log('Running test: Update a task with a blank name should throw "blank name" error');
    const index = await kanbn.getIndex();
    expect(index).toBeDefined();
    
    const taskIds = Object.values(index.columns).flat();
    expect(taskIds.length).toBeGreaterThan(0);
    const taskId = taskIds[0];
    
    // Get the task first to ensure it exists
    const task = await kanbn.getTask(taskId);
    expect(task).toBeDefined();
    
    // Create a new task object with a blank name
    const updatedTask = {
      name: '',
      description: task.description || '',
      metadata: task.metadata || {}
    };
    
    // Try to update with a blank name
    await expect(kanbn.updateTask(taskId, updatedTask))
      .rejects.toThrow(/Task name cannot be blank/);
  });

  test('Rename a task', async () => {
    console.log('Running test: Rename a task');
    const index = await kanbn.getIndex();
    expect(index).toBeDefined();
    
    const taskIds = Object.values(index.columns).flat();
    expect(taskIds.length).toBeGreaterThan(0);
    const taskId = taskIds[0];
    
    // Get the task
    const task = await kanbn.getTask(taskId);
    expect(task).toBeDefined();
    expect(task.name).toBeDefined();
    
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
    await kanbn.updateTask(taskId, updatedTask);
    
    // Get the new task ID
    const newTaskId = newName.toLowerCase().replace(/[^\w]+/g, '-');
    
    // Verify that the task file and index were updated
    const tasksPath = path.join(testDir, '.kanbn', 'tasks');
    expect(fs.existsSync(path.join(tasksPath, `${newTaskId}.md`))).toBe(true);
    
    // Verify task is in index
    const updatedIndex = await kanbn.getIndex();
    const allTasks = Object.values(updatedIndex.columns).flat();
    expect(allTasks.includes(newTaskId)).toBe(true);
  });

  test('Rename a task to a name that already exists should throw "task already exists" error', async () => {
    console.log('Running test: Rename a task to a name that already exists should throw "task already exists" error');
    const index = await kanbn.getIndex();
    expect(index).toBeDefined();
    
    const taskIds = Object.values(index.columns).flat();
    expect(taskIds.length).toBeGreaterThanOrEqual(2);
    const taskId1 = taskIds[0];
    const taskId2 = taskIds[1];
    
    const task1 = await kanbn.getTask(taskId1);
    const task2 = await kanbn.getTask(taskId2);
    expect(task1).toBeDefined();
    expect(task2).toBeDefined();
    
    // Try to rename task1 to task2's name
    await expect(kanbn.updateTask(taskId1, { name: task2.name }))
      .rejects.toThrow(new RegExp(`A task with id "${taskId2}" already exists`));
  });

  test('Update a task', async () => {
    console.log('Running test: Update a task');
    const index = await kanbn.getIndex();
    expect(index).toBeDefined();
    
    const taskIds = Object.values(index.columns).flat();
    expect(taskIds.length).toBeGreaterThanOrEqual(2);
    const taskId = taskIds[0];
    const relatedTaskId = taskIds[1];
    
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
    let task = await kanbn.getTask(taskId);
    expect(task).toBeDefined();

    // Update task
    const currentDate = (new Date()).toISOString();
    await kanbn.updateTask(taskId, {
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
    const updatedTask = await kanbn.getTask(taskId);
    expect(updatedTask.description).toBe(TEST_DESCRIPTION);
    expect(updatedTask.metadata.tags).toEqual(TEST_TAGS);
    
    // Verify subtasks
    expect(updatedTask.subTasks.some(st => 
      st.text === TEST_SUB_TASK.text && st.completed === TEST_SUB_TASK.completed
    )).toBe(true);
    
    // Verify relations
    expect(updatedTask.relations.some(rel => 
      rel.task === TEST_RELATION.task && rel.type === TEST_RELATION.type
    )).toBe(true);

    // Verify that the task updated date was updated
    task = await kanbn.getTask(taskId);
    expect(task.metadata.updated.toISOString().substr(0, 9)).toBe(currentDate.substr(0, 9));
  });

  test('Move a task using the update method', async () => {
    console.log('Running test: Move a task using the update method');
    const index = await kanbn.getIndex();
    // Assert index is defined before using it
    expect(index).toBeDefined();
    
    const columnNames = Object.keys(index.columns);
    // Assert we have enough columns for the test
    expect(columnNames.length).toBeGreaterThanOrEqual(2);
    
    const sourceColumn = columnNames[0];
    const targetColumn = columnNames[1];
    
    let taskId;
    
    // Add a task if needed rather than using conditionals with expect
    if (index.columns[sourceColumn].length === 0) {
      const taskName = 'Test Task ' + Date.now();
      taskId = taskName.toLowerCase().replace(/[^\w]+/g, '-');
      
      await kanbn.addTask({
        name: taskName,
        description: 'Test description',
        metadata: {}
      }, sourceColumn);
      
      // Update the index
      await kanbn.getIndex();
    } else {
      taskId = index.columns[sourceColumn][0];
    }
    
    // Verify task exists in source column
    expect(index.columns[sourceColumn].includes(taskId)).toBe(true);
    
    // Get the task
    const task = await kanbn.getTask(taskId);
    expect(task).toBeDefined();
    
    await kanbn.updateTask(taskId, task, targetColumn);
    
    // Verify that the index was updated
    const finalIndex = await kanbn.getIndex();
    expect(finalIndex.columns[targetColumn].includes(taskId)).toBe(true);
  });
});
