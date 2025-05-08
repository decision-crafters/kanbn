const taskUtils = require('../../src/lib/task-utils');

describe('task-utils tests', () => {

  test('taskInIndex() should check if a task exists in the index', async () => {
  const index = {
    columns: {
      'Todo': ['task-1', 'task-2'],
      'Doing': ['task-3']
    }
  };
  
  expect(taskUtils.taskInIndex(index).toEqual('task-1'), true);
  expect(taskUtils.taskInIndex(index).toEqual('task-3'), true);
  expect(taskUtils.taskInIndex(index).toEqual('task-4'), false);
});

  test('findTaskColumn() should find the column a task is in', async () => {
  const index = {
    columns: {
      'Todo': ['task-1', 'task-2'],
      'Doing': ['task-3']
    }
  };
  
  expect(taskUtils.findTaskColumn(index).toEqual('task-1'), 'Todo');
  expect(taskUtils.findTaskColumn(index).toEqual('task-3'), 'Doing');
  expect(taskUtils.findTaskColumn(index).toEqual('task-4'), null);
});

  test('addTaskToIndex() should add a task to the index', async () => {
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

  test('removeTaskFromIndex() should remove a task from the index', async () => {
  const index = {
    columns: {
      'Todo': ['task-1', 'task-2'],
      'Doing': ['task-3']
    }
  };
  
  const updatedIndex = taskUtils.removeTaskFromIndex(index, 'task-2');
  expect(updatedIndex.columns.Todo).toEqual(['task-1']);
  expect(updatedIndex.columns.Doing).toEqual(['task-3']);
});

  test('renameTaskInIndex() should rename a task in the index', async () => {
  const index = {
    columns: {
      'Todo': ['task-1', 'task-2'],
      'Doing': ['task-3']
    }
  };
  
  const updatedIndex = taskUtils.renameTaskInIndex(index, 'task-2', 'renamed-task');
  assert.deepEqual(updatedIndex.columns.Todo, ['task-1', 'renamed-task']);
});

  test('getTaskMetadata() should get task metadata', async () => {
  const task = {
    metadata: {
      due: '2021-01-01',
      assigned: 'user1'
    }
  };
  
  expect(taskUtils.getTaskMetadata(task).toEqual('due'), '2021-01-01');
  expect(taskUtils.getTaskMetadata(task).toEqual('assigned'), 'user1');
  expect(taskUtils.getTaskMetadata(task).toEqual('nonexistent'), null);
  expect(taskUtils.getTaskMetadata({}).toEqual('due'), null);
});

  test('setTaskMetadata() should set task metadata', async () => {
  const task = {};
  
  const updatedTask1 = taskUtils.setTaskMetadata(task, 'due', '2021-01-01');
  expect(updatedTask1.metadata.due).toEqual('2021-01-01');
  
  const updatedTask2 = taskUtils.setTaskMetadata(updatedTask1, 'assigned', 'user1');
  expect(updatedTask2.metadata.assigned).toEqual('user1');
  expect(updatedTask2.metadata.due).toEqual('2021-01-01');
});

  test('taskCompleted() should check if a task is completed', async () => {
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
  
  expect(taskUtils.taskCompleted(index).toEqual(task1), false);
  expect(taskUtils.taskCompleted(index).toEqual(task2), true);
  expect(taskUtils.taskCompleted(index).toEqual(task3), false);
  expect(taskUtils.taskCompleted(index).toEqual(task4), true);
});

});\