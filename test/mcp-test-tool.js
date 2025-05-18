const { McpClient } = require('@modelcontextprotocol/typescript-sdk');
const utility = require('../src/utility');
const mockData = require('./mock-data');

async function testMcpIntegration() {
  try {
    const client = new McpClient('http://localhost:11434', {
      apiKey: process.env.MCP_API_KEY || 'test123'
    });
    
    // 1. Test Resource Access
    utility.debugLog('Testing board-state resource...');
    const board = await client.getResource('board-state');
    console.log('Board:', board.name, 'Columns:', Object.keys(board.columns));

    // 2. Test Tool Execution
    utility.debugLog('Testing create-task tool...');
    const newTask = await client.invokeTool('create-task', {
      name: 'Test MCP Integration',
      description: 'Verify MCP server functionality',
      column: 'Backlog'
    });
    console.log('Created task:', newTask.taskId);

    // 3. Test AI Features
    utility.debugLog('Testing decompose-task tool...');
    const decomposition = await client.invokeTool('decompose-task', {
      taskId: newTask.taskId
    });
    console.log('Decomposition result:', decomposition);

    // Run validation tests
    await testResources(client);
    await testTools(client);

  } catch (error) {
    utility.error('MCP Test Failed:', error.message);
    process.exit(1);
  }
}

async function testResources(client) {
  const requiredResources = [
    'board-state',
    'task',
    'workload-metrics',
    'column-definitions'
  ];

  for (const resource of requiredResources) {
    const data = await client.getResource(resource);
    if (!data) throw new Error(`Missing ${resource} data`);
    console.log(`✓ ${resource} resource OK`);
  }
}

async function testTools(client) {
  const testCases = [
    {
      tool: 'move-task',
      params: { 
        taskId: 'test-1', 
        fromColumn: 'Backlog', 
        toColumn: 'In Progress' 
      },
      expectError: /column does not exist/i
    },
    {
      tool: 'create-column',
      params: {
        name: 'Test Column',
        description: 'For MCP testing'
      }
    }
  ];

  for (const test of testCases) {
    try {
      await client.invokeTool(test.tool, test.params);
      if (test.expectError) throw new Error('Expected error but succeeded');
      console.log(`✓ ${test.tool} tool OK`);
    } catch (error) {
      if (test.expectError && !test.expectError.test(error.message)) {
        throw new Error(`Tool ${test.tool} failed unexpectedly: ${error.message}`);
      }
      console.log(`✓ ${test.tool} error handling OK`);
    }
  }
}

testMcpIntegration();
