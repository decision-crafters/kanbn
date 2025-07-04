const { createTestEnvironment, assertions } = require('../migration-utils');
const kanbnFactory = require('../../src/main');
const fixtures = require('../fixtures');
const mockDate = require('mockdate');

describe('status tests', () => {
  let env;
  let testData;

  beforeEach(() => {
    mockDate.set('02 Jan 2000 00:00:00 GMT');
    env = createTestEnvironment('status-tests');
    testData = env.setup({
      countTasks: 0,
      columnNames: ['Column 1', 'Column 2', 'Column 3']
    });
  });

  afterEach(() => {
    env.cleanup();
    mockDate.reset();
  });

  // Helper function to create fixtures in real filesystem
  const createFixtures = (fixtureConfig) => {
    // Change to the test directory before creating fixtures
    const originalCwd = process.cwd();
    process.chdir(testData.testDir);
    
    try {
      return fixtures(fixtureConfig);
    } finally {
      process.chdir(originalCwd);
    }
  };

test('Status in uninitialised folder should throw "not initialised" error', async () => {
    const uninitDir = env.createUninitializedDir();
    const uninitKanbn = kanbnFactory(uninitDir);
    
    await assertions.expectError(
      uninitKanbn.status(),
      /Not initialised in this folder/
    );
  });

test('Status untracked and quiet, no untracked tasks', async () => {
    const kanbn = kanbnFactory(testData.testDir);
    await kanbn.initialise();

    // Get status with untracked and quiet options
    expect(await kanbn.status(true, true)).toEqual([]);
  });

test('Status untracked and quiet should return list of untracked tasks', async () => {
    const kanbn = kanbnFactory(testData.testDir);
    await kanbn.initialise();

    // Add some untracked files
    createFixtures({
      tasks: [
        {
          name: 'Task 1',
          untracked: true
        },
        {
          name: 'Task 2',
          untracked: true
        },
        {
          name: 'Task 3',
          untracked: true
        }
      ]
    });
    expect(await kanbn.status(true, true)).toEqual([
      'task-1.md',
      'task-2.md',
      'task-3.md'
    ]);
  });

test('Status quiet should show basic status information', async () => {
    const kanbn = kanbnFactory(testData.testDir);
    createFixtures({
      name: 'test',
      tasks: [
        {
          name: 'Task 1'
        },
        {
          name: 'Task 2'
        },
        {
          name: 'Task 3'
        },
        {
          name: 'Task 4'
        }
      ],
      columns: {
        'Column 1': [
          'task-1'
        ],
        'Column 2': [
          'task-2'
        ],
        'Column 3': [
          'task-3',
          'task-4'
        ]
      }
    });
    expect(await kanbn.status(true)).toEqual({
      name: 'test',
      tasks: 4,
      columnTasks: {
        'Column 1': 1,
        'Column 2': 1,
        'Column 3': 2
      }
  });

  test('Status non-quiet should show more status information', async () => {
    const kanbn = kanbnFactory(testData.testDir);
    createFixtures({
      tasks: [
        {
          name: 'Task 1',
          metadata: {
            tags: ['Small'],
            assigned: 'User 1'
          }
        },
        {
          name: 'Task 2',
          metadata: {
            tags: ['Medium', 'Tiny'],
            assigned: 'User 1'
          }
        },
        {
          name: 'Task 3',
          metadata: {
            tags: ['Large'],
            assigned: 'User 2'
          }
        },
        {
          name: 'Task 4',
          metadata: {
            tags: ['Huge'],
            assigned: 'User 2'
          }
        }
      ],
      columns: {
        'Column 1': [
          'task-1'
        ],
        'Column 2': [
          'task-2'
        ],
        'Column 3': [
          'task-3',
          'task-4'
        ]
      }
    });
    expect(await kanbn.status()).toEqual({
      name: 'test',
      tasks: 4,
      columnTasks: {
        'Column 1': 1,
        'Column 2': 1,
        'Column 3': 2
      },
      totalWorkload: 19,
      totalRemainingWorkload: 19,
      columnWorkloads: {
        'Column 1': {
          workload: 2,
          remainingWorkload: 2
        },
        'Column 2': {
          workload: 4,
          remainingWorkload: 4
        },
        'Column 3': {
          workload: 13,
          remainingWorkload: 13
        }
      },
      taskWorkloads: {
        'task-1': {
          workload: 2,
          progress: 0,
          remainingWorkload: 2,
          completed: false
        },
        'task-2': {
          workload: 4,
          progress: 0,
          remainingWorkload: 4,
          completed: false
        },
        'task-3': {
          workload: 5,
          progress: 0,
          remainingWorkload: 5,
          completed: false
        },
        'task-4': {
          workload: 8,
          progress: 0,
          remainingWorkload: 8,
          completed: false
        }
      },
      assigned: {
        'User 1': {
          total: 2,
          workload: 6,
          remainingWorkload: 6
        },
        'User 2': {
          total: 2,
          workload: 13,
          remainingWorkload: 13
        }
      }
    });
  });

test('Status non-quiet with due data should show due tasks information', async () => {
  const kanbn = kanbnFactory(testData.testDir);
  await kanbn.initialise();
  
  createFixtures({
    noRandom: true,
    tasks: [
      {
        name: 'Task 1',
        metadata: {
          tags: ['Small'],
          assigned: 'User 1',
          due: new Date('01 Jan 2000 00:00:00 GMT')
        }
      },
      {
        name: 'Task 2',
        metadata: {
          tags: ['Medium', 'Tiny'],
          assigned: 'User 1',
          due: new Date('03 Jan 2000 00:00:00 GMT')
        }
      },
      {
        name: 'Task 3',
        metadata: {
          tags: ['Large'],
          assigned: 'User 2',
          due: new Date('01 Jan 2000 22:30:00 GMT')
        }
      },
      {
        name: 'Task 4',
        metadata: {
          tags: ['Huge'],
          assigned: 'User 2'
        }
      },
      {
        name: 'Task 5',
        metadata: {
          tags: ['Tiny'],
          assigned: 'User 1',
          due: new Date('01 Jan 2000 22:30:00 GMT'),
          completed: new Date('01 Jan 2000 22:00:00 GMT')
        }
      },
      {
        name: 'Task 6',
        metadata: {
          tags: ['Small'],
          assigned: 'User 1',
          due: new Date('02 Jan 2000 02:00:00 GMT')
        }
      }
    ],
    columns: {
      'Column 1': [
        'task-1'
      ],
      'Column 2': [
        'task-2',
        'task-5'
      ],
      'Column 3': [
        'task-3',
        'task-4',
        'task-6'
      ]
    },
    options: {
      completedColumns: [
        'Column 3'
      ]
    }
  });
  expect(await kanbn.status(false, false, true)).toEqual({
    name: 'test',
    tasks: 6,
    columnTasks: {
      'Column 1': 1,
      'Column 2': 2,
      'Column 3': 3
    },
    completedTasks: 3,
    totalWorkload: 22,
    totalRemainingWorkload: 6,
    columnWorkloads: {
      'Column 1': {
        workload: 2,
        remainingWorkload: 2
      },
      'Column 2': {
        workload: 5,
        remainingWorkload: 4
      },
      'Column 3': {
        workload: 15,
        remainingWorkload: 0
      }
    },
    taskWorkloads: {
      'task-1': {
        workload: 2,
        progress: 0,
        remainingWorkload: 2,
        completed: false
      },
      'task-2': {
        workload: 4,
        progress: 0,
        remainingWorkload: 4,
        completed: false
      },
      'task-3': {
        workload: 5,
        progress: 1,
        remainingWorkload: 0,
        completed: true
      },
      'task-4': {
        workload: 8,
        progress: 1,
        remainingWorkload: 0,
        completed: true
      },
      'task-5': {
        workload: 1,
        progress: 1,
        remainingWorkload: 0,
        completed: true
      },
      'task-6': {
        workload: 2,
        progress: 1,
        remainingWorkload: 0,
        completed: true
      }
    },
    assigned: {
      'User 1': {
        total: 4,
        workload: 9,
        remainingWorkload: 6
      },
      'User 2': {
        total: 2,
        workload: 13,
        remainingWorkload: 0
      }
    },
    dueTasks: [
      {
        task: 'task-1',
        workload: 2,
        progress: 0,
        remainingWorkload: 2,
        completed: false,
        completedDate: null,
        dueDate: new Date('2000-01-01T00:00:00.000Z'),
        overdue: true,
        dueDelta: 86400000,
        dueMessage: '1 day overdue'
      },
      {
        task: 'task-2',
        workload: 4,
        progress: 0,
        remainingWorkload: 4,
        completed: false,
        completedDate: null,
        dueDate: new Date('2000-01-03T00:00:00.000Z'),
        overdue: false,
        dueDelta: -86400000,
        dueMessage: '1 day remaining'
      },
      {
        task: 'task-5',
        workload: 1,
        progress: 1,
        remainingWorkload: 0,
        completed: true,
        completedDate: new Date('2000-01-01T22:00:00.000Z'),
        dueDate: new Date('2000-01-01T22:30:00.000Z'),
        overdue: false,
        dueDelta: -1800000,
        dueMessage: 'Completed 30 minutes remaining'
      },
      {
        task: 'task-3',
        workload: 5,
        progress: 1,
        remainingWorkload: 0,
        completed: true,
        completedDate: null,
        dueDate: new Date('2000-01-01T22:30:00.000Z'),
        overdue: false,
        dueDelta: 5400000,
        dueMessage: 'Completed 1 hour, 30 minutes overdue'
      },
      {
        task: 'task-6',
        workload: 2,
        progress: 1,
        remainingWorkload: 0,
        completed: true,
        completedDate: null,
        dueDate: new Date('2000-01-02T02:00:00.000Z'),
        overdue: false,
        dueDelta: -7200000,
        dueMessage: 'Completed 2 hours remaining'
      }
    ],
  });
  
  const result = await kanbn.status(false, false, true);
  expect(result).toEqual({
    name: 'test',
    tasks: 6,
    columnTasks: {
      'Column 1': 1,
      'Column 2': 2,
      'Column 3': 3
    },
    completedTasks: 3,
    totalWorkload: 22,
    totalRemainingWorkload: 6,
    columnWorkloads: {
      'Column 1': {
        workload: 2,
        remainingWorkload: 2
      },
      'Column 2': {
        workload: 5,
        remainingWorkload: 4
      },
      'Column 3': {
        workload: 15,
        remainingWorkload: 0
      }
    },
    taskWorkloads: {
      'task-1': {
        workload: 2,
        progress: 0,
        remainingWorkload: 2,
        completed: false
      },
      'task-2': {
        workload: 4,
        progress: 0,
        remainingWorkload: 4,
        completed: false
      },
      'task-3': {
        workload: 5,
        progress: 1,
        remainingWorkload: 0,
        completed: true
      },
      'task-4': {
        workload: 8,
        progress: 1,
        remainingWorkload: 0,
        completed: true
      },
      'task-5': {
        workload: 1,
        progress: 1,
        remainingWorkload: 0,
        completed: true
      },
      'task-6': {
        workload: 2,
        progress: 1,
        remainingWorkload: 0,
        completed: true
      }
    },
    assigned: {
      'User 1': {
        total: 4,
        workload: 9,
        remainingWorkload: 6
      },
      'User 2': {
        total: 2,
        workload: 13,
        remainingWorkload: 0
      }
    },
    dueTasks: [
      {
        task: 'task-1',
        workload: 2,
        progress: 0,
        remainingWorkload: 2,
        completed: false,
        completedDate: null,
        dueDate: new Date('2000-01-01T00:00:00.000Z'),
        overdue: true,
        dueDelta: 86400000,
        dueMessage: '1 day overdue'
      },
      {
        task: 'task-2',
        workload: 4,
        progress: 0,
        remainingWorkload: 4,
        completed: false,
        completedDate: null,
        dueDate: new Date('2000-01-03T00:00:00.000Z'),
        overdue: false,
        dueDelta: -86400000,
        dueMessage: '1 day remaining'
      },
      {
        task: 'task-5',
        workload: 1,
        progress: 1,
        remainingWorkload: 0,
        completed: true,
        completedDate: new Date('2000-01-01T22:00:00.000Z'),
        dueDate: new Date('2000-01-01T22:30:00.000Z'),
        overdue: false,
        dueDelta: -1800000,
        dueMessage: 'Completed 30 minutes remaining'
      },
      {
        task: 'task-3',
        workload: 5,
        progress: 1,
        remainingWorkload: 0,
        completed: true,
        completedDate: null,
        dueDate: new Date('2000-01-01T22:30:00.000Z'),
        overdue: false,
        dueDelta: 5400000,
        dueMessage: 'Completed 1 hour, 30 minutes overdue'
      },
      {
        task: 'task-6',
        workload: 2,
        progress: 1,
        remainingWorkload: 0,
        completed: true,
        completedDate: null,
        dueDate: new Date('2000-01-02T02:00:00.000Z'),
        overdue: false,
        dueDelta: -7200000,
        dueMessage: 'Completed 2 hours remaining'
      }
    ]
  });
});

test('Status non-quiet with sprints defined should show sprint information', async () => {
  const kanbn = kanbnFactory(testData.testDir);
  await kanbn.initialise();
  
  createFixtures({
    noRandom: true,
    tasks: [
      {
        name: 'Task 1',
        metadata: {
          tags: ['Small'],
          created: new Date('02 December 1999 00:00:00 GMT'),
          due: new Date('03 December 1999 00:00:00 GMT'),
          test: new Date('04 December 1999 00:00:00 GMT')
        }
      },
      {
        name: 'Task 2',
        metadata: {
          tags: ['Medium'],
          created: new Date('10 December 1999 00:00:00 GMT'),
          completed: new Date('11 December 1999 00:00:00 GMT'),
          test: new Date('12 December 1999 00:00:00 GMT')
        }
      },
      {
        name: 'Task 3',
        metadata: {
          tags: ['Large'],
          created: new Date('16 December 1999 00:00:00 GMT'),
          started: new Date('16 December 1999 01:00:00 GMT'),
          completed: new Date('17 December 1999 00:00:00 GMT'),
          test: new Date('17 December 1999 00:00:00 GMT')
        }
      },
      {
        name: 'Task 4',
        metadata: {
          tags: ['Huge'],
          created: new Date('18 December 1999 00:00:00 GMT'),
          due: new Date('19 December 1999 00:00:00 GMT'),
          test: new Date('20 December 1999 00:00:00 GMT')
        }
      }
    ],
    columns: {
      'Column 1': [
        'task-1'
      ],
      'Column 2': [
        'task-2'
      ],
      'Column 3': [
        'task-3',
        'task-4'
      ]
    },
    options: {
      sprints: [
        {
          name: 'Sprint 1',
          description: 'Test sprint 1',
          start: new Date('01 December 1999 00:00:00 GMT')
        },
        {
          name: 'Sprint 2',
          description: 'Test sprint 2',
          start: new Date('12 December 1999 00:00:00 GMT')
        }
      ],
      customFields: [
        {
          name: 'test',
          type: 'date'
        }
      ]
    }
  });
  expect((await kanbn.status()).sprint).toEqual({
    number: 2,
    name: 'Sprint 2',
    start: new Date('12 December 1999 00:00:00 GMT'),
    description: 'Test sprint 2',
    durationDelta: 1814400000,
    durationMessage: '3 weeks',
    created: {
      tasks: [
        {
          id: 'task-3',
          column: 'Column 3',
          workload: 5
        },
        {
          id: 'task-4',
          column: 'Column 3',
          workload: 8
        }
      ],
      workload: 13
    },
    started: {
      tasks: [
        {
          id: 'task-3',
          column: 'Column 3',
          workload: 5
        }
      ],
      workload: 5
    },
    completed: {
      tasks: [
        {
          id: 'task-3',
          column: 'Column 3',
          workload: 5
        }
      ],
      workload: 5
    },
    due: {
      tasks: [
        {
          id: 'task-4',
          column: 'Column 3',
          workload: 8
        }
      ],
      workload: 8
    },
    test: {
      tasks: [
        {
          id: 'task-2',
          column: 'Column 2',
          workload: 3
        },
        {
          id: 'task-3',
          column: 'Column 3',
          workload: 5
        },
        {
          id: 'task-4',
          column: 'Column 3',
          workload: 8
        }
      ],
      workload: 16
    }
  });
  });
});

test('Status non-quiet with specific sprint by number', async () => {
  const kanbn = kanbnFactory(testData.testDir);
  await kanbn.initialise();
  
  createFixtures({
    noRandom: true,
    tasks: [
      {
        name: 'Task 1',
        metadata: {
          tags: ['Small'],
          created: new Date('02 December 1999 00:00:00 GMT'),
          due: new Date('03 December 1999 00:00:00 GMT')
        }
      },
      {
        name: 'Task 2',
        metadata: {
          tags: ['Medium'],
          created: new Date('10 December 1999 00:00:00 GMT'),
          completed: new Date('11 December 1999 00:00:00 GMT')
        }
      },
      {
        name: 'Task 3',
        metadata: {
          tags: ['Large'],
          created: new Date('16 December 1999 00:00:00 GMT'),
          started: new Date('16 December 1999 00:00:00 GMT'),
          completed: new Date('17 December 1999 00:00:00 GMT')
        }
      },
      {
        name: 'Task 4',
        metadata: {
          tags: ['Huge'],
          created: new Date('18 December 1999 00:00:00 GMT'),
          due: new Date('19 December 1999 00:00:00 GMT')
        }
      }
    ],
    columns: {
      'Column 1': [
        'task-1'
      ],
      'Column 2': [
        'task-2'
      ],
      'Column 3': [
        'task-3',
        'task-4'
      ]
    },
    options: {
      sprints: [
        {
          name: 'Sprint 1',
          description: 'Test sprint 1',
          start: new Date('01 December 1999 00:00:00 GMT')
        },
        {
          name: 'Sprint 2',
          description: 'Test sprint 2',
          start: new Date('12 December 1999 00:00:00 GMT')
        }
      ]
    },
    noRandom: true
  });
  
  const status = await kanbn.status(false, false, false, 1);
  expect('sprint' in status).toBe(true);
  expect(status.sprint).toEqual({
    current: 2,
    number: 1,
    name: 'Sprint 1',
    start: new Date('01 December 1999 00:00:00 GMT'),
    description: 'Test sprint 1',
    durationDelta: 950400000,
    durationMessage: '1 week, 4 days',
    created: {
      tasks: [
        {
          id: 'task-1',
          column: 'Column 1',
          workload: 2
        },
        {
          id: 'task-2',
          column: 'Column 2',
          workload: 3
        }
      ],
      workload: 5
    },
    started: {
      tasks: [],
      workload: 0
    },
    completed: {
      tasks: [
        {
          id: 'task-2',
          column: 'Column 2',
          workload: 3
        }
      ],
      workload: 3
    },
    due: {
      tasks: [
        {
          id: 'task-1',
          column: 'Column 1',
          workload: 2
        }
      ],
      workload: 2
    }
  });

  test('Status non-quiet with specific sprint by name', async () => {
  const kanbn = kanbnFactory(testData.testDir);
  await kanbn.initialise();
  
  createFixtures({
    tasks: [
      {
        name: 'Task 1',
        metadata: {
          tags: ['Small'],
          created: new Date('02 December 1999 00:00:00 GMT'),
          due: new Date('03 December 1999 00:00:00 GMT')
        }
      },
      {
        name: 'Task 2',
        metadata: {
          tags: ['Medium'],
          created: new Date('10 December 1999 00:00:00 GMT'),
          completed: new Date('11 December 1999 00:00:00 GMT')
        }
      },
      {
        name: 'Task 3',
        metadata: {
          tags: ['Large'],
          created: new Date('16 December 1999 00:00:00 GMT'),
          started: new Date('16 December 1999 00:00:00 GMT'),
          completed: new Date('17 December 1999 00:00:00 GMT')
        }
      },
      {
        name: 'Task 4',
        metadata: {
          tags: ['Huge'],
          created: new Date('18 December 1999 00:00:00 GMT'),
          due: new Date('19 December 1999 00:00:00 GMT')
        }
      }
    ],
    columns: {
      'Column 1': [
        'task-1'
      ],
      'Column 2': [
        'task-2'
      ],
      'Column 3': [
        'task-3',
        'task-4'
      ]
    },
    options: {
      sprints: [
        {
          name: 'Sprint 1',
          description: 'Test sprint 1',
          start: new Date('01 December 1999 00:00:00 GMT')
        },
        {
          name: 'Sprint 2',
          description: 'Test sprint 2',
          start: new Date('12 December 1999 00:00:00 GMT')
        }
      ]
    }
  });
  
  const status = await kanbn.status(false, false, false, 'Sprint 1');
  expect('sprint' in status).toBe(true);
  expect(status.sprint).toEqual({
    current: 2,
    number: 1,
    name: 'Sprint 1',
    start: new Date('01 December 1999 00:00:00 GMT'),
    description: 'Test sprint 1',
    durationDelta: 950400000,
    durationMessage: '1 week, 4 days',
    created: {
      tasks: [
        {
          id: 'task-1',
          column: 'Column 1',
          workload: 2
        },
        {
          id: 'task-2',
          column: 'Column 2',
          workload: 3
        }
      ],
      workload: 5
    },
    started: {
      tasks: [],
      workload: 0
    },
    completed: {
      tasks: [
        {
          id: 'task-2',
          column: 'Column 2',
          workload: 3
        }
      ],
      workload: 3
    },
    due: {
      tasks: [
        {
          id: 'task-1',
          column: 'Column 1',
          workload: 2
        }
      ],
      workload: 2
    }
  });
  });
});

test('Status non-quiet with single date', async () => {
  const kanbn = kanbnFactory(testData.testDir);
  await kanbn.initialise();
  
  createFixtures({
    tasks: [
      {
        name: 'Task 1',
        metadata: {
          tags: ['Small'],
          created: new Date('02 December 1999 00:00:00 GMT'),
          due: new Date('03 December 1999 00:00:00 GMT')
        }
      },
      {
        name: 'Task 2',
        metadata: {
          tags: ['Medium'],
          created: new Date('10 December 1999 00:00:00 GMT'),
          completed: new Date('11 December 1999 00:00:00 GMT')
        }
      },
      {
        name: 'Task 3',
        metadata: {
          tags: ['Large'],
          created: new Date('16 December 1999 00:00:00 GMT'),
          started: new Date('16 December 1999 00:00:00 GMT'),
          completed: new Date('17 December 1999 00:00:00 GMT')
        }
      },
      {
        name: 'Task 4',
        metadata: {
          tags: ['Huge'],
          created: new Date('18 December 1999 00:00:00 GMT'),
          due: new Date('19 December 1999 00:00:00 GMT')
        }
      }
    ],
    columns: {
      'Column 1': [
        'task-1'
      ],
      'Column 2': [
        'task-2'
      ],
      'Column 3': [
        'task-3',
        'task-4'
      ]
    },
    noRandom: true
  });
  
  const status = await kanbn.status(false, false, false, null, [new Date('16 December 1999 00:00:00 GMT')]);
  expect('period' in status).toBe(true);
  expect(status.period).toEqual({
    start: new Date('16 December 1999 00:00:00 GMT'),
    end: new Date('16 December 1999 23:59:59:999 GMT'),
    created: {
      tasks: [
        {
          id: 'task-3',
          column: 'Column 3',
          workload: 5
        }
      ],
      workload: 5
    },
    started: {
      tasks: [
        {
          id: 'task-3',
          column: 'Column 3',
          workload: 5
        }
      ],
      workload: 5
    },
    completed: {
      tasks: [],
      workload: 0
    },
    due: {
      tasks: [],
      workload: 0
    }
  });

  test('Status non-quiet with date range', async () => {
  const kanbn = kanbnFactory(testData.testDir);
  await kanbn.initialise();
  
  createFixtures({
    tasks: [
      {
        name: 'Task 1',
        metadata: {
          tags: ['Small'],
          created: new Date('02 December 1999 00:00:00 GMT'),
          due: new Date('03 December 1999 00:00:00 GMT')
        }
      },
      {
        name: 'Task 2',
        metadata: {
          tags: ['Medium'],
          created: new Date('10 December 1999 00:00:00 GMT'),
          completed: new Date('11 December 1999 00:00:00 GMT')
        }
      },
      {
        name: 'Task 3',
        metadata: {
          tags: ['Large'],
          created: new Date('16 December 1999 00:00:00 GMT'),
          started: new Date('16 December 1999 01:00:00 GMT'),
          completed: new Date('17 December 1999 00:00:00 GMT')
        }
      },
      {
        name: 'Task 4',
        metadata: {
          tags: ['Huge'],
          created: new Date('18 December 1999 00:00:00 GMT'),
          due: new Date('19 December 1999 00:00:00 GMT')
        }
      }
    ],
    columns: {
      'Column 1': [
        'task-1'
      ],
      'Column 2': [
        'task-2'
      ],
      'Column 3': [
        'task-3',
        'task-4'
      ]
    },
    noRandom: true
  });
  
  const status = await kanbn.status(false, false, false, null, [
    new Date('16 December 1999 00:00:00 GMT'),
    new Date('20 December 1999 00:00:00 GMT')
  ]);
  expect('period' in status).toBe(true);
  expect(status.period).toEqual({
    start: new Date('16 December 1999 00:00:00 GMT'),
    end: new Date('20 December 1999 00:00:00 GMT'),
    created: {
      tasks: [
        {
          id: 'task-3',
          column: 'Column 3',
          workload: 5
        },
        {
          id: 'task-4',
          column: 'Column 3',
          workload: 8
        }
      ],
      workload: 13
    },
    started: {
      tasks: [
        {
          id: 'task-3',
          column: 'Column 3',
          workload: 5
        }
      ],
      workload: 5
    },
    completed: {
      tasks: [
        {
          id: 'task-3',
          column: 'Column 3',
          workload: 5
        }
      ],
      workload: 5
    },
    due: {
      tasks: [
        {
          id: 'task-4',
          column: 'Column 3',
          workload: 8
        }
      ],
      workload: 8
    }
  });
});
});
});
