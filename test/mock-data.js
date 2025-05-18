module.exports = {
  // Mock data for testing the MCP server implementation
  // Simulates a Kanbn board with columns and a single task
  mockIndex: {
    name: 'Test Board',
    columns: { 
      'Backlog': ['test-1'], // Now matches mockTasks
      'In Progress': [] 
    },
    columnMetadata: {
      'Backlog': { 
        workflowState: 'backlog',
        color: '#e3e3e3'
      },
      'In Progress': {
        workflowState: 'active',
        color: '#d4edda'
      }
    }
  },
  mockTasks: {
    'test-1': {
      id: 'test-1',
      name: 'Test Task',
      description: 'Sample task for testing',
      column: 'Backlog',
      metadata: {
        created: '2023-01-01',
        workload: 3
      }
    }
  }
};
