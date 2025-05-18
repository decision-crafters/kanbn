module.exports = {
  mockIndex: {
    name: 'Test Board',
    columns: { 'Backlog': [], 'In Progress': [] },
    columnMetadata: {
      'Backlog': { workflowState: 'backlog' }
    }
  },
  mockTasks: {
    'test-1': {
      id: 'test-1',
      name: 'Test Task',
      column: 'Backlog'
    }
  }
};
