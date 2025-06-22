const fs = require('fs');
const path = require('path');

// Custom matcher to verify that an array contains a value matching a regex or string
expect.extend({
  toContainMatch(received, expected) {
    if (!Array.isArray(received)) {
      throw new Error('toContainMatch can only be used on arrays');
    }
    const regex = typeof expected === 'string' ? new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : expected;
    const stripAnsi = str => str.replace(/\u001b\[[0-9;]*m/g, '');
    const pass = received.some(item => regex.test(stripAnsi(String(item))));
    return {
      pass,
      message: () => pass
        ? `Expected array not to contain match for ${regex}`
        : `Expected array to contain match for ${regex}`
    };
  },

  async toRejectWith(received, expected) {
    if (typeof received !== 'object' || typeof received.then !== 'function') {
      throw new Error('toRejectWith must be used with a Promise');
    }
    try {
      await received;
      return { pass: false, message: () => 'Expected promise to reject but it resolved' };
    } catch (error) {
      let pass = false;
      if (expected instanceof RegExp) {
        pass = expected.test(error.message);
      } else if (typeof expected === 'string') {
        pass = error.message.includes(expected);
      } else if (typeof expected === 'function') {
        pass = error instanceof expected;
      } else {
        pass = error.message === String(expected);
      }
      return {
        pass,
        message: () => pass
          ? `Expected promise not to reject with "${error.message}"`
          : `Expected promise to reject with ${expected} but got "${error.message}"`
      };
    }
  }
});

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

module.exports = { ...jestContext, ...migrationHelpers };
