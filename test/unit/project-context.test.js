const QUnit = require('qunit');
const path = require('path');
const fs = require('fs');
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

  test('should handle projects with no columns', async function(assert) {
  // Load the module with our mock
  const ProjectContext = require('../../src/lib/project-context');
  
  // Create a new ProjectContext instance with mock Kanbn
  const projectContext = new ProjectContext(new MockKanbnNoColumns());
  
  // Get project context
  const context = await projectContext.getContext();
  
  // Verify that default columns are created
  expect(context.projectName).toEqual('Test Project');
  expect(context.projectDescription).toEqual('Test project with no columns');
  expect(Array.isArray(context.columns).toBeTruthy(), 'Columns should be an array');
  expect(context.columns.length).toEqual(1);
  expect(context.columns[0]).toEqual('Backlog');
  expect(context.taskCount).toEqual(0);
});

  test('should properly extract project context with columns', async function(assert) {
  // Load the module with our mock
  const ProjectContext = require('../../src/lib/project-context');
  
  // Create a new ProjectContext instance with mock Kanbn
  const projectContext = new ProjectContext(new MockKanbnWithColumns());
  
  // Get project context
  const context = await projectContext.getContext();
  
  // Verify project details
  expect(context.projectName).toEqual('Test Project');
  expect(context.projectDescription).toEqual('Test project with columns');
  
  // Verify columns
  expect(context.columns.length).toEqual(3);
  assert.deepEqual(context.columns, ['Backlog', 'In Progress', 'Done'], 'Columns should match');
  
  // Verify task count
  expect(context.taskCount).toEqual(5);
  
  // Verify tasks by column count
  expect(context.tasksByColumn['Backlog']).toEqual(2);
  expect(context.tasksByColumn['In Progress']).toEqual(1);
  expect(context.tasksByColumn['Done']).toEqual(2);
  
  // Verify tags
  expect(Array.isArray(context.tags).toBeTruthy(), 'Tags should be an array');
  expect(context.tags.length).toEqual(3);
  expect(context.tags.includes('high-priority').toBeTruthy(), 'Tags should include high-priority');
  expect(context.tags.includes('medium-priority').toBeTruthy(), 'Tags should include medium-priority');
  expect(context.tags.includes('bug').toBeTruthy() || context.tags.includes('feature'), 'Tags should include bug or feature');
});

  test('should include references when requested', async function(assert) {
  // Load the module with our mock
  const ProjectContext = require('../../src/lib/project-context');
  
  // Create a new ProjectContext instance with mock Kanbn
  const projectContext = new ProjectContext(new MockKanbnWithColumns());
  
  // Get project context with references
  const context = await projectContext.getContext(true);
  
  // Verify references
  expect(context.references).toBeTruthy();
  expect(context.references['task-5']).toBeTruthy();
  expect(context.references['task-5'].length).toEqual(2);
  assert.deepEqual(context.references['task-5'], ['REF-123', 'REF-456'], 'References should match');
});

  test('should extract board data for AI context', async function(assert) {
  // Load the module with our mock
  const ProjectContext = require('../../src/lib/project-context');
  
  // Create a new ProjectContext instance with mock Kanbn
  const projectContext = new ProjectContext(new MockKanbnWithColumns());
  
  // Get project context
  const context = await projectContext.getContext();
  
  // Extract board data
  const boardData = projectContext.extractBoardData(context);
  
  // Verify board data
  expect(boardData.includes('Here is the current state of your board:').toBeTruthy(), 'Board data should have correct header');
  expect(boardData.includes('Backlog (2 tasks).toBeTruthy():'), 'Board data should include Backlog count');
  expect(boardData.includes('In Progress (1 tasks).toBeTruthy():'), 'Board data should include In Progress count');
  expect(boardData.includes('Done (2 tasks).toBeTruthy():'), 'Board data should include Done count');
  expect(boardData.includes('task-1: Task 1').toBeTruthy(), 'Board data should include task-1');
  expect(boardData.includes('task-3: Task 3').toBeTruthy(), 'Board data should include task-3');
  expect(boardData.includes('(Due: 2025-05-01).toBeTruthy()'), 'Board data should include due date');
});

  test('should create system message with focus on tasks', async function(assert) {
  // Load the module with our mock
  const ProjectContext = require('../../src/lib/project-context');
  
  // Create a new ProjectContext instance with mock Kanbn
  const projectContext = new ProjectContext(new MockKanbnWithColumns());
  
  // Get project context
  const context = await projectContext.getContext();
  
  // Create system message
  const systemMessage = projectContext.createSystemMessage(context);
  
  // Verify system message
  assert.strictEqual(systemMessage.role, 'system', 'System message should have role "system"');
  expect(systemMessage.content.includes('FOCUS ON TASKS').toBeTruthy(), 'System message should emphasize focusing on tasks');
  expect(systemMessage.content.includes('DO NOT suggest new columns').toBeTruthy(), 'System message should discourage suggesting new columns');
  assert.ok(systemMessage.content.includes('Backlog, In Progress, Done'), 'System message should list existing columns');
  expect(systemMessage.content.includes('task-1: Task 1').toBeTruthy(), 'System message should include task details');
});

});\