# 12. Filesystem Testing Practices for Jest

* Status: proposed
* Date: 2025-07-03

## Context and Problem Statement

With the ongoing migration from QUnit to Jest, we need to establish consistent practices for filesystem testing. The current approach using mock-fs with QUnit has limitations in Jest, particularly around test isolation, performance, and maintenance. Research has identified multiple approaches for filesystem testing in Jest that align with our layered architecture.

## Decision Drivers

* Improve test isolation and reliability
* Align with layered architecture principles
* Enhance test execution performance
* Provide clear patterns for different testing scenarios
* Support both in-memory and real filesystem testing

## Considered Options

* Continue using mock-fs with manual lifecycle management
* Mock individual filesystem methods on a test-by-test basis
* Use only real filesystem testing for all tests
* Use only virtual filesystem testing for all tests
* Adopt a combination of real filesystem and in-memory virtual filesystem testing

## Decision Outcome

Chosen option: "Adopt a combination of real filesystem and in-memory virtual filesystem testing", because it provides the benefits of both approaches, aligns with our layered architecture, and supports different testing scenarios with clear patterns.

We will adopt two complementary approaches for filesystem testing in Jest:

1. **Real Filesystem with Temporary Directories**: For integration tests and tests that require actual I/O operations, we will use a utility that creates isolated temporary directories using os.tmpdir() with unique identifiers. This approach provides real-world behavior testing while maintaining test isolation.

2. **In-Memory Virtual Filesystem**: For unit tests and scenarios where performance is critical, we will use memfs to provide a virtual filesystem implementation. This approach avoids disk I/O and provides faster test execution.

Both approaches will be supported by helper utilities and clear patterns documented in TESTING_PATTERNS.md. Tests will follow layer-specific implementation patterns aligned with our layered architecture.

### Layer-Specific Testing Approach

* **Domain Layer**: Primarily use in-memory virtual filesystem for speed
* **Infrastructure Layer**: Use real filesystem with temporary directories
* **Application Layer**: Use real filesystem for complete workflow testing
* **Presentation Layer**: Use real filesystem for CLI and user interaction testing

### Positive Consequences

* Improved test isolation and reliability
* Better alignment with layered architecture
* Faster test execution, especially for unit tests
* Clearer patterns for different testing scenarios
* Support for both in-memory and real filesystem testing

### Negative Consequences

* Requires migration of existing tests to new patterns
* Two different approaches may increase complexity
* Developers need to understand when to use each approach

## Implementation Details

### Real Filesystem Implementation

```javascript
const { createTestEnvironment } = require('../migration-utils');

describe('Task operations', () => {
  let env;
  
  beforeEach(() => {
    env = createTestEnvironment('task-operations-test');
    env.setup({
      columnNames: ['Backlog', 'In Progress', 'Done']
    });
  });
  
  afterEach(() => {
    env.cleanup();
  });
  
  test('should create task', async () => {
    await env.kanbn.createTask('Test Task');
    env.assertions.taskExists(env.testDir, 'test-task');
  });
});
```

### Virtual Filesystem Implementation

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

## Links

* [ADR-001: Testing Strategy](./0001-testing-strategy.md)
* [ADR-004: Layered Architecture](./0004-layered-architecture.md)
* [Test/TESTING_PATTERNS.md](../../test/TESTING_PATTERNS.md)
