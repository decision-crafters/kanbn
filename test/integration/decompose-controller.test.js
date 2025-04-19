const assert = require('assert');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const kanbn = require('../../src/main');
const decompose = require('../../src/controller/decompose');

describe('Decompose controller', function() {
  const testFolder = path.join(__dirname, '..', 'test-decompose');
  const testTasksFolder = path.join(testFolder, '.kanbn', 'tasks');
  
  beforeEach(async function() {
    if (!fs.existsSync(testFolder)) {
      fs.mkdirSync(testFolder);
    }
    
    process.chdir(testFolder);
    await kanbn.initialise({
      name: 'Test Project',
      description: 'Test project for decompose controller',
      columns: ['Backlog', 'Todo', 'In Progress', 'Done']
    });
    
    await kanbn.createTask({
      name: 'Test Task',
      description: 'This is a test task for decomposition',
      metadata: {
        tags: ['test']
      }
    }, 'Backlog');
  });
  
  afterEach(function() {
    rimraf.sync(testFolder);
  });
  
  it('should log AI interaction when OpenRouter API key is not available', async function() {
    const originalEnv = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    
    try {
      await decompose({
        task: 'test-task',
        interactive: false
      });
      
      const tasks = await kanbn.loadAllTrackedTasks();
      const aiInteractions = tasks.filter(task => 
        task.metadata.tags && 
        task.metadata.tags.includes('ai-interaction')
      );
      
      assert.strictEqual(aiInteractions.length, 0, 'No AI interaction should be logged when API key is missing');
    } finally {
      process.env.OPENROUTER_API_KEY = originalEnv;
    }
  });
  
  it('should create parent-child relationships between tasks', async function() {
    const parentTaskId = await kanbn.createTask({
      name: 'Parent Task',
      description: 'This is a parent task',
      metadata: {
        tags: ['test']
      }
    }, 'Backlog');
    
    const childTask1Id = await kanbn.createTask({
      name: 'Child Task 1',
      description: 'This is child task 1',
      metadata: {
        tags: ['test']
      },
      relations: [
        {
          task: parentTaskId,
          type: 'child-of'
        }
      ]
    }, 'Backlog');
    
    const childTask2Id = await kanbn.createTask({
      name: 'Child Task 2',
      description: 'This is child task 2',
      metadata: {
        tags: ['test']
      },
      relations: [
        {
          task: parentTaskId,
          type: 'child-of'
        }
      ]
    }, 'Backlog');
    
    const parentTask = await kanbn.getTask(parentTaskId);
    parentTask.relations = [
      {
        task: childTask1Id,
        type: 'parent-of'
      },
      {
        task: childTask2Id,
        type: 'parent-of'
      }
    ];
    await kanbn.updateTask(parentTaskId, parentTask);
    
    const status = await kanbn.status(false, false, false, null, null);
    
    assert.ok(status.relationMetrics, 'Status should include relation metrics');
    assert.strictEqual(status.relationMetrics.parentTasks, 1, 'Should have 1 parent task');
    assert.strictEqual(status.relationMetrics.childTasks, 2, 'Should have 2 child tasks');
  });
});
