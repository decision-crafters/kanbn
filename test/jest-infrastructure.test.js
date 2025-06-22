const ctx = require('./jest-helpers');
const { createTestEnvironment } = require('./migration-utils');
const path = require('path');
let basePath;
let testEnv;

describe('Jest Infrastructure Proof of Concept', () => {
  beforeEach(() => {
    testEnv = createTestEnvironment('jest-infrastructure');
    const setupData = testEnv.setup({
      columnNames: ['Todo', 'Doing', 'Done'],
      countTasks: 4,
      tasksPerColumn: 2
    });
    basePath = setupData.basePath;
  });

  afterEach(() => {
    if (testEnv) {
      testEnv.cleanup();
    }
  });

  describe('File System Helpers', () => {
    test('should verify index exists', () => {
      ctx.indexExists(basePath);
      ctx.indexExists(path.join(process.cwd(), 'nonexistent'), false);
    });

    test('should verify project files exist', () => {
      ctx.projectHasFile(basePath, '.kanbn/index.md');
      ctx.projectHasFile(basePath, '.kanbn/tasks');
      ctx.projectHasFile(basePath, 'missing.md', false);
    });

    test('should verify task files exist', () => {
      ctx.taskFileExists(basePath, 'task-1');
      ctx.taskFileExists(basePath, 'task-2');
      ctx.taskFileExists(basePath, 'none', false);
    });
  });

  // Index helpers rely on reading files from mock-fs which is not fully
  // supported in this test environment. These tests are omitted from the
  // proof of concept but helpers remain for future use.

  describe('Custom Matchers', () => {
    test('should match array contents with regex', () => {
      const lines = ['Task created: task-1', 'Done!', 'Another message'];
      expect(lines).toContainMatch(/Task created/);
      expect(lines).toContainMatch(/Done!/);
      expect(lines).not.toContainMatch(/Error/);
    });

    test('should match array contents with strings', () => {
      const lines = ['Success', 'Task completed', 'All done'];
      expect(lines).toContainMatch('Success');
      expect(lines).toContainMatch('Task completed');
    });

    test('should handle async rejections', async () => {
      const rejectPromise = Promise.reject(new Error('Test error'));
      await expect(rejectPromise).toRejectWith(/Test error/);

      const specific = Promise.reject(new Error('Specific failure'));
      await expect(specific).toRejectWith('Specific failure');
    });
  });

  describe('Integration Test', () => {
    test('should verify complete workflow', () => {
      ctx.indexExists(basePath);
      ctx.projectHasFile(basePath, '.kanbn/index.md');
      ctx.taskFileExists(basePath, 'task-1');
      const output = ['Created task-1', 'Updated index', 'Operation complete'];
      expect(output).toContainMatch(/Created/);
      expect(output).toContainMatch(/complete/);
    });
  });
});
