const fs = require('fs');
const path = require('path');

// Custom Jest matchers for migration from QUnit
const customMatchers = {
  toContainMatch(received, expected) {
    const pass = received.some(item => {
      if (expected instanceof RegExp) {
        return expected.test(item);
      }
      return item.includes(expected);
    });

    if (pass) {
      return {
        message: () => `expected ${received} not to contain match for ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to contain match for ${expected}`,
        pass: false,
      };
    }
  },

  toRejectWith(received, expected) {
    return received.then(
      () => {
        return {
          message: () => `expected promise to reject with ${expected}`,
          pass: false,
        };
      },
      (error) => {
        const pass = expected instanceof RegExp 
          ? expected.test(error.message)
          : error.message.includes(expected);
        
        if (pass) {
          return {
            message: () => `expected promise not to reject with ${expected}`,
            pass: true,
          };
        } else {
          return {
            message: () => `expected promise to reject with ${expected}, but got ${error.message}`,
            pass: false,
          };
        }
      }
    );
  },

  // QUnit assert.throwsAsync equivalent
  async toThrowAsync(received, expected) {
    let error;
    try {
      await received();
    } catch (e) {
      error = e;
    }

    if (!error) {
      return {
        message: () => `expected function to throw an error`,
        pass: false,
      };
    }

    if (expected) {
      const pass = expected instanceof RegExp 
        ? expected.test(error.message)
        : error.message.includes(expected);
      
      if (pass) {
        return {
          message: () => `expected function not to throw error matching ${expected}`,
          pass: true,
        };
      } else {
        return {
          message: () => `expected function to throw error matching ${expected}, but got ${error.message}`,
          pass: false,
        };
      }
    }

    return {
      message: () => `expected function not to throw an error`,
      pass: true,
    };
  },

  // QUnit assert.contains equivalent
  toContain(received, expected) {
    if (Array.isArray(received)) {
      const pass = received.some(item => {
        if (expected instanceof RegExp) {
          return expected.test(item);
        }
        return item === expected || (typeof item === 'string' && item.includes(expected));
      });

      if (pass) {
        return {
          message: () => `expected ${received} not to contain ${expected}`,
          pass: true,
        };
      } else {
        return {
          message: () => `expected ${received} to contain ${expected}`,
          pass: false,
        };
      }
    } else if (typeof received === 'string') {
      const pass = expected instanceof RegExp 
        ? expected.test(received)
        : received.includes(expected);
      
      if (pass) {
        return {
          message: () => `expected "${received}" not to contain "${expected}"`,
          pass: true,
        };
      } else {
        return {
          message: () => `expected "${received}" to contain "${expected}"`,
          pass: false,
        };
      }
    }

    return {
      message: () => `toContain matcher only supports arrays and strings`,
      pass: false,
    };
  },
};

// Extend expect with custom matchers
expect.extend(customMatchers);

// Export individual matchers for selective import
module.exports = {
  toThrowAsync: customMatchers.toThrowAsync,
  toContain: customMatchers.toContain,
  toContainMatch: customMatchers.toContainMatch,
  toRejectWith: customMatchers.toRejectWith,
};

// Helper functions ported from context.js using Jest assertions
const jestContext = {
  indexExists(basePath, expected = true, indexName = 'index.md') {
    let exists = false;
    try {
      // Check if basePath already includes .kanbn or if we need to add it
      const indexPath = basePath.endsWith('.kanbn') ? 
        path.join(basePath, indexName) : 
        path.join(basePath, '.kanbn', indexName);
      fs.statSync(indexPath);
      exists = true;
    } catch (e) {
      exists = false;
    }
    expect(exists).toBe(expected);
  },

  projectHasFile(basePath, fileName, expected = true) {
    let exists = false;
    try {
      fs.statSync(path.join(basePath, fileName));
      exists = true;
    } catch (e) {
      exists = false;
    }
    expect(exists).toBe(expected);
  },

  taskFileExists(basePath, taskId, expected = true) {
    let exists;
    try {
      // Check if basePath already includes .kanbn or if we need to add it
      const taskPath = basePath.endsWith('.kanbn') ? 
        path.join(basePath, 'tasks', `${taskId}.md`) : 
        path.join(basePath, '.kanbn', 'tasks', `${taskId}.md`);
      fs.statSync(taskPath);
      exists = true;
    } catch (e) {
      exists = false;
    }
    expect(exists).toBe(expected);
  },

  indexHasTask(basePath, taskId, columnName = null, expected = true) {
    // Check if basePath already includes .kanbn or if we need to add it
    const indexPath = basePath.endsWith('.kanbn') ? 
      path.join(basePath, 'index.md') : 
      path.join(basePath, '.kanbn', 'index.md');
    console.log(`[DEBUG] indexHasTask - basePath: ${basePath}`);
    console.log(`[DEBUG] indexHasTask - indexPath: ${indexPath}`);
    console.log(`[DEBUG] indexHasTask - index file exists: ${fs.existsSync(indexPath)}`);
    if (!fs.existsSync(indexPath)) {
      if (!expected) {
        return;
      }
      throw new Error(`Index file missing at ${indexPath}`);
    }
    const parseIndex = require('../src/parse-index');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    const index = parseIndex.md2json(indexContent);
    if (columnName === null) {
      const all = Object.values(index.columns).flat();
      if (expected) {
        expect(all).toContain(taskId);
      } else {
        expect(all).not.toContain(taskId);
      }
    } else {
      const columnTasks = index.columns[columnName] || [];
      if (expected) {
        expect(columnTasks).toContain(taskId);
      } else {
        expect(columnTasks).not.toContain(taskId);
      }
    }
  },

  indexHasColumn(basePath, columnName, expected = true) {
    const indexPath = path.join(basePath, 'index.md');
    if (!fs.existsSync(indexPath)) {
      if (!expected) {
        return;
      }
      throw new Error(`Index file missing at ${indexPath}`);
    }
    const parseIndex = require('../src/parse-index');
    const content = fs.readFileSync(indexPath, 'utf-8');
    const index = parseIndex.md2json(content);
    if (expected) {
      expect(Object.keys(index.columns)).toContain(columnName);
    } else {
      expect(Object.keys(index.columns)).not.toContain(columnName);
    }
  },

  taskHasStatusValue(basePath, taskId, statusValue, expected = true) {
    const taskPath = path.join(basePath, 'tasks', `${taskId}.md`);
    if (!fs.existsSync(taskPath)) {
      if (!expected) {
        return;
      }
      throw new Error(`Task file missing at ${taskPath}`);
    }
    const parseTask = require('../src/parse-task');
    const content = fs.readFileSync(taskPath, 'utf-8');
    const task = parseTask.md2json(content);
    if (expected) {
      expect(task.status).toBe(statusValue);
    } else {
      expect(task.status).not.toBe(statusValue);
    }
  },

  taskHasAssignedValue(basePath, taskId, assignedValue, expected = true) {
    const taskPath = path.join(basePath, 'tasks', `${taskId}.md`);
    if (!fs.existsSync(taskPath)) {
      if (!expected) {
        return;
      }
      throw new Error(`Task file missing at ${taskPath}`);
    }
    const parseTask = require('../src/parse-task');
    const content = fs.readFileSync(taskPath, 'utf-8');
    const task = parseTask.md2json(content);
    if (expected) {
      expect(task.assigned).toBe(assignedValue);
    } else {
      expect(task.assigned).not.toBe(assignedValue);
    }
  },

  taskHasContent(basePath, taskId, expectedContent, expected = true) {
    const taskPath = path.join(basePath, 'tasks', `${taskId}.md`);
    if (!fs.existsSync(taskPath)) {
      if (!expected) {
        return;
      }
      throw new Error(`Task file missing at ${taskPath}`);
    }
    const content = fs.readFileSync(taskPath, 'utf-8');
    if (expected) {
      expect(content).toContain(expectedContent);
    } else {
      expect(content).not.toContain(expectedContent);
    }
  }
};

// Migration-specific helpers
const migrationHelpers = {
  /**
   * Convert QUnit assert.async() pattern to Jest async/await
   * @param {Function} testFn - Test function that uses assert.async()
   * @returns {Function} - Jest-compatible async test function
   */
  convertAsyncTest(testFn) {
    return async () => {
      let resolveTest;
      const testPromise = new Promise(resolve => {
        resolveTest = resolve;
      });
      
      // Mock assert.async() to return a function that resolves the promise
      const mockAssert = {
        async: (count = 1) => {
          let callCount = 0;
          return () => {
            callCount++;
            if (callCount >= count) {
              resolveTest();
            }
          };
        }
      };
      
      // Call the original test function with mock assert
      testFn(mockAssert);
      
      // Wait for async operations to complete
      await testPromise;
    };
  },

  /**
   * Convert QUnit assertions to Jest expectations
   * @param {object} assert - QUnit assert object
   * @returns {object} - Jest-compatible expect functions
   */
  convertAssertions(assert) {
    return {
      ok: (value, message) => expect(value).toBeTruthy(),
      equal: (actual, expected, message) => expect(actual).toBe(expected),
      strictEqual: (actual, expected, message) => expect(actual).toBe(expected),
      deepEqual: (actual, expected, message) => expect(actual).toEqual(expected),
      notEqual: (actual, expected, message) => expect(actual).not.toBe(expected),
      true: (value, message) => expect(value).toBe(true),
      false: (value, message) => expect(value).toBe(false),
      throws: (fn, expected, message) => expect(fn).toThrow(expected)
    };
  },

  /**
   * Setup mock for kanbn functions commonly used in tests
   * @returns {object} - Mock kanbn functions
   */
  createKanbnMocks() {
    return {
      findTaskColumn: jest.fn(),
      status: jest.fn(),
      createTask: jest.fn(),
      moveTask: jest.fn(),
      deleteTask: jest.fn(),
      updateTask: jest.fn(),
      archiveTask: jest.fn(),
      restoreTask: jest.fn()
    };
  }
};

/**
 * Create a test environment with a real filesystem
 * @param {string} testName - Name of the test (used for directory naming)
 * @returns {object} - Test environment object with setup and cleanup methods
 */
function createTestEnvironment(testName) {
  const os = require('os');
  const fs = require('fs-extra');
  const path = require('path');
  const kanbnFactory = require('../src/main');
  
  // Create a unique test directory path
  const testDir = path.join(
    global.__KANBN_TEST_DIR__ || os.tmpdir(), 
    'kanbn-test-' + testName + '-' + Date.now().toString(36)
  );
  
  // Return environment object with setup and cleanup functions
  return {
    testDir,
    
    /**
     * Set up the test environment
     * @param {object} options - Setup options
     * @param {string[]} options.columnNames - Column names to create
     * @param {string} options.taskFolderName - Custom task folder name
     * @returns {object} - Test data including paths and configuration
     */
    setup(options = {}) {
      // Ensure the test directory exists
      fs.ensureDirSync(testDir);
      
      // Get a Kanbn instance for the test directory
      const kanbn = kanbnFactory(testDir);
      const columnNames = options.columnNames || ['To Do', 'In Progress', 'Done'];
      
      // Initialize Kanbn with columns
      return kanbn.initialise({
        taskFolderName: options.taskFolderName || '.kanbn/tasks',
        columnNames
      }).then(() => {
        // Return test data
        return {
          testDir,
          kanbn,
          columnNames,
          taskFolder: path.join(testDir, options.taskFolderName || '.kanbn/tasks'),
          indexPath: path.join(testDir, '.kanbn/index.md')
        };
      });
    },
    
    /**
     * Clean up the test environment
     */
    cleanup() {
      try {
        // Remove the test directory recursively
        if (fs.existsSync(testDir)) {
          fs.removeSync(testDir);
        }
      } catch (error) {
        console.error(`Error cleaning up test directory: ${error.message}`);
      }
    }
  };
}

module.exports = { ...jestContext, ...migrationHelpers, createTestEnvironment };
