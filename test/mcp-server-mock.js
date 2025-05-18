/**
 * Simple MCP server test script with mock data
 */
const mockData = require('./mock-data');
const utility = require('../src/utility');

class MockMcpServer {
  constructor() {
    this.resources = {};
    this.tools = {};
    this.prompts = {};
    this.running = false;
    
    // Mock board state
    this.resources['board-state'] = {
      name: 'Test Board',
      columns: { 'Backlog': ['test-1'], 'In Progress': [] },
      tasks: mockData.mockTasks
    };
    
    // Mock task resource
    this.resources['task'] = mockData.mockTasks['test-1'];
    
    // Mock metrics
    this.resources['workload-metrics'] = {
      totalTasks: 1,
      completedTasks: 0,
      estimatedWorkload: 3,
      remainingWorkload: 3
    };
  }
  
  async start(port) {
    this.running = true;
    console.log(`Mock MCP server started on port ${port}`);
    return true;
  }
  
  async stop() {
    this.running = false;
    console.log('Mock MCP server stopped');
  }
  
  getResource(name) {
    return this.resources[name] || null;
  }
  
  invokeTool(name, params) {
    console.log(`Invoking tool: ${name} with params:`, params);
    return { success: true };
  }
}

function testServer() {
  console.log('Testing MCP server implementation with mocks');
  
  const server = new MockMcpServer();
  
  // Test server start/stop
  server.start(11434)
    .then(() => {
      // Test resource access
      console.log('\nTesting resources:');
      console.log('Board state:', server.getResource('board-state').name);
      console.log('Task:', server.getResource('task').name);
      console.log('Metrics:', server.getResource('workload-metrics').totalTasks);
      
      // Test tool invocation
      console.log('\nTesting tools:');
      server.invokeTool('create-task', { name: 'New Test Task' });
      
      // Cleanup
      return server.stop();
    })
    .then(() => {
      console.log('\n✅ MCP server tests completed successfully');
    })
    .catch(error => {
      console.error('❌ MCP server tests failed:', error);
    });
}

// Run tests
testServer();