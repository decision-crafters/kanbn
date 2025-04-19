const assert = require('assert');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const kanbn = require('../../src/main');
const chat = require('../../src/controller/chat');

describe('Chat controller', function() {
  const testFolder = path.join(__dirname, '..', 'test-chat');
  const testTasksFolder = path.join(testFolder, '.kanbn', 'tasks');
  
  beforeEach(async function() {
    if (!fs.existsSync(testFolder)) {
      fs.mkdirSync(testFolder);
    }
    
    process.chdir(testFolder);
    await kanbn.initialise({
      name: 'Test Project',
      description: 'Test project for chat controller',
      columns: ['Backlog', 'Todo', 'In Progress', 'Done']
    });
    
    await kanbn.createTask({
      name: 'Test Task',
      description: 'This is a test task',
      metadata: {
        tags: ['test']
      }
    }, 'Backlog');
  });
  
  afterEach(function() {
    rimraf.sync(testFolder);
  });
  
  it('should get project context correctly', async function() {
    const getProjectContext = async function() {
      try {
        const index = await kanbn.getIndex();
        const tasks = await kanbn.loadAllTrackedTasks();
        const status = await kanbn.status(false, false, false, null, null);
        
        return {
          projectName: index.name,
          projectDescription: index.description,
          columns: Object.keys(index.columns),
          taskCount: tasks.length,
          tasksByColumn: Object.keys(index.columns).reduce((acc, column) => {
            acc[column] = tasks.filter(task => 
              kanbn.findTaskColumn(task.id) === column
            ).length;
            return acc;
          }, {}),
          tags: [...new Set(tasks.flatMap(task => 
            task.metadata.tags || []
          ))],
          statistics: status
        };
      } catch (error) {
        return {
          error: error.message
        };
      }
    };
    
    const context = await getProjectContext();
    
    assert.strictEqual(context.projectName, 'Test Project', 'Project name should match');
    assert.strictEqual(context.projectDescription, 'Test project for chat controller', 'Project description should match');
    assert.strictEqual(context.taskCount, 1, 'Task count should be 1');
    assert.deepStrictEqual(context.tags, ['test'], 'Tags should include "test"');
    assert.strictEqual(context.columns.length, 4, 'Should have 4 columns');
  });
  
  it('should log AI interaction when chat is used', async function() {
    const originalCallOpenRouterAPI = chat.__get__('callOpenRouterAPI');
    chat.__set__('callOpenRouterAPI', async function(message, projectContext) {
      return 'This is a test response from the mock AI assistant.';
    });
    
    try {
      await chat({
        message: 'Test message'
      });
      
      const tasks = await kanbn.loadAllTrackedTasks();
      const aiInteractions = tasks.filter(task => 
        task.metadata.tags && 
        task.metadata.tags.includes('ai-interaction')
      );
      
      assert.strictEqual(aiInteractions.length, 1, 'One AI interaction should be logged');
      assert.ok(aiInteractions[0].metadata.tags.includes('chat'), 'AI interaction should have "chat" tag');
    } finally {
      chat.__set__('callOpenRouterAPI', originalCallOpenRouterAPI);
    }
  });
});
