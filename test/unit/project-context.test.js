const mockRequire = require('mock-require');

// Set test environment
process.env.KANBN_ENV = 'test';

// Create mock Kanbn class with different column scenarios
class MockKanbnNoColumns {
  async getIndex() {
    return {
      name: 'Test Project',
      description: 'Test project with no columns'
    };
  }
  
  async loadAllTrackedTasks() {
    return [];
  }
  
  async status() {
    return {};
  }
}

class MockKanbnWithColumns {
  async getIndex() {
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
    return [
      {
        id: 'task-1',
        name: 'Task 1',
        description: 'This is task 1',
        metadata: {
          tags: ['high-priority'],
          due: '2025-05-01'
        }
      },
      {
        id: 'task-2',
        name: 'Task 2',
        description: 'This is task 2',
        metadata: {
          tags: ['medium-priority']
        }
      },
      {
        id: 'task-3',
        name: 'Task 3',
        description: 'This is task 3',
        metadata: {
          tags: ['high-priority', 'bug']
        }
      },
      {
        id: 'task-4',
        name: 'Task 4',
        description: 'This is task 4',
        metadata: {}
      },
      {
        id: 'task-5',
        name: 'Task 5',
        description: 'This is task 5',
        metadata: {
          tags: ['feature'],
          references: ['REF-123', 'REF-456']
        }
      }
    ];
  }
  
  async status() {
    return {
      total: 5,
      completed: 2,
      inProgress: 1,
      todo: 2
    };
  }
}

// Original module to restore after tests
let originalProjectContext;

describe('Project Context tests', () => {
  beforeAll(() => {
    // Store the original module
    originalProjectContext = require('../../src/lib/project-context');
  });
  
  afterAll(() => {
    // Restore the original module
    mockRequire('../../src/lib/project-context', originalProjectContext);
    mockRequire.stopAll();
  });

  test('should handle projects with no columns', async () => {
    // Load the module with our mock
    const ProjectContext = require('../../src/lib/project-context');
    
    // Create a new ProjectContext instance with mock Kanbn
    const pc1 = new ProjectContext(new MockKanbnNoColumns());
    
    // Get project context
    const ctx1 = await pc1.getContext();
    
    // Verify that default columns are created
    expect(ctx1.projectName).toBe('Test Project');
    expect(ctx1.projectDescription).toBe('Test project with no columns');
    expect(Array.isArray(ctx1.columns)).toBeTruthy();
    expect(ctx1.columns).toHaveLength(1);
    expect(ctx1.columns[0]).toBe('Backlog');
    expect(ctx1.taskCount).toBe(0);
  });

  test('should properly extract project context with columns', async () => {
    // Load the module with our mock
    const ProjectContext = require('../../src/lib/project-context');
    
    // Create a new ProjectContext instance with mock Kanbn
    const pc2 = new ProjectContext(new MockKanbnWithColumns());
    
    // Get project context
    const ctx2 = await pc2.getContext();
    
    // Verify project context
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
    // Load the module with our mock
    const ProjectContext = require('../../src/lib/project-context');
    
    // Create a new ProjectContext instance with mock Kanbn
    const pc3 = new ProjectContext(new MockKanbnWithColumns());
    
    // Get project context with references
    const ctx3 = await pc3.getContext(true);
    
    // Verify references
    expect(ctx3.references).toBeDefined();
    expect(ctx3.references['task-5']).toBeDefined();
    expect(ctx3.references['task-5']).toHaveLength(2);
    expect(ctx3.references['task-5']).toEqual(['REF-123', 'REF-456']);
  });

  test('should extract board data for AI context', async () => {
    // Load the module with our mock
    const ProjectContext = require('../../src/lib/project-context');
    
    // Create a new ProjectContext instance with mock Kanbn
    const pc4 = new ProjectContext(new MockKanbnWithColumns());
    
    // Get project context
    const ctx4 = await pc4.getContext();
    
    // Extract board data
    const boardData = pc4.extractBoardData(ctx4);
    
    // Verify board data
    expect(boardData).toContain('Here is the current state of your board:');
    expect(boardData).toContain('Backlog (2 tasks):');
    expect(boardData).toContain('In Progress (1 tasks):');
    expect(boardData).toContain('Done (2 tasks):');
    expect(boardData).toContain('task-1: Task 1');
    expect(boardData).toContain('task-3: Task 3');
    expect(boardData).toContain('(Due: 2025-05-01)');
  });

  test('should create system message with focus on tasks', async () => {
    // Load the module with our mock
    const ProjectContext = require('../../src/lib/project-context');
    
    // Create a new ProjectContext instance with mock Kanbn
    const pc5 = new ProjectContext(new MockKanbnWithColumns());
    
    // Get project context
    const ctx5 = await pc5.getContext();
    
    // Create system message
    const systemMessage = pc5.createSystemMessage(ctx5);
    
    // Verify system message
    expect(systemMessage.role).toBe('system');
    expect(systemMessage.content).toContain('FOCUS ON TASKS');
    expect(systemMessage.content).toContain('DO NOT suggest new columns');
    expect(systemMessage.content).toContain('Backlog, In Progress, Done');
    expect(systemMessage.content).toContain('task-1: Task 1');
  });
});
