const fs = require('fs');
const path = require('path');
const realFs = require('./real-fs-fixtures');
const kanbnFactory = require('../src/main');
const mockDate = require('mockdate');

/**
 * Standard migration utilities for converting QUnit/mock-fs tests to Jest/real-fs
 * This module provides consistent patterns for test setup, teardown, and common operations
 */

/**
 * Column name mapping utilities
 */
const COLUMN_MAPPINGS = {
  // Legacy column patterns to standard names
  'Column 1': 'Backlog',
  'Column 2': 'In Progress', 
  'Column 3': 'Done',
  'Column 4': 'Archive',
  
  // Standard column names (no mapping needed)
  'Backlog': 'Backlog',
  'Todo': 'Todo',
  'In Progress': 'In Progress',
  'Doing': 'In Progress',
  'Done': 'Done',
  'Completed': 'Done',
  'Archive': 'Archive'
};

/**
 * Maps legacy column names to standard column names
 * @param {string} columnName - The column name to map
 * @returns {string} - The standardized column name
 */
function mapColumnName(columnName) {
  return COLUMN_MAPPINGS[columnName] || columnName;
}

/**
 * Maps an array of column names to standard names
 * @param {string[]} columnNames - Array of column names to map
 * @returns {string[]} - Array of standardized column names
 */
function mapColumnNames(columnNames) {
  return columnNames.map(mapColumnName);
}

/**
 * Standard test environment setup for real filesystem tests
 * Replaces mock-fs setup patterns
 */
class TestEnvironment {
  constructor(testName, options = {}) {
    this.testName = testName;
    this.options = options;
    this.testDir = null;
    this.originalCwd = null;
    this.kanbn = null;
  }

  /**
   * Setup test environment - call in beforeEach
   * @param {object} fixtureOptions - Options for fixture creation
   * @returns {object} - Test environment data
   */
  setup(fixtureOptions = {}) {
    // Create unique test directory
    const timestamp = Date.now();
    const uniqueTestName = `${this.testName}-${timestamp}`;
    
    // Apply default fixture options
    const defaultOptions = {
      countColumns: 3,
      countTasks: 5,
      columnNames: ['Backlog', 'In Progress', 'Done'],
      tasksPerColumn: 2,
      ...fixtureOptions
    };

    // Map column names to standard format
    if (defaultOptions.columnNames) {
      defaultOptions.columnNames = mapColumnNames(defaultOptions.columnNames);
    }

    // Create fixtures
    const fixtureData = realFs.createFixtures(uniqueTestName, defaultOptions);
    this.testDir = fixtureData.testDir;
    
    // Store original working directory and change to test directory
    this.originalCwd = process.cwd();
    process.chdir(this.testDir);
    
    // Initialize kanbn with test directory
    this.kanbn = kanbnFactory(this.testDir);
    
    return {
      testDir: this.testDir,
      basePath: this.testDir,
      kanbn: this.kanbn,
      index: fixtureData.index
    };
  }

  /**
   * Cleanup test environment - call in afterEach
   */
  cleanup() {
    // Restore original working directory
    if (this.originalCwd) {
      process.chdir(this.originalCwd);
    }
    
    // Clean up test directory
    if (this.testDir) {
      realFs.cleanupFixtures(this.testDir);
    }
    
    // Reset mockDate if it was used
    mockDate.reset();
  }

  /**
   * Create an uninitialized directory for testing error conditions
   * @returns {string} - Path to uninitialized directory
   */
  createUninitializedDir() {
    const uninitDir = path.join(this.testDir, 'uninit');
    fs.mkdirSync(uninitDir, { recursive: true });
    return uninitDir;
  }
}

/**
 * Common assertion helpers for migrated tests
 */
const assertions = {
  /**
   * Assert that a task exists in the filesystem
   * @param {string} basePath - Base path of the project
   * @param {string} taskId - Task ID to check
   * @param {boolean} expected - Whether task should exist
   */
  taskExists(basePath, taskId, expected = true) {
    const taskPath = path.join(basePath, '.kanbn', 'tasks', `${taskId}.md`);
    const exists = fs.existsSync(taskPath);
    expect(exists).toBe(expected);
  },

  /**
   * Assert that index contains a task in specified column
   * @param {string} basePath - Base path of the project
   * @param {string} taskId - Task ID to check
   * @param {string} columnName - Column name (will be mapped to standard name)
   * @param {boolean} expected - Whether task should be in column
   */
  taskInColumn(basePath, taskId, columnName, expected = true) {
    const indexPath = path.join(basePath, '.kanbn', 'index.md');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const standardColumnName = mapColumnName(columnName);
    
    // Simple check for task in column section
    const columnRegex = new RegExp(`## ${standardColumnName}[\s\S]*?- ${taskId}`);
    const taskInColumn = columnRegex.test(indexContent);
    expect(taskInColumn).toBe(expected);
  },

  /**
   * Assert that kanbn throws expected error
   * @param {Promise} promise - Promise that should reject
   * @param {string|RegExp} expectedError - Expected error message or pattern
   */
  async expectError(promise, expectedError) {
    await expect(promise).rejects.toThrow(expectedError);
  },

  /**
   * Assert that output contains expected pattern
   * @param {string[]} output - Output lines to check
   * @param {string|RegExp} pattern - Pattern to match
   */
  outputContains(output, pattern) {
    expect(output).toContainMatch(pattern);
  }
};

/**
 * Migration helper functions
 */
const migration = {
  /**
   * Convert QUnit test structure to Jest describe/test
   * @param {string} moduleName - QUnit module name
   * @param {Function} testFn - Test function
   * @returns {Function} - Jest describe block
   */
  convertModule(moduleName, testFn) {
    // Jest describe function should be called in test context
    if (typeof describe !== 'undefined') {
      return describe(moduleName, testFn);
    }
    return testFn;
  },

  /**
   * Convert QUnit test to Jest test
   * @param {string} testName - Test name
   * @param {Function} testFn - Test function
   * @returns {Function} - Jest test
   */
  convertTest(testName, testFn) {
    // Jest test function should be called in test context
    if (typeof test !== 'undefined') {
      return test(testName, testFn);
    }
    return testFn;
  },

  /**
   * Convert QUnit async test to Jest async test
   * @param {string} testName - Test name
   * @param {Function} testFn - Async test function
   * @returns {Function} - Jest async test
   */
  convertAsyncTest(testName, testFn) {
    // Jest test function should be called in test context
    if (typeof test !== 'undefined') {
      return test(testName, async () => {
        await testFn();
      });
    }
    return testFn;
  },

  /**
   * Replace mock-fs setup with real filesystem setup
   * @param {object} mockFsConfig - Mock-fs configuration
   * @param {TestEnvironment} env - Test environment instance
   * @returns {object} - Real filesystem equivalent
   */
  replaceMockFs(mockFsConfig, env) {
    // Convert mock-fs config to real-fs fixture options
    const fixtureOptions = {
      countTasks: 0, // Start with no tasks
      countColumns: 3,
      columnNames: ['Backlog', 'In Progress', 'Done']
    };

    // If mock-fs config has specific structure, adapt it
    if (mockFsConfig && typeof mockFsConfig === 'object') {
      // Extract any specific requirements from mock-fs config
      // This is a placeholder for more complex conversions
    }

    return env.setup(fixtureOptions);
  }
};

/**
 * Factory function to create a standard test environment
 * @param {string} testName - Name of the test suite
 * @param {object} options - Environment options
 * @returns {TestEnvironment} - Test environment instance
 */
function createTestEnvironment(testName, options = {}) {
  return new TestEnvironment(testName, options);
}

/**
 * Quick setup function for simple test migrations
 * @param {string} testName - Test name
 * @param {object} fixtureOptions - Fixture options
 * * @returns {object} - Setup data with cleanup function
 */
function quickSetup(testName, fixtureOptions = {}) {
  const env = createTestEnvironment(testName);
  const setupData = env.setup(fixtureOptions);
  
  return {
    ...setupData,
    cleanup: () => env.cleanup(),
    env
  };
}

module.exports = {
  TestEnvironment,
  createTestEnvironment,
  quickSetup,
  mapColumnName,
  mapColumnNames,
  assertions,
  migration,
  COLUMN_MAPPINGS
};