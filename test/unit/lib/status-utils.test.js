// Mock dependencies FIRST, before requiring the module under test
jest.mock('../../../src/lib/task-utils');
jest.mock('../../../src/lib/index-utils');

// Now require the mocked modules AND the module under test
const statusUtils = require('../../../src/lib/status-utils');
const taskUtils = require('../../../src/lib/task-utils');
const indexUtils = require('../../../src/lib/index-utils');

describe('status-utils.js', () => {
  // --- Tests for Pure Functions ---

  describe('calculateAssignedTaskStats()', () => {
    const tasks = [
      { metadata: { assigned: 'Alice' }, workload: 3, remainingWorkload: 1 },
      { metadata: { assigned: 'Bob' }, workload: 5, remainingWorkload: 5 },
      { metadata: { assigned: 'Alice' }, workload: 2, remainingWorkload: 0 },
      { metadata: {}, workload: 4, remainingWorkload: 2 }, // Unassigned
    ];

    test('should calculate correct totals per assignee', () => {
      const expected = {
        Alice: { total: 2, workload: 5, remainingWorkload: 1 },
        Bob: { total: 1, workload: 5, remainingWorkload: 5 },
      };
      expect(statusUtils.calculateAssignedTaskStats(tasks)).toEqual(expected);
    });

    test('should return empty object for tasks with no assignments', () => {
      const noAssigneeTasks = [
        { metadata: {}, workload: 4, remainingWorkload: 2 },
        { metadata: {}, workload: 1, remainingWorkload: 1 },
      ];
      expect(statusUtils.calculateAssignedTaskStats(noAssigneeTasks)).toEqual({});
    });

    test('should return empty object for empty task list', () => {
      expect(statusUtils.calculateAssignedTaskStats([])).toEqual({});
    });
  });

  describe('calculateAIMetrics()', () => {
    const tasks = [
      { metadata: { tags: ['ai-interaction', 'type-a'] } },
      { metadata: { tags: ['ai-interaction', 'type-b'] } },
      { metadata: { tags: ['some-tag'] } },
      { metadata: { tags: ['ai-interaction', 'type-a'] } },
      { metadata: {} },
    ];

    test('should calculate correct AI interaction counts', () => {
      const expected = {
        total: 3,
        byType: {
          'type-a': 2,
          'type-b': 1,
        },
      };
      expect(statusUtils.calculateAIMetrics(tasks)).toEqual(expected);
    });

    test('should return null if no AI interaction tags found', () => {
      const noAiTasks = [
        { metadata: { tags: ['some-tag'] } },
        { metadata: {} },
      ];
      expect(statusUtils.calculateAIMetrics(noAiTasks)).toBeNull();
    });

    test('should return null for empty task list', () => {
      expect(statusUtils.calculateAIMetrics([])).toBeNull();
    });
  });

  describe('calculateRelationMetrics()', () => {
    const tasks = [
      { relations: [{ type: 'parent-of', task: 'child1' }] }, // Parent 1
      { relations: [{ type: 'child-of', task: 'parent1' }] }, // Child 1
      { relations: [{ type: 'blocks', task: 'task-a' }] },   // Other relation
      { relations: [{ type: 'parent-of', task: 'child2' }] }, // Parent 2
      { relations: [{ type: 'child-of', task: 'parent2' }, { type: 'child-of', task: 'parent3' }] }, // Child 2, 3
      { metadata: {} }, // No relations
    ];

    test('should calculate correct parent/child counts', () => {
      const expected = {
        parentTasks: 2,
        childTasks: 2,
      };
      expect(statusUtils.calculateRelationMetrics(tasks)).toEqual(expected);
    });

    test('should return null if no parent/child relations found', () => {
      const noRelationsTasks = [
        { relations: [{ type: 'blocks', task: 'task-a' }] },
        { metadata: {} },
      ];
      expect(statusUtils.calculateRelationMetrics(noRelationsTasks)).toBeNull();
    });

    test('should return null for empty task list', () => {
      expect(statusUtils.calculateRelationMetrics([])).toBeNull();
    });
  });

  describe('calculateColumnWorkloads()', () => {
    const tasks = [
      { column: 'Todo', workload: 3, remainingWorkload: 3 },
      { column: 'In Progress', workload: 5, remainingWorkload: 2 },
      { column: 'Todo', workload: 2, remainingWorkload: 2 },
      { column: 'Done', workload: 4, remainingWorkload: 0 },
    ];
    const columnNames = ['Todo', 'In Progress', 'Done'];

    test('should calculate correct total and per-column workloads', () => {
      const expected = {
        totalWorkload: 14,
        totalRemainingWorkload: 7,
        columnWorkloads: {
          Todo: { workload: 5, remainingWorkload: 5 },
          'In Progress': { workload: 5, remainingWorkload: 2 },
          Done: { workload: 4, remainingWorkload: 0 },
        },
      };
      expect(statusUtils.calculateColumnWorkloads(tasks, columnNames)).toEqual(expected);
    });

    test('should handle empty task list', () => {
      const expected = {
        totalWorkload: 0,
        totalRemainingWorkload: 0,
        columnWorkloads: {
          Todo: { workload: 0, remainingWorkload: 0 },
          'In Progress': { workload: 0, remainingWorkload: 0 },
          Done: { workload: 0, remainingWorkload: 0 },
        },
      };
      expect(statusUtils.calculateColumnWorkloads([], columnNames)).toEqual(expected);
    });
  });

  describe('calculateDueTasks()', () => {
    const tasks = [
      { id: 'task1', workload: 3, progress: 0.5, remainingWorkload: 1.5, dueData: { dueMessage: 'Overdue', other: 'data' } },
      { id: 'task2', workload: 5, progress: 0, remainingWorkload: 5, dueData: { dueMessage: 'Remaining', x: 'y' } },
      { id: 'task3', workload: 2, progress: 1, remainingWorkload: 0 }, // No dueData
    ];

    test('should return array of tasks with dueData, including specific fields', () => {
      const expected = [
        {
          task: 'task1',
          workload: 3,
          progress: 0.5,
          remainingWorkload: 1.5,
          dueMessage: 'Overdue',
          other: 'data',
        },
        {
          task: 'task2',
          workload: 5,
          progress: 0,
          remainingWorkload: 5,
          dueMessage: 'Remaining',
          x: 'y',
        },
      ];
      expect(statusUtils.calculateDueTasks(tasks)).toEqual(expected);
    });

    test('should return empty array if no tasks have dueData', () => {
      const noDueTasks = [
        { id: 'task3', workload: 2, progress: 1, remainingWorkload: 0 },
        { id: 'task4', workload: 1, progress: 0, remainingWorkload: 1 },
      ];
      expect(statusUtils.calculateDueTasks(noDueTasks)).toEqual([]);
    });

    test('should return empty array for empty task list', () => {
      expect(statusUtils.calculateDueTasks([])).toEqual([]);
    });
  });

// Mock dependencies used by some functions
jest.mock('../../../src/lib/task-utils');
jest.mock('../../../src/lib/index-utils');
const taskUtils = require('../../../src/lib/task-utils');
const indexUtils = require('../../../src/lib/index-utils');

describe('status-utils.js', () => {
  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Tests for Pure Functions ---

  describe('calculateAssignedTaskStats()', () => {
    const tasks = [
      { metadata: { assigned: 'Alice' }, workload: 3, remainingWorkload: 1 },
      { metadata: { assigned: 'Bob' }, workload: 5, remainingWorkload: 5 },
      { metadata: { assigned: 'Alice' }, workload: 2, remainingWorkload: 0 },
      { metadata: {}, workload: 4, remainingWorkload: 2 }, // Unassigned
    ];

    test('should calculate correct totals per assignee', () => {
      const expected = {
        Alice: { total: 2, workload: 5, remainingWorkload: 1 },
        Bob: { total: 1, workload: 5, remainingWorkload: 5 },
      };
      expect(statusUtils.calculateAssignedTaskStats(tasks)).toEqual(expected);
    });

    test('should return empty object for tasks with no assignments', () => {
      const noAssigneeTasks = [
        { metadata: {}, workload: 4, remainingWorkload: 2 },
        { metadata: {}, workload: 1, remainingWorkload: 1 },
      ];
      expect(statusUtils.calculateAssignedTaskStats(noAssigneeTasks)).toEqual({});
    });

    test('should return empty object for empty task list', () => {
      expect(statusUtils.calculateAssignedTaskStats([])).toEqual({});
    });
  });

  describe('calculateAIMetrics()', () => {
    const tasks = [
      { metadata: { tags: ['ai-interaction', 'type-a'] } },
      { metadata: { tags: ['ai-interaction', 'type-b'] } },
      { metadata: { tags: ['some-tag'] } },
      { metadata: { tags: ['ai-interaction', 'type-a'] } },
      { metadata: {} },
    ];

    test('should calculate correct AI interaction counts', () => {
      const expected = {
        total: 3,
        byType: {
          'type-a': 2,
          'type-b': 1,
        },
      };
      expect(statusUtils.calculateAIMetrics(tasks)).toEqual(expected);
    });

    test('should return null if no AI interaction tags found', () => {
      const noAiTasks = [
        { metadata: { tags: ['some-tag'] } },
        { metadata: {} },
      ];
      expect(statusUtils.calculateAIMetrics(noAiTasks)).toBeNull();
    });

    test('should return null for empty task list', () => {
      expect(statusUtils.calculateAIMetrics([])).toBeNull();
    });
  });

  describe('calculateRelationMetrics()', () => {
    const tasks = [
      { relations: [{ type: 'parent-of', task: 'child1' }] }, // Parent 1
      { relations: [{ type: 'child-of', task: 'parent1' }] }, // Child 1
      { relations: [{ type: 'blocks', task: 'task-a' }] },   // Other relation
      { relations: [{ type: 'parent-of', task: 'child2' }] }, // Parent 2
      { relations: [{ type: 'child-of', task: 'parent2' }, { type: 'child-of', task: 'parent3' }] }, // Child 2, 3
      { metadata: {} }, // No relations
    ];

    test('should calculate correct parent/child counts', () => {
      const expected = {
        parentTasks: 2,
        childTasks: 2,
      };
      expect(statusUtils.calculateRelationMetrics(tasks)).toEqual(expected);
    });

    test('should return null if no parent/child relations found', () => {
      const noRelationsTasks = [
        { relations: [{ type: 'blocks', task: 'task-a' }] },
        { metadata: {} },
      ];
      expect(statusUtils.calculateRelationMetrics(noRelationsTasks)).toBeNull();
    });

    test('should return null for empty task list', () => {
      expect(statusUtils.calculateRelationMetrics([])).toBeNull();
    });
  });

  describe('calculateColumnWorkloads()', () => {
    const tasks = [
      { column: 'Todo', workload: 3, remainingWorkload: 3 },
      { column: 'In Progress', workload: 5, remainingWorkload: 2 },
      { column: 'Todo', workload: 2, remainingWorkload: 2 },
      { column: 'Done', workload: 4, remainingWorkload: 0 },
    ];
    const columnNames = ['Todo', 'In Progress', 'Done'];

    test('should calculate correct total and per-column workloads', () => {
      const expected = {
        totalWorkload: 14,
        totalRemainingWorkload: 7,
        columnWorkloads: {
          Todo: { workload: 5, remainingWorkload: 5 },
          'In Progress': { workload: 5, remainingWorkload: 2 },
          Done: { workload: 4, remainingWorkload: 0 },
        },
      };
      expect(statusUtils.calculateColumnWorkloads(tasks, columnNames)).toEqual(expected);
    });

    test('should handle empty task list', () => {
      const expected = {
        totalWorkload: 0,
        totalRemainingWorkload: 0,
        columnWorkloads: {
          Todo: { workload: 0, remainingWorkload: 0 },
          'In Progress': { workload: 0, remainingWorkload: 0 },
          Done: { workload: 0, remainingWorkload: 0 },
        },
      };
      expect(statusUtils.calculateColumnWorkloads([], columnNames)).toEqual(expected);
    });
  });

  describe('calculateDueTasks()', () => {
    const tasks = [
      { id: 'task1', workload: 3, progress: 0.5, remainingWorkload: 1.5, dueData: { dueMessage: 'Overdue', other: 'data' } },
      { id: 'task2', workload: 5, progress: 0, remainingWorkload: 5, dueData: { dueMessage: 'Remaining', x: 'y' } },
      { id: 'task3', workload: 2, progress: 1, remainingWorkload: 0 }, // No dueData
    ];

    test('should return array of tasks with dueData, including specific fields', () => {
      const expected = [
        {
          task: 'task1',
          workload: 3,
          progress: 0.5,
          remainingWorkload: 1.5,
          dueMessage: 'Overdue',
          other: 'data',
        },
        {
          task: 'task2',
          workload: 5,
          progress: 0,
          remainingWorkload: 5,
          dueMessage: 'Remaining',
          x: 'y',
        },
      ];
      expect(statusUtils.calculateDueTasks(tasks)).toEqual(expected);
    });

    test('should return empty array if no tasks have dueData', () => {
      const noDueTasks = [
        { id: 'task3', workload: 2, progress: 1, remainingWorkload: 0 },
        { id: 'task4', workload: 1, progress: 0, remainingWorkload: 1 },
      ];
      expect(statusUtils.calculateDueTasks(noDueTasks)).toEqual([]);
    });

    test('should return empty array for empty task list', () => {
      expect(statusUtils.calculateDueTasks([])).toEqual([]);
    });
  });

  // --- Tests for Functions with Dependencies (Mocks needed) ---

  describe('calculateTaskWorkloads()', () => {
    const index = { columns: { Todo: ['task1'], Done: ['task2'] } }; // Provide minimal index structure
    const tasks = [
      { id: 'task1', metadata: {}, workload: 3, progress: 0.5, remainingWorkload: 1.5 },
      { id: 'task2', metadata: {}, workload: 5, progress: 1, remainingWorkload: 0 },
    ];

    test('should map tasks and call taskUtils.taskCompleted', () => {
      // Mock taskUtils.taskCompleted to return specific values
      taskUtils.taskCompleted.mockImplementation((idx, task) => task.id === 'task2');

      const expected = {
        task1: {
          workload: 3,
          progress: 0.5,
          remainingWorkload: 1.5,
          completed: false,
        },
        task2: {
          workload: 5,
          progress: 1,
          remainingWorkload: 0,
          completed: true,
        },
      };

      const result = statusUtils.calculateTaskWorkloads(index, tasks);
      expect(result).toEqual(expected);
      expect(taskUtils.taskCompleted).toHaveBeenCalledTimes(2);
      expect(taskUtils.taskCompleted).toHaveBeenCalledWith(index, tasks[0]);
      expect(taskUtils.taskCompleted).toHaveBeenCalledWith(index, tasks[1]);
    });
  });

  describe('calculateSprintStats()', () => {
    const mockTaskWorkloadResult = { count: 2, workload: 5, remaining: 1 };
    // Provide tasks with metadata structure needed by the mocked function's real implementation path
    const tasks = [
      { id: 't1', metadata: { created: new Date(2024, 4, 2), started: new Date(2024, 4, 9) } },
      { id: 't2', metadata: { created: new Date(2024, 4, 9), completed: new Date(2024, 4, 12), deployDate: new Date(2024, 4, 13) } },
    ];
    const index = {
      options: {
        sprints: [
          { name: 'Sprint 1', start: new Date(2024, 4, 1) },
          { name: 'Sprint 2', start: new Date(2024, 4, 8), description: 'Second sprint' },
        ],
        customFields: [
          { name: 'deployDate', type: 'date' },
          { name: 'storyPoints', type: 'number' }, // Non-date field
        ],
      },
    };

    test('should calculate stats for the current sprint by default', () => {
      indexUtils.taskWorkloadInPeriod.mockReturnValue(mockTaskWorkloadResult);
      const result = statusUtils.calculateSprintStats(index, tasks);

      expect(result.number).toBe(2);
      expect(result.name).toBe('Sprint 2');
      expect(result.description).toBe('Second sprint');
      expect(result.created).toBe(mockTaskWorkloadResult);
      expect(result.started).toBe(mockTaskWorkloadResult);
      expect(result.completed).toBe(mockTaskWorkloadResult);
      expect(result.due).toBe(mockTaskWorkloadResult);
      expect(result.deployDate).toBe(mockTaskWorkloadResult); // Check custom date field
      expect(result.storyPoints).toBeUndefined(); // Non-date custom field ignored
      expect(indexUtils.taskWorkloadInPeriod).toHaveBeenCalledTimes(5); // created, started, completed, due, deployDate
    });

    test('should calculate stats for a specific sprint by number', () => {
      indexUtils.taskWorkloadInPeriod.mockReturnValue({ count: 1, workload: 3, remaining: 2 });
      const result = statusUtils.calculateSprintStats(index, tasks, 1);

      expect(result.number).toBe(1);
      expect(result.name).toBe('Sprint 1');
      expect(result.created).toEqual({ count: 1, workload: 3, remaining: 2 });
      expect(result.end).toEqual(index.options.sprints[1].start); // Should end when next sprint starts
    });

    test('should calculate stats for a specific sprint by name', () => {
      indexUtils.taskWorkloadInPeriod.mockReturnValue({ count: 0, workload: 0, remaining: 0 });
      const result = statusUtils.calculateSprintStats(index, tasks, 'Sprint 2');

      expect(result.number).toBe(2);
      expect(result.name).toBe('Sprint 2');
      expect(result.created).toEqual({ count: 0, workload: 0, remaining: 0 });
      expect(result.end).toBeUndefined(); // Current sprint doesn't have defined end yet
    });

    test('should return null if no sprints defined in index', () => {
      const noSprintIndex = { options: {} };
      expect(statusUtils.calculateSprintStats(noSprintIndex, tasks)).toBeNull();
    });

    test('should throw error for invalid sprint number/name', () => {
      expect(() => statusUtils.calculateSprintStats(index, tasks, 3)).toThrow('Sprint 3 does not exist');
      expect(() => statusUtils.calculateSprintStats(index, tasks, 'Invalid Name')).toThrow('No sprint found with name "Invalid Name"');
    });
  });

  describe('calculatePeriodStats()', () => {
    const mockTaskWorkloadResult = { count: 5, workload: 10, remaining: 3 };
    // Provide tasks with metadata structure needed by the mocked function's real implementation path
    const tasks = [
      { id: 't1', metadata: { created: new Date(2024, 4, 2), started: new Date(2024, 4, 9), reviewDate: new Date(2024, 4, 11) } },
      { id: 't2', metadata: { created: new Date(2024, 4, 9), completed: new Date(2024, 4, 12) } },
    ];
    const index = {
      options: {
        customFields: [
          { name: 'reviewDate', type: 'date' },
          { name: 'cost', type: 'number' },
        ],
      },
    };
    const date1 = new Date(2024, 4, 10);
    const date2 = new Date(2024, 4, 20);

    test('should return null if no dates provided', () => {
      expect(statusUtils.calculatePeriodStats(index, tasks, null)).toBeNull();
      expect(statusUtils.calculatePeriodStats(index, tasks, [])).toBeNull();
    });

    test('should calculate stats for a single date (full day)', () => {
      indexUtils.taskWorkloadInPeriod.mockReturnValue(mockTaskWorkloadResult);
      const result = statusUtils.calculatePeriodStats(index, tasks, [date1]);

      const expectedStart = new Date(2024, 4, 10, 0, 0, 0, 0);
      const expectedEnd = new Date(2024, 4, 10, 23, 59, 59, 999);

      expect(result.start).toEqual(expectedStart);
      expect(result.end).toEqual(expectedEnd);
      expect(result.created).toBe(mockTaskWorkloadResult);
      expect(result.started).toBe(mockTaskWorkloadResult);
      expect(result.completed).toBe(mockTaskWorkloadResult);
      expect(result.due).toBe(mockTaskWorkloadResult);
      expect(result.reviewDate).toBe(mockTaskWorkloadResult); // Check custom date field
      expect(result.cost).toBeUndefined(); // Non-date custom field ignored
      expect(indexUtils.taskWorkloadInPeriod).toHaveBeenCalledTimes(5);
      expect(indexUtils.taskWorkloadInPeriod).toHaveBeenCalledWith(tasks, 'created', expectedStart, expectedEnd);
    });

    test('should calculate stats for a date range', () => {
      indexUtils.taskWorkloadInPeriod.mockReturnValue({ count: 1, workload: 1, remaining: 1 });
      const result = statusUtils.calculatePeriodStats(index, tasks, [date1, date2]); // Order shouldn't matter
      const resultReverse = statusUtils.calculatePeriodStats(index, tasks, [date2, date1]);

      expect(result.start).toEqual(date1);
      expect(result.end).toEqual(date2);
      expect(result.created).toEqual({ count: 1, workload: 1, remaining: 1 });
      expect(resultReverse.start).toEqual(date1);
      expect(resultReverse.end).toEqual(date2);
      expect(resultReverse.created).toEqual({ count: 1, workload: 1, remaining: 1 });
    });
  });
});
  // });

  // describe('calculateSprintStats()', () => {
  //   // TODO: Add tests using mocks for indexUtils.taskWorkloadInPeriod
  // });

  // describe('calculatePeriodStats()', () => {
  //   // TODO: Add tests using mocks for indexUtils.taskWorkloadInPeriod
  // });
});
