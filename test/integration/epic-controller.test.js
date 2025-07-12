/**
 * Epic Controller Integration Tests
 *
 * Tests the epic management functionality including:
 * - Creating epics
 * - Creating child tasks under epics
 * - Parent-child relationship management
 * - Sprint assignment for epics and child tasks
 *
 * Following the filesystem testing practices in ADR-0012.
 */

const path = require('path');
const fs = require('fs-extra');
const Kanbn = require('../../src/main');
const utility = require('../../src/utility');
const EpicHandler = require('../../src/lib/epic-handler');
const { createTestEnvironment } = require('../jest-helpers');

/**
 * Helper to create unique task names with timestamps
 * @param {string} baseName - Base name for the task
 * @return {string} Unique task name with timestamp suffix
 */
const createUniqueTaskName = (baseName) => {
  return `${baseName}-${Date.now().toString(36)}`;
};

describe('Epic Controller Integration Tests', () => {
  let env;
  let kanbn;
  let epicHandler;
  let testData;

  // Standard column names for our tests
  const COLUMNS = ['Backlog', 'In Progress', 'Done'];

  // Setup before each test - create a fresh environment
  beforeEach(async () => {
    // Create test environment with real filesystem
    env = createTestEnvironment(`epic-controller-test-${Date.now().toString(36)}`);
    
    try {
      // Initialize Kanbn with columns and wait for completion
      testData = await env.setup({
        columnNames: COLUMNS
      });
      
      // Initialize Kanbn in our test directory
      kanbn = await Kanbn(testData.testDir);
      
      // Create an empty index to ensure it exists
      await kanbn.initialise({
        columnNames: COLUMNS,
        taskFolderName: '.kanbn/tasks'
      });
      
      epicHandler = new EpicHandler(kanbn, {});
      
      // Suppress console output during tests
      jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(utility, 'error').mockImplementation(() => {});
    } catch (error) {
      console.error('Test setup failed:', error.message);
      throw error;
    }
  });

  // Cleanup after each test
  afterEach(() => {
    env.cleanup();
    jest.restoreAllMocks();
  });

  /**
   * Test epic creation
   */
  describe('Epic Creation', () => {
    test('should create an epic task with correct metadata', async () => {
      const epicId = await kanbn.createTask({
        name: createUniqueTaskName('test-epic'),
        description: 'An epic for testing',
        metadata: {
          type: 'epic',
          tags: ['epic', 'test'],
          children: []
        }
      }, 'Backlog');

      // Verify the epic exists
      const epicExists = await kanbn.taskExists(epicId);
      expect(epicExists).toBe(true);

      // Verify the epic has the correct metadata
      const epic = await kanbn.getTask(epicId);
      expect(epic.metadata.type).toBe('epic');
      expect(epic.metadata.tags).toContain('epic');
    });

    test('should create an epic with acceptance criteria', async () => {
      // Epic data with acceptance criteria and unique name
      const uniqueId = Date.now().toString(36);
      const epicData = {
        name: `Feature Epic-${uniqueId}`,
        description: 'A major feature epic',
        acceptanceCriteria: [
          'Should handle all edge cases',
          'Should have 95% test coverage',
          'Should be well-documented'
        ],
        metadata: {
          type: 'epic',
          tags: ['feature', 'epic']
        }
      };

      // Create epic task
      const epicId = await kanbn.createTask({
        name: epicData.name,
        description: epicData.description,
        acceptanceCriteria: epicData.acceptanceCriteria,
        metadata: epicData.metadata
      }, 'Backlog');

      // Get the created epic
      const epic = await kanbn.getTask(epicId);
      
      // Verify epic properties
      expect(epic.name).toBe(epicData.name);
      expect(epic.metadata.type).toBe('epic');
      expect(epic.metadata.tags).toContain('epic');
      expect(epic.metadata.tags).toContain('feature');
    });
  });

  /**
   * Test parent-child relationships
   */
  describe('Parent-Child Relationships', () => {
    let parentEpicId;
    
    // Create a parent epic before each test in this describe block
    beforeEach(async () => {
      parentEpicId = await kanbn.createTask({
        name: `Parent Epic ${Date.now().toString(36)}`,
        description: 'This is a parent epic',
        metadata: {
          type: 'epic',
          tags: ['epic'],
          children: []
        }
      }, 'Backlog');
    });

    test('should create child tasks under an epic', async () => {
      // Create child tasks with unique names
      const childTask1Id = await kanbn.createTask({
        name: `Child Task 1-${Date.now().toString(36)}`,
        description: 'Child task 1 description',
        metadata: {
          parent: parentEpicId
        }
      }, 'Backlog');

      const childTask2Id = await kanbn.createTask({
        name: `Child Task 2-${Date.now().toString(36)}`,
        description: 'Child task 2 description',
        metadata: {
          parent: parentEpicId
        }
      }, 'Backlog');

      // Update parent with children reference
      const parentEpic = await kanbn.getTask(parentEpicId);
      parentEpic.metadata.children = [childTask1Id, childTask2Id];
      await kanbn.updateTask(parentEpicId, parentEpic);

      // Get updated parent epic
      const updatedParentEpic = await kanbn.getTask(parentEpicId);
      
      // Verify parent-child relationships
      expect(updatedParentEpic.metadata.children).toContain(childTask1Id);
      expect(updatedParentEpic.metadata.children).toContain(childTask2Id);
      
      // Verify child tasks have parent reference
      const child1 = await kanbn.getTask(childTask1Id);
      const child2 = await kanbn.getTask(childTask2Id);
      
      expect(child1.metadata.parent).toBe(parentEpicId);
      expect(child2.metadata.parent).toBe(parentEpicId);
    });

    test('should update child task status when moved between columns', async () => {
      // Create child task with unique name
      const childTaskId = await kanbn.createTask({
        name: `Child Task Status-${Date.now().toString(36)}`,
        description: 'Child task description',
        metadata: {
          parent: parentEpicId
        }
      }, 'Backlog');

      // Add child to parent
      const parentEpic = await kanbn.getTask(parentEpicId);
      parentEpic.metadata.children = [childTaskId];
      await kanbn.updateTask(parentEpicId, parentEpic);

      // Move child task to In Progress
      await kanbn.moveTask(childTaskId, 'In Progress');
      
      // Verify child task moved
      const columnName = await kanbn.findTaskColumn(childTaskId);
      expect(columnName).toBe('In Progress');
    });

    test('should find all child tasks of an epic', async () => {
      // Create multiple child tasks with unique names
      const childTasks = [];
      
      for (let i = 1; i <= 3; i++) {
        const childId = await kanbn.createTask({
          name: `Child Task Find-${i}-${Date.now().toString(36)}`,
          description: `Child task ${i} description`,
          metadata: {
            parent: parentEpicId
          }
        }, 'Backlog');
        
        childTasks.push(childId);
      }

      // Update parent with children
      const parentEpic = await kanbn.getTask(parentEpicId);
      parentEpic.metadata.children = childTasks;
      await kanbn.updateTask(parentEpicId, parentEpic);

      // Get updated parent and verify children
      const updatedParent = await kanbn.getTask(parentEpicId);
      expect(updatedParent.metadata.children.length).toBe(3);
      
      // Verify all child tasks exist and have parent set
      for (const childId of childTasks) {
        // Get the task and verify it exists
        const childTask = await kanbn.getTask(childId);
        expect(childTask).toBeDefined();
        expect(childTask.id).toBe(childId);
      }
    });
  });

  /**
   * Test sprint assignment capabilities
   */
  describe('Sprint Assignment', () => {
    let epicId;
    let childTaskIds = [];
    
    beforeEach(async () => {
      // Create a sprint
      await kanbn.sprint('Sprint 1', 'Sprint for testing', new Date());

      // Create an epic with unique name to avoid ID conflicts
      epicId = await kanbn.createTask({
        name: `Sprint Epic ${Date.now().toString(36)}`,
        description: 'Epic for sprint testing',
        metadata: {
          type: 'epic',
          tags: ['epic'],
          children: []
        }
      }, 'Backlog');

      // Create child tasks with unique names
      childTaskIds = [];
      for (let i = 1; i <= 3; i++) {
        const childId = await kanbn.createTask({
          name: `Sprint Child ${i}-${Date.now().toString(36)}`,
          description: `Sprint child ${i} description`,
          metadata: {
            parent: epicId
          }
        }, 'Backlog');
        
        childTaskIds.push(childId);
      }

      // Update epic with children
      const epic = await kanbn.getTask(epicId);
      epic.metadata.children = childTaskIds;
      await kanbn.updateTask(epicId, epic);
    });

    test('should assign epic and child tasks to sprint', async () => {
      // Assign epic to sprint
      const epic = await kanbn.getTask(epicId);
      epic.metadata.sprint = 'Sprint 1';
      await kanbn.updateTask(epicId, epic);
      
      // Verify epic assigned to sprint
      const updatedEpic = await kanbn.getTask(epicId);
      expect(updatedEpic.metadata.sprint).toBe('Sprint 1');
      
      // Assign child tasks to same sprint
      for (const childId of childTaskIds) {
        const child = await kanbn.getTask(childId);
        child.metadata.sprint = 'Sprint 1';
        await kanbn.updateTask(childId, child);
        
        const updatedChild = await kanbn.getTask(childId);
        expect(updatedChild.metadata.sprint).toBe('Sprint 1');
      }
    });

    test('should remove epic and child tasks from sprint', async () => {
      // First assign to sprint
      const epic = await kanbn.getTask(epicId);
      epic.metadata.sprint = 'Sprint 1';
      await kanbn.updateTask(epicId, epic);
      
      // Then assign child tasks
      for (const childId of childTaskIds) {
        const child = await kanbn.getTask(childId);
        child.metadata.sprint = 'Sprint 1';
        await kanbn.updateTask(childId, child);
      }
      
      // Remove epic from sprint
      const epicToUpdate = await kanbn.getTask(epicId);
      delete epicToUpdate.metadata.sprint;
      await kanbn.updateTask(epicId, epicToUpdate);
      
      // Verify epic removed from sprint
      const updatedEpic = await kanbn.getTask(epicId);
      expect(updatedEpic.metadata.sprint).toBeUndefined();
      
      // Remove child tasks from sprint
      for (const childId of childTaskIds) {
        const childToUpdate = await kanbn.getTask(childId);
        delete childToUpdate.metadata.sprint;
        await kanbn.updateTask(childId, childToUpdate);
        
        const updatedChild = await kanbn.getTask(childId);
        expect(updatedChild.metadata.sprint).toBeUndefined();
      }
    });

    test('should find all tasks in a sprint including epics', async () => {
      // Create unique sprint name to avoid conflicts
      const uniqueSprintName = createUniqueTaskName('Sprint');
      
      // Assign epic and children to sprint
      const epic = await kanbn.getTask(epicId);
      epic.metadata.sprint = uniqueSprintName;
      await kanbn.updateTask(epicId, epic);
      
      for (const childId of childTaskIds) {
        const child = await kanbn.getTask(childId);
        child.metadata.sprint = uniqueSprintName;
        await kanbn.updateTask(childId, child);
      }
      
      // Get all tasks and filter those with our unique sprint name
      const index = await kanbn.getIndex();
      const tasks = await kanbn.loadAllTrackedTasks(index);
      const sprintTasks = [];
      
      // Log task IDs and their sprint associations to help debug
      console.log(`Looking for tasks with sprint: ${uniqueSprintName}`);
      console.log(`Epic ID: ${epicId}`);
      
      for (const taskId in tasks) {
        const task = tasks[taskId];
        if (task.metadata && task.metadata.sprint === uniqueSprintName) {
          console.log(`Found task ${taskId} in sprint ${uniqueSprintName}`);
          sprintTasks.push(taskId);
        }
      }
      
      // Verify epic and all children are in sprint
      expect(sprintTasks).toContain(epicId);
      
      for (const childId of childTaskIds) {
        expect(sprintTasks).toContain(childId);
      }
      
      // Verify the count is correct (epic + all children)
      expect(sprintTasks.length).toBe(1 + childTaskIds.length);
    });
  });
  
  /**
   * Test epic workflow operations
   */
  describe('Epic Workflow Operations', () => {
    let epicId;
    let childTaskIds = [];
    
    beforeEach(async () => {
      // Create a fresh test environment for each test
      env = createTestEnvironment(`epic-workflow-operations-${Date.now().toString(36)}`);
      await env.setup({columns: COLUMNS});
      kanbn = env.kanbn;
      
      // Ensure index is created
      await kanbn.createIndex();
      
      // Create an epic with unique name
      epicId = await kanbn.createTask({
        name: `Workflow Epic ${Date.now().toString(36)}`,
        description: 'Epic for workflow testing',
        metadata: {
          type: 'epic',
          tags: ['epic'],
          children: []
        }
      }, 'Backlog');

      // Create child tasks with unique names
      childTaskIds = [];
      for (let i = 1; i <= 3; i++) {
        const childId = await kanbn.createTask({
          name: `Workflow Child ${i}-${Date.now().toString(36)}`,
          description: `Workflow child ${i} description`,
          metadata: {
            parent: epicId
          }
        }, 'Backlog');
        
        childTaskIds.push(childId);
      }

      // Update epic with children
      const epic = await kanbn.getTask(epicId);
      epic.metadata.children = childTaskIds;
      await kanbn.updateTask(epicId, epic);
    });
    
    test('should move epic between columns', async () => {
      // Move epic to In Progress
      await kanbn.moveTask(epicId, 'In Progress');
      
      // Verify epic moved
      let epicColumn = await kanbn.findTaskColumn(epicId);
      expect(epicColumn).toBe('In Progress');
      
      // Move epic to Done
      await kanbn.moveTask(epicId, 'Done');
      
      // Verify epic moved again
      epicColumn = await kanbn.findTaskColumn(epicId);
      expect(epicColumn).toBe('Done');
    });
    
    test('should update epic name and description', async () => {
      // Get original epic
      const originalEpic = await kanbn.getTask(epicId);
      
      // Update epic with unique name
      const updatedName = `Updated Epic Name-${Date.now().toString(36)}`;
      const updatedDescription = 'Updated epic description';
      
      originalEpic.name = updatedName;
      originalEpic.description = updatedDescription;
      
      await kanbn.updateTask(epicId, originalEpic);
      
      // Get updated epic
      const updatedEpic = await kanbn.getTask(epicId);
      
      // Verify updates
      expect(updatedEpic.name).toBe(updatedName);
      expect(updatedEpic.description).toBe(updatedDescription);
    });
    
    test('should delete epic and its child tasks', async () => {
      // Delete epic with cascade option (true)
      await kanbn.deleteTask(epicId, true);
      
      // Verify epic is deleted
      await expect(kanbn.getTask(epicId)).rejects.toThrow();
      
      // When cascade deletion is used (true parameter), child tasks should also be deleted
      for (const childId of childTaskIds) {
        // Verify child tasks are also deleted
        await expect(kanbn.getTask(childId)).rejects.toThrow();
        
        // Verify child tasks do not appear in any columns
        const index = await kanbn.getIndex();
        const inIndex = Object.values(index.columns).some(column => column.includes(childId));
        expect(inIndex).toBe(false);
      }
    });
  });
});
