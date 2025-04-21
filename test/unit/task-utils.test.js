const taskUtils = require('../../src/lib/task-utils');

QUnit.module('task-utils tests');

QUnit.test('taskInIndex() should check if a task exists in the index', async assert => {
  const index = {
    columns: {
      'Todo': ['task-1', 'task-2'],
      'Doing': ['task-3']
    }
  };
  
  assert.equal(taskUtils.taskInIndex(index, 'task-1'), true);
  assert.equal(taskUtils.taskInIndex(index, 'task-3'), true);
  assert.equal(taskUtils.taskInIndex(index, 'task-4'), false);
});

QUnit.test('findTaskColumn() should find the column a task is in', async assert => {
  const index = {
    columns: {
      'Todo': ['task-1', 'task-2'],
      'Doing': ['task-3']
    }
  };
  
  assert.equal(taskUtils.findTaskColumn(index, 'task-1'), 'Todo');
  assert.equal(taskUtils.findTaskColumn(index, 'task-3'), 'Doing');
  assert.equal(taskUtils.findTaskColumn(index, 'task-4'), null);
});

QUnit.test('addTaskToIndex() should add a task to the index', async assert => {
  const index = {
    columns: {
      'Todo': ['task-1', 'task-2'],
      'Doing': ['task-3']
    }
  };
  
  const updatedIndex = taskUtils.addTaskToIndex(index, 'task-4', 'Todo');
  assert.deepEqual(updatedIndex.columns.Todo, ['task-1', 'task-2', 'task-4']);
  
  const positionedIndex = taskUtils.addTaskToIndex(index, 'task-5', 'Todo', 1);
  assert.deepEqual(positionedIndex.columns.Todo, ['task-1', 'task-5', 'task-2', 'task-4']);
});

QUnit.test('removeTaskFromIndex() should remove a task from the index', async assert => {
  const index = {
    columns: {
      'Todo': ['task-1', 'task-2'],
      'Doing': ['task-3']
    }
  };
  
  const updatedIndex = taskUtils.removeTaskFromIndex(index, 'task-2');
  assert.deepEqual(updatedIndex.columns.Todo, ['task-1']);
  assert.deepEqual(updatedIndex.columns.Doing, ['task-3']);
});

QUnit.test('renameTaskInIndex() should rename a task in the index', async assert => {
  const index = {
    columns: {
      'Todo': ['task-1', 'task-2'],
      'Doing': ['task-3']
    }
  };
  
  const updatedIndex = taskUtils.renameTaskInIndex(index, 'task-2', 'renamed-task');
  assert.deepEqual(updatedIndex.columns.Todo, ['task-1', 'renamed-task']);
});

QUnit.test('getTaskMetadata() should get task metadata', async assert => {
  const task = {
    metadata: {
      due: '2021-01-01',
      assigned: 'user1'
    }
  };
  
  assert.equal(taskUtils.getTaskMetadata(task, 'due'), '2021-01-01');
  assert.equal(taskUtils.getTaskMetadata(task, 'assigned'), 'user1');
  assert.equal(taskUtils.getTaskMetadata(task, 'nonexistent'), null);
  assert.equal(taskUtils.getTaskMetadata({}, 'due'), null);
});

QUnit.test('setTaskMetadata() should set task metadata', async assert => {
  const task = {};
  
  const updatedTask1 = taskUtils.setTaskMetadata(task, 'due', '2021-01-01');
  assert.equal(updatedTask1.metadata.due, '2021-01-01');
  
  const updatedTask2 = taskUtils.setTaskMetadata(updatedTask1, 'assigned', 'user1');
  assert.equal(updatedTask2.metadata.assigned, 'user1');
  assert.equal(updatedTask2.metadata.due, '2021-01-01');
});

QUnit.test('taskCompleted() should check if a task is completed', async assert => {
  const index = {
    columns: {
      'Todo': ['task-1', 'task-2'],
      'Doing': ['task-3'],
      'Done': ['task-4']
    },
    options: {
      completedColumns: ['Done']
    }
  };
  
  const task1 = { id: 'task-1', metadata: {} };
  const task2 = { id: 'task-2', metadata: { completed: true } };
  const task3 = { id: 'task-3', metadata: {} };
  const task4 = { id: 'task-4', metadata: {} };
  
  assert.equal(taskUtils.taskCompleted(index, task1), false);
  assert.equal(taskUtils.taskCompleted(index, task2), true);
  assert.equal(taskUtils.taskCompleted(index, task3), false);
  assert.equal(taskUtils.taskCompleted(index, task4), true);
});
