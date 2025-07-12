# Kanbn Testing Patterns

*Last Updated: July 3, 2025*

## Overview

This document outlines recommended patterns for testing in the Kanbn project, focusing on filesystem testing practices for Jest. These patterns are aligned with our [Testing Strategy (ADR 001)](../docs/adrs/0001-testing-strategy.md) and [Layered Architecture (ADR 004)](../docs/adrs/0004-layered-architecture.md).

## Filesystem Testing Approaches

We use two primary approaches for filesystem testing, each with specific use cases:

### 1. Real Filesystem with Temporary Directories

**Best for**: Integration tests, end-to-end tests, and tests that require actual I/O operations.

**Implementation**: Use our `createTestEnvironment` utility:

```javascript
const { createTestEnvironment } = require('../migration-utils');

describe('Task operations', () => {
  let env;
  let testData;
  
  beforeEach(() => {
    env = createTestEnvironment('task-operations-test');
    testData = env.setup({
      columnNames: ['Backlog', 'In Progress', 'Done']
    });
  });
  
  afterEach(() => {
    env.cleanup();
  });
  
  test('should create task', async () => {
    await testData.kanbn.createTask('Test Task');
    env.assertions.taskExists(testData.testDir, 'test-task');
  });
});
```

**Benefits**:
- Tests real-world behavior
- Validates actual file operations
- Discovers environment-specific issues

### 2. In-Memory Virtual Filesystem

**Best for**: Unit tests, fast execution, and tests that don't require actual disk I/O.

**Implementation**: Use `memfs` for virtual filesystem:

```javascript
const { vol } = require('memfs');
const fs = require('fs');
jest.mock('fs', () => require('memfs').fs);

describe('File Parser', () => {
  beforeEach(() => {
    // Create virtual file structure
    vol.fromJSON({
      '.kanbn/index.md': '# Kanbn\n\n## Backlog\n\n## Done\n',
      '.kanbn/tasks/task-1.md': '# Task 1\n\n## Details\nTest task',
    });
  });
  
  afterEach(() => {
    vol.reset();
  });
  
  test('should parse files correctly', async () => {
    // Test using the virtual filesystem
    const result = await parseFiles('.kanbn');
    expect(result).toHaveProperty('tasks');
  });
});
```

**Benefits**:
- Extremely fast execution
- No disk I/O overhead
- Simple test state management

## Layer-Specific Testing Patterns

Following our layered architecture, we recommend these patterns:

### Domain Layer Tests

- Use **virtual filesystem** (memfs) for speed and simplicity
- Focus on business logic and domain rules, not I/O
- Mock external dependencies

```javascript
describe('Task Entity', () => {
  test('should validate required fields', () => {
    expect(() => new Task({ title: '' })).toThrow(/required/);
  });
});
```

### Infrastructure Layer Tests

- Use **real filesystem** with isolated test directories
- Test actual file operations and persistence
- Use helper assertions for file verification

```javascript
describe('Task Repository', () => {
  let env;
  
  beforeEach(() => {
    env = createTestEnvironment('task-repo-test');
    env.setup();
  });
  
  afterEach(() => {
    env.cleanup();
  });
  
  test('should persist task to filesystem', async () => {
    const repo = new TaskRepository(env.testDir);
    await repo.save(new Task({ id: 'test-1', title: 'Test' }));
    env.assertions.taskExists(env.testDir, 'test-1');
  });
});
```

### Application Layer Tests

- Use **real filesystem** with comprehensive test fixtures
- Test complete use cases and workflows
- Verify both success and error scenarios

### Presentation Layer Tests

- Use **real filesystem** for CLI controller tests
- Test command handling and user interaction
- Verify console output and error messaging

## Advanced Testing Patterns

### Testing with Mixed Real/Virtual Files

When you need to use both real files (e.g., test fixtures) and virtual files:

```javascript
const { ufs } = require('unionfs');
const { vol } = require('memfs');
const realFs = require('fs');

// Mix real fixtures with virtual files
ufs.use(realFs).use(vol);
jest.mock('fs', () => ufs);

// Now fs operations will check both real and virtual filesystems
```

### JSON-Based Test Fixtures

Create complex directory structures easily:

```javascript
vol.fromJSON({
  '.kanbn/index.md': '# Project\n\n## Backlog\n\n- task-1\n\n## Done\n',
  '.kanbn/tasks/task-1.md': '# Task 1\n\nA test task',
  '.kanbn/tasks/task-2.md': '# Task 2\n\nAnother test task',
});
```

## Best Practices

1. **Always reset state between tests**:
   - For real filesystem: Delete temp directories
   - For virtual filesystem: Call vol.reset()

2. **Use descriptive test directories**:
   - Include test name in directory path for easy debugging
   - Example: `/tmp/kanbn-tests/task-creation-test-abc123`

3. **Avoid mocking individual filesystem methods**:
   - Mock entire modules instead of individual methods
   - Use proper beforeEach/afterEach lifecycle hooks

4. **Verify both success and error cases**:
   - Test that operations succeed when expected
   - Test proper error handling with expect().toThrow()

5. **Match test type to architectural layer**:
   - Use lighter, faster tests for domain layer
   - Use more comprehensive tests for integration

## See Also

- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - QUnit to Jest migration patterns
- [jest-helpers.js](./jest-helpers.js) - Helper assertions and utilities
- [ADR 001: Testing Strategy](../docs/adrs/0001-testing-strategy.md)
- [ADR 004: Layered Architecture](../docs/adrs/0004-layered-architecture.md)
