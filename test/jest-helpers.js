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
      fs.statSync(path.join(basePath, indexName));
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
    let exists = false;
    try {
      fs.statSync(path.join(basePath, 'tasks', `${taskId}.md`));
      exists = true;
    } catch (e) {
      exists = false;
    }
    expect(exists).toBe(expected);
  },

  indexHasTask(basePath, taskId, columnName = null, expected = true) {
    const parseIndex = require('../src/parse-index');
    const indexContent = fs.readFileSync(path.join(basePath, 'index.md'), 'utf-8');
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
    const parseIndex = require('../src/parse-index');
    const content = fs.readFileSync(path.join(basePath, 'index.md'), 'utf-8');
    const index = parseIndex.md2json(content);
    if (expected) {
      expect(Object.keys(index.columns)).toContain(columnName);
    } else {
      expect(Object.keys(index.columns)).not.toContain(columnName);
    }
  },

  taskHasStatusValue(basePath, taskId, statusValue, expected = true) {
    const parseTask = require('../src/parse-task');
    const content = fs.readFileSync(path.join(basePath, 'tasks', `${taskId}.md`), 'utf-8');
    const task = parseTask.md2json(content);
    if (expected) {
      expect(task.status).toBe(statusValue);
    } else {
      expect(task.status).not.toBe(statusValue);
    }
  },

  taskHasAssignedValue(basePath, taskId, assignedValue, expected = true) {
    const parseTask = require('../src/parse-task');
    const content = fs.readFileSync(path.join(basePath, 'tasks', `${taskId}.md`), 'utf-8');
    const task = parseTask.md2json(content);
    if (expected) {
      expect(task.assigned).toBe(assignedValue);
    } else {
      expect(task.assigned).not.toBe(assignedValue);
    }
  },

  taskHasContent(basePath, taskId, expectedContent, expected = true) {
    const content = fs.readFileSync(path.join(basePath, 'tasks', `${taskId}.md`), 'utf-8');
    if (expected) {
      expect(content).toContain(expectedContent);
    } else {
      expect(content).not.toContain(expectedContent);
    }
  }
};

module.exports = jestContext;
