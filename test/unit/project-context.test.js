// Set test environment
process.env.KANBN_ENV = 'test';

// Create mock Kanbn class with different column scenarios
class MockKanbnNoColumns {
  constructor() {
    this.paths = {
      kanbn: '/Users/tosinakinosho/kanbn/.kanbn'
    };
  }

  async loadIndex() {
    throw new Error('No index file found');
  }
  
  async loadAllTrackedTasks() {
    return {};
  }
}

class MockKanbnWithColumns {
  constructor() {
    this.paths = {
      kanbn: '/Users/tosinakinosho/kanbn/.kanbn'
    };
  }

  async loadIndex() {
    return {
      name: 'Test Project',
      description: 'Test project with columns',
      columns: {
        'Backlog': ['task-1', 'task-2'],
        'In Progress': ['task-3'],
        'Done': ['task-4', 'task-5']
      }
    };
  }
  
  async loadAllTrackedTasks() {
    return {
      'task-1': {
        id: 'task-1',
        name: 'Task 1',
        description: 'This is task 1',
        metadata: {
          tags: ['high-priority'],
          due: '2025-05-01'
        },
        column: 'Backlog'
      },
      'task-2': {
        id: 'task-2',
        name: 'Task 2',
        description: 'This is task 2',
        metadata: {
          tags: ['medium-priority']
        },
        column: 'Backlog'
      },
      'task-3': {
        id: 'task-3',
        name: 'Task 3',
        description: 'This is task 3',
        metadata: {
          tags: ['high-priority', 'bug']
        },
        column: 'In Progress'
      },
      'task-4': {
        id: 'task-4',
        name: 'Task 4',
        description: 'This is task 4',
        metadata: {},
        column: 'Done'
      },
      'task-5': {
        id: 'task-5',
        name: 'Task 5',
        description: 'This is task 5',
        metadata: {
          tags: ['feature'],
          references: ['REF-123', 'REF-456']
        },
        column: 'Done'
      }
    };
  }
}

describe('Project Context tests', () => {
  let ProjectContext;

  beforeAll(() => {
    // Mock the fs module
    jest.mock('fs', () => ({
      existsSync: jest.fn().mockReturnValue(false),
      readdirSync: jest.fn().mockReturnValue([]),
      statSync: jest.fn().mockReturnValue({ isDirectory: () => true }),
      readFileSync: jest.fn().mockReturnValue(''),
      mkdir: jest.fn().mockResolvedValue(undefined),
      writeFile: jest.fn().mockResolvedValue(undefined),
      readFile: jest.fn().mockResolvedValue(''),
      readdir: jest.fn().mockResolvedValue([]),
      unlink: jest.fn().mockResolvedValue(undefined)
    }));

    // Mock the path module
    jest.mock('path', () => ({
      join: jest.fn().mockImplementation((...args) => args.join('/')),
      basename: jest.fn().mockImplementation((path) => path)
    }));

    // Mock the RAG manager
    jest.mock('../../src/lib/rag-manager', () => {
      return jest.fn().mockImplementation(() => ({
        initialize: jest.fn().mockResolvedValue(undefined),
        loadIntegrations: jest.fn().mockResolvedValue(undefined),
        getRelevantContent: jest.fn().mockResolvedValue('')
      }));
    });

    // Mock the event bus
    jest.mock('../../src/lib/event-bus', () => ({
      emit: jest.fn()
    }));

    // Mock the utility module
    jest.mock('../../src/utility', () => ({
      debugLog: jest.fn()
    }));

    // Load the module with our mocks
    ProjectContext = require('../../src/lib/project-context');
  });

  afterAll(() => {
    jest.resetModules();
  });

  test('should handle projects with no columns', async () => {
    const pc1 = new ProjectContext(new MockKanbnNoColumns());
    const ctx1 = await pc1.getContext();
    
    expect(ctx1.projectName).toBe('Kanbn Project');
    expect(ctx1.projectDescription).toBe('A kanban board project');
    expect(ctx1.columns).toBeDefined();
    expect(Array.isArray(ctx1.columns)).toBeTruthy();
    expect(ctx1.columns).toEqual(['Backlog', 'In Progress', 'Done']);
    expect(ctx1.taskCount).toBe(0);
  });

  test('should properly extract project context with columns', async () => {
    const pc2 = new ProjectContext(new MockKanbnWithColumns());
    const ctx2 = await pc2.getContext();
    
    expect(ctx2.projectName).toBe('Test Project');
    expect(ctx2.projectDescription).toBe('Test project with columns');
    expect(ctx2.columns).toBeDefined();
    expect(ctx2.columns).toHaveLength(3);
    expect(ctx2.columns).toContain('Backlog');
    expect(ctx2.columns).toContain('In Progress');
    expect(ctx2.columns).toContain('Done');
    expect(ctx2.taskCount).toBe(5);
  });

  test('should include references when requested', async () => {
    const pc3 = new ProjectContext(new MockKanbnWithColumns());
    const ctx3 = await pc3.getContext(true);
    
    expect(ctx3.tasks).toBeDefined();
    expect(ctx3.tasks['task-5']).toBeDefined();
    expect(ctx3.tasks['task-5'].metadata.references).toBeDefined();
    expect(ctx3.tasks['task-5'].metadata.references).toEqual(['REF-123', 'REF-456']);
  });

  test('should extract enhanced board data', async () => {
    const pc4 = new ProjectContext(new MockKanbnWithColumns());
    const ctx4 = await pc4.getContext();
    
    const boardData = pc4.extractEnhancedBoardData(ctx4);
    
    expect(boardData).toContain('Current Tasks:');
    expect(boardData).toContain('task-1: Task 1');
    expect(boardData).toContain('Description: This is task 1');
    expect(boardData).toContain('task-3: Task 3');
    expect(boardData).toContain('Description: This is task 3');
  });

  test('should create system message with focus on tasks', async () => {
    const pc5 = new ProjectContext(new MockKanbnWithColumns());
    const ctx5 = await pc5.getContext();
    
    const systemMessage = await pc5.createSystemMessage(ctx5);
    
    expect(systemMessage.role).toBe('system');
    expect(systemMessage.content).toContain('You are a helpful project management assistant');
    expect(systemMessage.content).toContain('task-1: Task 1');
    expect(systemMessage.content).toContain('task-5: Task 5');
  });
});
