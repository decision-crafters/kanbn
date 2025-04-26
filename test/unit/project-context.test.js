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

QUnit.module('Project Context tests', {
  before: function() {
    // Store the original module
    originalProjectContext = require('../../src/lib/project-context');
  },
  after: function() {
    // Restore the original module
    mockRequire('../../src/lib/project-context', originalProjectContext);
    mockRequire.stopAll();
  }
});

QUnit.test('should handle projects with no columns', async function(assert) {
  // Load the module with our mock
  const ProjectContext = require('../../src/lib/project-context');
  
  // Create a new ProjectContext instance with mock Kanbn
  const projectContext = new ProjectContext(new MockKanbnNoColumns());
  
  // Get project context
  const context = await projectContext.getContext();
  
  // Verify that default columns are created
  assert.strictEqual(context.projectName, 'Test Project', 'Project name should match');
  assert.strictEqual(context.projectDescription, 'Test project with no columns', 'Project description should match');
  assert.ok(Array.isArray(context.columns), 'Columns should be an array');
  assert.strictEqual(context.columns.length, 1, 'Should have one default column');
  assert.strictEqual(context.columns[0], 'Backlog', 'Default column should be Backlog');
  assert.strictEqual(context.taskCount, 0, 'Task count should be 0');
});

QUnit.test('should properly extract project context with columns', async function(assert) {
  // Load the module with our mock
  const ProjectContext = require('../../src/lib/project-context');
  
  // Create a new ProjectContext instance with mock Kanbn
  const projectContext = new ProjectContext(new MockKanbnWithColumns());
  
  // Get project context
  const context = await projectContext.getContext();
  
  // Verify project details
  assert.strictEqual(context.projectName, 'Test Project', 'Project name should match');
  assert.strictEqual(context.projectDescription, 'Test project with columns', 'Project description should match');
  
  // Verify columns
  assert.strictEqual(context.columns.length, 3, 'Should have three columns');
  assert.deepEqual(context.columns, ['Backlog', 'In Progress', 'Done'], 'Columns should match');
  
  // Verify task count
  assert.strictEqual(context.taskCount, 5, 'Task count should be 5');
  
  // Verify tasks by column count
  assert.strictEqual(context.tasksByColumn['Backlog'], 2, 'Backlog should have 2 tasks');
  assert.strictEqual(context.tasksByColumn['In Progress'], 1, 'In Progress should have 1 task');
  assert.strictEqual(context.tasksByColumn['Done'], 2, 'Done should have 2 tasks');
  
  // Verify tags
  assert.ok(Array.isArray(context.tags), 'Tags should be an array');
  assert.strictEqual(context.tags.length, 3, 'Should have 3 unique tags');
  assert.ok(context.tags.includes('high-priority'), 'Tags should include high-priority');
  assert.ok(context.tags.includes('medium-priority'), 'Tags should include medium-priority');
  assert.ok(context.tags.includes('bug') || context.tags.includes('feature'), 'Tags should include bug or feature');
});

QUnit.test('should include references when requested', async function(assert) {
  // Load the module with our mock
  const ProjectContext = require('../../src/lib/project-context');
  
  // Create a new ProjectContext instance with mock Kanbn
  const projectContext = new ProjectContext(new MockKanbnWithColumns());
  
  // Get project context with references
  const context = await projectContext.getContext(true);
  
  // Verify references
  assert.ok(context.references, 'References should be included');
  assert.ok(context.references['task-5'], 'Task 5 should have references');
  assert.strictEqual(context.references['task-5'].length, 2, 'Task 5 should have 2 references');
  assert.deepEqual(context.references['task-5'], ['REF-123', 'REF-456'], 'References should match');
});

QUnit.test('should extract board data for AI context', async function(assert) {
  // Load the module with our mock
  const ProjectContext = require('../../src/lib/project-context');
  
  // Create a new ProjectContext instance with mock Kanbn
  const projectContext = new ProjectContext(new MockKanbnWithColumns());
  
  // Get project context
  const context = await projectContext.getContext();
  
  // Extract board data
  const boardData = projectContext.extractBoardData(context);
  
  // Verify board data
  assert.ok(boardData.includes('Here is the current state of your board:'), 'Board data should have correct header');
  assert.ok(boardData.includes('Backlog (2 tasks):'), 'Board data should include Backlog count');
  assert.ok(boardData.includes('In Progress (1 tasks):'), 'Board data should include In Progress count');
  assert.ok(boardData.includes('Done (2 tasks):'), 'Board data should include Done count');
  assert.ok(boardData.includes('task-1: Task 1'), 'Board data should include task-1');
  assert.ok(boardData.includes('task-3: Task 3'), 'Board data should include task-3');
  assert.ok(boardData.includes('(Due: 2025-05-01)'), 'Board data should include due date');
});

QUnit.test('should create system message with focus on tasks', async function(assert) {
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
  assert.ok(systemMessage.content.includes('FOCUS ON TASKS'), 'System message should emphasize focusing on tasks');
  assert.ok(systemMessage.content.includes('DO NOT suggest new columns'), 'System message should discourage suggesting new columns');
  assert.ok(systemMessage.content.includes('Backlog, In Progress, Done'), 'System message should list existing columns');
  assert.ok(systemMessage.content.includes('task-1: Task 1'), 'System message should include task details');
});
