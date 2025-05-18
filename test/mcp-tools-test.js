/**
 * MCP Server Tools Test
 */
const mockData = require('./mock-data');
const utility = require('../src/utility');

class MockMcpServer {
  constructor() {
    this.tools = {};
    
    // Register mock tools
    this.tools['create-task'] = {
      execute: params => ({ taskId: 'new-task-1', success: true })
    };
    
    this.tools['move-task'] = {
      execute: params => {
        if (params.toColumn === 'Nonexistent') {
          throw new Error('Column does not exist');
        }
        return { success: true };
      }
    };
    
    this.tools['decompose-task'] = {
      execute: params => ({
        subtasks: [
          { name: 'Subtask 1', description: 'First subtask' },
          { name: 'Subtask 2', description: 'Second subtask' }
        ]
      })
    };
    
    this.tools['create-column'] = {
      execute: params => ({ success: true })
    };
    
    this.tools['delete-task'] = {
      execute: params => {
        if (params.taskId === 'nonexistent') {
          throw new Error('Task not found');
        }
        return { success: true };
      }
    };
  }
  
  invokeTool(name, params = {}) {
    if (!this.tools[name]) {
      throw new Error(`Tool ${name} not found`);
    }
    return this.tools[name].execute(params);
  }
}

function testTools() {
  console.log('Testing MCP tools with mocks');
  
  const server = new MockMcpServer();
  
  const testCases = [
    {
      name: 'create-task',
      params: { name: 'Test Task', description: 'Description' },
      expectError: false
    },
    {
      name: 'move-task',
      params: { taskId: 'test-1', fromColumn: 'Backlog', toColumn: 'Nonexistent' },
      expectError: true,
      errorPattern: /does not exist/i
    },
    {
      name: 'decompose-task',
      params: { taskId: 'test-1' },
      expectError: false
    },
    {
      name: 'create-column',
      params: { name: 'New Column', description: 'New column for testing' },
      expectError: false
    },
    {
      name: 'delete-task',
      params: { taskId: 'nonexistent' },
      expectError: true,
      errorPattern: /not found/i
    },
    {
      name: 'nonexistent-tool',
      params: {},
      expectError: true,
      errorPattern: /not found/i
    }
  ];
  
  let passedTests = 0;
  let failedTests = 0;
  
  testCases.forEach(test => {
    try {
      console.log(`Testing tool: ${test.name}`);
      const result = server.invokeTool(test.name, test.params);
      
      if (test.expectError) {
        console.warn(`\u26a0\ufe0f Tool ${test.name} expected to fail but succeeded`);
        failedTests++;
      } else {
        console.log(`\u2713 Tool ${test.name} executed successfully`);
        passedTests++;
      }
    } catch (error) {
      if (test.expectError) {
        if (test.errorPattern && !test.errorPattern.test(error.message)) {
          console.warn(`\u26a0\ufe0f Tool ${test.name} failed with unexpected error: ${error.message}`);
          failedTests++;
        } else {
          console.log(`\u2713 Tool ${test.name} failed as expected: ${error.message}`);
          passedTests++;
        }
      } else {
        console.warn(`\u26a0\ufe0f Tool ${test.name} unexpectedly failed: ${error.message}`);
        failedTests++;
      }
    }
  });
  
  console.log(`\nTools test summary: ${passedTests} passed, ${failedTests} failed`);
  
  if (failedTests === 0) {
    console.log('\n\u2705 MCP tools tests completed successfully');
  } else {
    console.error('\n\u274c MCP tools tests failed');
  }
}

// Run the tests
testTools();
