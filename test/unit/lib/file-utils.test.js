const path = require('path');
const fs = require('fs'); // Import the original fs module
const fileUtils = require('../../../src/lib/file-utils');

// Mock the fs module ONLY for the functions we need to control
// We want to mock fs.promises.access
jest.mock('fs', () => ({
  ...jest.requireActual('fs'), // Use actual implementations for other fs functions
  promises: {
    ...jest.requireActual('fs').promises, // Use actual promises API for others
    access: jest.fn(), // Mock only the access function
  },
  constants: jest.requireActual('fs').constants, // Need constants like F_OK
}));

// Helper to access the mocked function
const mockFsAccess = fs.promises.access;

describe('file-utils.js', () => {
  // Clear mocks before each test
  beforeEach(() => {
    mockFsAccess.mockClear();
  });

  describe('addFileExtension()', () => {
    test('should add .md extension if missing', () => {
      expect(fileUtils.addFileExtension('task-id')).toBe('task-id.md');
    });

    test('should not add .md extension if already present', () => {
      expect(fileUtils.addFileExtension('task-id.md')).toBe('task-id.md');
    });

    test('should return empty string for non-string input', () => {
      expect(fileUtils.addFileExtension(null)).toBe('');
      expect(fileUtils.addFileExtension(undefined)).toBe('');
      expect(fileUtils.addFileExtension(123)).toBe('');
    });
  });

  describe('removeFileExtension()', () => {
    test('should remove .md extension if present', () => {
      expect(fileUtils.removeFileExtension('task-id.md')).toBe('task-id');
    });

    test('should not remove extension if not .md', () => {
      expect(fileUtils.removeFileExtension('task-id.txt')).toBe('task-id.txt');
    });

    test('should return original string if no .md extension', () => {
      expect(fileUtils.removeFileExtension('task-id')).toBe('task-id');
    });

    test('should return empty string for non-string input', () => {
      expect(fileUtils.removeFileExtension(null)).toBe('');
      expect(fileUtils.removeFileExtension(undefined)).toBe('');
      expect(fileUtils.removeFileExtension(123)).toBe('');
    });
  });

  describe('getTaskPath()', () => {
    test('should join task folder and task ID with extension', () => {
      const expectedPath = path.join('/path/to/tasks', 'my-task.md');
      expect(fileUtils.getTaskPath('/path/to/tasks', 'my-task')).toBe(expectedPath);
    });

    test('should handle task ID that already has extension', () => {
      const expectedPath = path.join('/path/to/tasks', 'my-task.md');
      expect(fileUtils.getTaskPath('/path/to/tasks', 'my-task.md')).toBe(expectedPath);
    });

    test('should return folder path if taskId is invalid', () => {
      expect(fileUtils.getTaskPath('/path/to/tasks', null)).toBe('/path/to/tasks');
    });

    test('should return empty string if taskFolder is invalid', () => {
      expect(fileUtils.getTaskPath(null, 'my-task')).toBe('');
    });
  });

  describe('exists()', () => {
    test('should return true if fs.promises.access resolves', async () => {
      // Configure mock to resolve successfully
      mockFsAccess.mockResolvedValue(undefined);

      const result = await fileUtils.exists('/path/to/existing/file');
      expect(result).toBe(true);
      expect(mockFsAccess).toHaveBeenCalledWith('/path/to/existing/file', fs.constants.F_OK);
    });

    test('should return false if fs.promises.access rejects (throws error)', async () => {
      // Configure mock to reject
      const mockError = new Error('ENOENT: no such file or directory');
      mockFsAccess.mockRejectedValue(mockError);

      const result = await fileUtils.exists('/path/to/nonexistent/file');
      expect(result).toBe(false);
      expect(mockFsAccess).toHaveBeenCalledWith('/path/to/nonexistent/file', fs.constants.F_OK);
    });
  });
});
