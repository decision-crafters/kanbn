const taskUtils = require('../../src/lib/task-utils');

describe('task-utils tests', () => {
  describe('taskInIndex()', () => {
    test('should check if a task exists in the index', () => {
      const index = {
        columns: {
          'Todo': ['task-1', 'task-2'],
          'Doing': ['task-3']
        }
      };
      
      expect(taskUtils.taskInIndex(index, 'task-1')).toBe(true);
      expect(taskUtils.taskInIndex(index, 'task-3')).toBe(true);
      expect(taskUtils.taskInIndex(index, 'task-4')).toBe(false);
    });
  });

  describe('findTaskColumn()', () => {
    test('should find the column a task is in', () => {
      const index = {
        columns: {
          'Todo': ['task-1', 'task-2'],
          'Doing': ['task-3']
        }
      };
      
      expect(taskUtils.findTaskColumn(index, 'task-1')).toBe('Todo');
      expect(taskUtils.findTaskColumn(index, 'task-3')).toBe('Doing');
      expect(taskUtils.findTaskColumn(index, 'task-4')).toBe(null);
    });
  });

  describe('addTaskToIndex()', () => {
    test('should add a task to the index', () => {
      const index = {
        columns: {
          'Todo': ['task-1', 'task-2'],
          'Doing': ['task-3']
        }
      };
      
      const updatedIndex = taskUtils.addTaskToIndex(index, 'task-4', 'Todo');
      expect(updatedIndex.columns.Todo).toEqual(['task-1', 'task-2', 'task-4']);
      
      const positionedIndex = taskUtils.addTaskToIndex(index, 'task-5', 'Todo', 1);
      expect(positionedIndex.columns.Todo).toEqual(['task-1', 'task-5', 'task-2', 'task-4']);
    });
  });

  describe('removeTaskFromIndex()', () => {
    test('should remove a task from the index', () => {
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
  });

  describe('renameTaskInIndex()', () => {
    test('should rename a task in the index', () => {
      const index = {
        columns: {
          'Todo': ['task-1', 'task-2'],
          'Doing': ['task-3']
        }
      };
      
      const updatedIndex = taskUtils.renameTaskInIndex(index, 'task-2', 'renamed-task');
      expect(updatedIndex.columns.Todo).toEqual(['task-1', 'renamed-task']);
    });
  });

  describe('getTaskMetadata()', () => {
    test('should get task metadata', () => {
      const task = {
        metadata: {
          due: '2021-01-01',
          assigned: 'user1'
        }
      };
      
      expect(taskUtils.getTaskMetadata(task, 'due')).toBe('2021-01-01');
      expect(taskUtils.getTaskMetadata(task, 'assigned')).toBe('user1');
      expect(taskUtils.getTaskMetadata(task, 'nonexistent')).toBe(null);
      expect(taskUtils.getTaskMetadata({}, 'due')).toBe(null);
    });
  });

  describe('setTaskMetadata()', () => {
    test('should set task metadata', () => {
      const task = {};
      
      const updatedTask1 = taskUtils.setTaskMetadata(task, 'due', '2021-01-01');
      expect(updatedTask1.metadata.due).toBe('2021-01-01');
      
      const updatedTask2 = taskUtils.setTaskMetadata(updatedTask1, 'assigned', 'user1');
      expect(updatedTask2.metadata.assigned).toBe('user1');
      expect(updatedTask2.metadata.due).toBe('2021-01-01');
    });
  });

  describe('taskCompleted()', () => {
    test('should check if a task is completed', () => {
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
      
      expect(taskUtils.taskCompleted(index, task1)).toBe(false);
      expect(taskUtils.taskCompleted(index, task2)).toBe(true);
      expect(taskUtils.taskCompleted(index, task3)).toBe(false);
      expect(taskUtils.taskCompleted(index, task4)).toBe(true);
    });
  });
});
