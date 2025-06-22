# Test Migration Guide: QUnit/mock-fs to Jest/real-fs

This guide provides standardized patterns and utilities for migrating tests from QUnit with mock-fs to Jest with real filesystem operations.

## Overview

The migration involves three main changes:
1. **Test Framework**: QUnit → Jest
2. **File System**: mock-fs → real filesystem with fixtures
3. **Assertions**: QUnit assertions → Jest expectations

## Migration Utilities

### Core Files
- `migration-utils.js` - Main migration utilities and patterns
- `jest-helpers.js` - Enhanced with migration-specific helpers
- `real-fs-fixtures.js` - Real filesystem fixture management

## Basic Migration Pattern

### Before (QUnit + mock-fs)
```javascript
const QUnit = require('qunit');
const mockFileSystem = require('mock-fs');
const kanbn = require('../src/main');

QUnit.module('Test Module', {
  beforeEach() {
    mockFileSystem({
      '.kanbn': {
        'index.md': '# Kanbn\n\n## Backlog\n\n## In Progress\n\n## Done\n'
      }
    });
  },
  afterEach() {
    mockFileSystem.restore();
  }
});

QUnit.test('test name', function(assert) {
  const done = assert.async();
  // test code
  done();
});
```

### After (Jest + real-fs)
```javascript
const { createTestEnvironment } = require('./migration-utils');
const kanbnFactory = require('../src/main');

describe('Test Module', () => {
  let env;
  let testData;

  beforeEach(() => {
    env = createTestEnvironment('test-module');
    testData = env.setup({
      countTasks: 0,
      columnNames: ['Backlog', 'In Progress', 'Done']
    });
  });

  afterEach(() => {
    env.cleanup();
  });

  test('test name', async () => {
    // test code using testData.kanbn
  });
});
```

## Migration Patterns

### 1. Test Environment Setup

#### Quick Setup (for simple tests)
```javascript
const { quickSetup } = require('./migration-utils');

test('simple test', async () => {
  const { kanbn, testDir, cleanup } = quickSetup('simple-test');
  
  try {
    // test code
  } finally {
    cleanup();
  }
});
```

#### Full Environment (for complex tests)
```javascript
const { createTestEnvironment } = require('./migration-utils');

describe('Complex Test Suite', () => {
  let env;
  let testData;

  beforeEach(() => {
    env = createTestEnvironment('complex-test');
    testData = env.setup({
      countTasks: 5,
      countColumns: 4,
      columnNames: ['Backlog', 'Todo', 'In Progress', 'Done'],
      tasksPerColumn: 2
    });
  });

  afterEach(() => {
    env.cleanup();
  });

  // tests here
});
```

### 2. Column Name Mapping

```javascript
const { mapColumnName, mapColumnNames } = require('./migration-utils');

// Single column mapping
const standardName = mapColumnName('Column 1'); // → 'Backlog'
const standardName2 = mapColumnName('Doing'); // → 'In Progress'

// Multiple column mapping
const standardNames = mapColumnNames(['Column 1', 'Column 2', 'Column 3']);
// → ['Backlog', 'In Progress', 'Done']
```

### 3. Assertions

#### File System Assertions
```javascript
const { assertions } = require('./migration-utils');

// Check if task exists
assertions.taskExists(testData.testDir, 'task-123');

// Check if task is in specific column
assertions.taskInColumn(testData.testDir, 'task-123', 'In Progress');

// Check for expected errors
await assertions.expectError(
  testData.kanbn.invalidOperation(),
  'Expected error message'
);

// Check output contains pattern
assertions.outputContains(output, /pattern/);
```

#### QUnit to Jest Assertion Conversion
```javascript
const { convertAssertions } = require('./jest-helpers');

// In migration, replace QUnit assertions:
// assert.ok(value) → expect(value).toBeTruthy()
// assert.equal(a, b) → expect(a).toBe(b)
// assert.deepEqual(a, b) → expect(a).toEqual(b)
```

### 4. Async Test Conversion

#### QUnit async pattern
```javascript
QUnit.test('async test', function(assert) {
  const done = assert.async();
  
  someAsyncOperation().then(() => {
    assert.ok(true);
    done();
  });
});
```

#### Jest async pattern
```javascript
test('async test', async () => {
  await someAsyncOperation();
  expect(true).toBeTruthy();
});
```

### 5. Uninitialized Directory Testing

```javascript
test('should handle uninitialized directory', async () => {
  const uninitDir = env.createUninitializedDir();
  const uninitKanbn = kanbnFactory(uninitDir);
  
  await assertions.expectError(
    uninitKanbn.status(),
    'Not a kanbn folder'
  );
});
```

## Common Migration Scenarios

### 1. Status Command Tests
```javascript
// Before: QUnit + mock-fs
QUnit.test('status shows tasks', function(assert) {
  mockFileSystem({
    '.kanbn': {
      'index.md': '## Backlog\n- task1\n',
      'tasks': {
        'task1.md': '# Task 1\n'
      }
    }
  });
  
  const result = kanbn().status();
  assert.ok(result.includes('task1'));
});

// After: Jest + real-fs
test('status shows tasks', async () => {
  const { kanbn } = quickSetup('status-test', {
    countTasks: 1,
    columnNames: ['Backlog']
  });
  
  const result = await kanbn.status();
  expect(result).toContain('task');
});
```

### 2. Task Creation Tests
```javascript
// Before: QUnit + mock-fs
QUnit.test('creates task', function(assert) {
  const done = assert.async();
  
  kanbn().createTask('New Task').then(() => {
    assert.ok(fs.existsSync('.kanbn/tasks/new-task.md'));
    done();
  });
});

// After: Jest + real-fs
test('creates task', async () => {
  const { kanbn, testDir } = quickSetup('create-test');
  
  await kanbn.createTask('New Task');
  assertions.taskExists(testDir, 'new-task');
});
```

### 3. Error Handling Tests
```javascript
// Before: QUnit + mock-fs
QUnit.test('handles error', function(assert) {
  const done = assert.async();
  
  kanbn().invalidOperation().catch(error => {
    assert.ok(error.message.includes('expected'));
    done();
  });
});

// After: Jest + real-fs
test('handles error', async () => {
  const { kanbn } = quickSetup('error-test');
  
  await assertions.expectError(
    kanbn.invalidOperation(),
    /expected/
  );
});
```

## Best Practices

### 1. Test Isolation
- Always use unique test names to avoid directory conflicts
- Clean up after each test using `env.cleanup()`
- Use `beforeEach`/`afterEach` for consistent setup/teardown

### 2. Fixture Management
- Use appropriate fixture options for test requirements
- Map column names to standard format
- Create minimal fixtures for faster test execution

### 3. Error Testing
- Use `assertions.expectError()` for consistent error checking
- Test both success and failure scenarios
- Verify specific error messages when important

### 4. Performance
- Use `quickSetup()` for simple tests
- Minimize fixture complexity
- Clean up promptly to avoid resource leaks

## Troubleshooting

### Common Issues

1. **Directory conflicts**: Ensure unique test names
2. **Working directory**: Tests change `process.cwd()`, ensure cleanup
3. **Async operations**: Use proper async/await patterns
4. **Column mapping**: Use standard column names consistently

### Debug Tips

1. Check test directory contents: `console.log(fs.readdirSync(testDir))`
2. Verify kanbn initialization: `console.log(kanbn.status())`
3. Check current directory: `console.log(process.cwd())`
4. Inspect fixture data: `console.log(testData)`

## Migration Checklist

- [ ] Replace `QUnit.module` with `describe`
- [ ] Replace `QUnit.test` with `test`
- [ ] Replace `mockFileSystem` with `createTestEnvironment`
- [ ] Convert `assert.async()` to `async/await`
- [ ] Update assertions to Jest expectations
- [ ] Map column names to standard format
- [ ] Add proper cleanup in `afterEach`
- [ ] Test both success and error scenarios
- [ ] Verify test isolation
- [ ] Update imports and dependencies