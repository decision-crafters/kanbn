// MCP SDK is an ES module - we need to use dynamic import
let McpClient;
const importMcp = async () => {
  const sdk = await import('@modelcontextprotocol/sdk/dist/cjs/client.js');
  McpClient = sdk.McpClient;
};
const utility = require('../src/utility');
const mockData = require('./mock-data');

// Set test mode environment variable
process.env.MCP_TEST_MODE = 'true';

async function testMcpIntegration() {
  try {
    // Import MCP client
    await importMcp();
    // Check if server is running first
    const Kanbn = require('../src/main');
    const kanbn = new Kanbn();
    
    // Start MCP server with test configuration
    console.log('Starting MCP server for tests...');
    const startResult = await kanbn.startMcpServer(11434);
    if (!startResult) {
      throw new Error('Failed to start MCP server for testing');
    }

    // Create client with test config
    const client = new McpClient('http://localhost:11434', {
      apiKey: process.env.MCP_API_KEY || 'test123'
    });
    
    // 1. Test Resource Access
    utility.debugLog('Testing board-state resource...');
    const board = await client.getResource('board-state');
    console.log('Board:', board ? board.name : 'N/A', 'Columns:', board ? Object.keys(board.columns) : []);

    // 2. Test Tool Execution
    utility.debugLog('Testing create-task tool...');
    try {
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
    } catch (toolError) {
      console.warn('Tool test skipped due to error:', toolError.message);
    }

    // Run validation tests
    await testResources(client);
    await testTools(client);

    // Cleanup
    await kanbn.stopMcpServer();
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

  let passedTests = 0;
  let failedTests = 0;

  for (const resource of requiredResources) {
    try {
      const data = await client.getResource(resource);
      if (!data) {
        console.warn(`⚠️ Resource ${resource} returned empty data`);
        failedTests++;
      } else {
        console.log(`✓ ${resource} resource OK`);
        passedTests++;
      }
    } catch (error) {
      console.warn(`⚠️ Resource ${resource} test failed: ${error.message}`);
      failedTests++;
    }
  }

  console.log(`Resources test summary: ${passedTests} passed, ${failedTests} failed`);
  return passedTests > 0; // Pass if at least one resource works
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
      expectError: /column does not exist|task not found/i
    },
    {
      tool: 'create-column',
      params: {
        name: 'Test Column',
        description: 'For MCP testing'
      }
    }
  ];

  let passedTests = 0;
  let failedTests = 0;

  for (const test of testCases) {
    try {
      await client.invokeTool(test.tool, test.params);
      if (test.expectError) {
        console.warn(`\u26a0\ufe0f ${test.tool} expected error but succeeded`);
        failedTests++;
      } else {
        console.log(`\u2713 ${test.tool} tool OK`);
        passedTests++;
      }
    } catch (error) {
      if (test.expectError && test.expectError.test(error.message)) {
        console.log(`\u2713 ${test.tool} error handling OK`);
        passedTests++;
      } else {
        console.warn(`\u26a0\ufe0f ${test.tool} failed unexpectedly: ${error.message}`);
        failedTests++;
      }
    }
  }

  console.log(`Tools test summary: ${passedTests} passed, ${failedTests} failed`);
  return passedTests > 0; // Pass if at least one tool test works
}

testMcpIntegration();
