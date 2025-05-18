/**
 * Mock data for testing
 */

module.exports = {
  mockTasks: {
    'test-1': {
      name: 'Test Task 1',
      description: 'This is a test task',
      metadata: {
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-02T00:00:00.000Z',
        workload: 3
      }
    },
    'test-2': {
      name: 'Test Task 2',
      description: 'Another test task',
      metadata: {
        created: '2023-01-03T00:00:00.000Z',
        updated: '2023-01-04T00:00:00.000Z',
        workload: 2
      }
    }
  }
};