# Testing Guide for Kanbn

This document provides comprehensive information about the testing infrastructure for Kanbn.

## Testing Frameworks

Kanbn uses two testing frameworks during the transition period:

1. **Jest** (Primary, recommended for new tests)
2. **QUnit** (Legacy, being phased out)

## Test Directory Structure

```
test/
├── unit/            # Unit tests for individual components
├── integration/     # Integration tests for component interactions
├── mcp/             # Tests for Model Context Protocol components
├── fixtures/        # Test fixtures and mock data
└── helpers/         # Test helper functions
```

## Running Tests

### Jest Tests (Recommended)

```bash
# Run all Jest tests
npm run test:jest

# Run Jest unit tests only
npm run test:jest:unit

# Run Jest integration tests only
npm run test:jest:integration

# Run Jest tests with coverage report
npm run test:jest:coverage

# Run Jest tests in watch mode (development)
npm run test:jest:watch
```

### MCP Tests

```bash
# Run all MCP tests
npm run test:mcp

# Run MCP resource tests
npm run test:mcp:resources

# Run MCP tools tests
npm run test:mcp:tools
```

### Legacy QUnit Tests

```bash
# Run all QUnit tests
npm test

# Run QUnit unit tests only
npm run test:unit

# Run QUnit integration tests only
npm run test:integration
```

## Writing Tests

### Jest Tests

Jest is the preferred testing framework for new tests. Here's an example of a Jest test:

```javascript
describe('Feature: Task Management', () => {
  test('should create a new task with valid data', async () => {
    // Arrange
    const taskData = { name: 'Test Task', description: 'Test Description' };
    
    // Act
    const result = await taskController.createTask(taskData);
    
    // Assert
    expect(result).toBeTruthy();
    expect(result.name).toBe('Test Task');
  });
  
  test('should throw an error when creating a task with invalid data', async () => {
    // Arrange
    const invalidTaskData = {};
    
    // Act & Assert
    await expect(taskController.createTask(invalidTaskData)).rejects.toThrow();
  });
});
```

### MCP Tests

MCP tests verify the functionality of the Model Context Protocol server, resources, and tools. Here's an example:

```javascript
// Test MCP resource access
test('should retrieve board state resource', async () => {
  const server = new McpServer();
  await server.start();
  
  const boardState = server.getResource('board-state');
  
  expect(boardState).toBeTruthy();
  expect(boardState.columns).toBeDefined();
  
  await server.stop();
});
```

## Test Environment

The test environment is configured in `jest.setup.js` and includes:

- Environment variable loading from `.env` file
- Setting `KANBN_ENV=test`
- Global test utilities
- Jest timeout configuration

## Mocking

Jest provides built-in mocking capabilities:

```javascript
// Mock a module
jest.mock('../src/lib/api-client');

// Mock a function
const mockFunction = jest.fn().mockReturnValue('mocked value');

// Mock implementation
const mockImplementation = jest.fn().mockImplementation(() => {
  return { success: true };
});
```

## Test Coverage

Run Jest with coverage reporting:

```bash
npm run test:jest:coverage
```

This generates a coverage report in the `coverage/` directory.

## Continuous Integration

Tests are run automatically in GitHub Actions when:

1. A pull request is opened against the main branch
2. Code is pushed to the main branch
3. The workflow is manually triggered

The workflow runs:

1. Jest unit tests
2. Jest integration tests
3. Legacy QUnit tests (with continue-on-error)
4. MCP server tests
5. MCP resource tests
6. MCP tools tests

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on the state from other tests
2. **Mock External Dependencies**: Use mocks for external services, APIs, and file system operations
3. **Clear Descriptions**: Write clear test descriptions that explain what is being tested
4. **Test Edge Cases**: Include tests for error conditions and edge cases
5. **Clean Up**: Clean up any test artifacts or state changes after tests complete

## Transitioning from QUnit to Jest

We are in the process of migrating from QUnit to Jest. During this transition:

1. New tests should be written using Jest
2. Existing QUnit tests will be gradually migrated to Jest
3. Both test frameworks will run in parallel until migration is complete
4. QUnit-specific utilities will be removed after migration

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase the timeout in Jest configuration or for specific tests
2. **Environment variables not available**: Ensure `.env` file is properly configured
3. **Mock not working**: Verify mock implementation and placement in the test file

### Debugging Tests

To debug tests:

```bash
# Run Jest in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then connect to the debugger using Chrome DevTools or your IDE.

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Jest API Reference](https://jestjs.io/docs/api)
- [Model Context Protocol Documentation](https://modelcontextprotocol.github.io/)