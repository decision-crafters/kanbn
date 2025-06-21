const fileUtils = require('../../src/lib/file-utils');
const fs = require('fs');
const path = require('path');

describe('file-utils tests', () => {

  test('exists() should return true if a file exists', async () => {
  const tempFile = path.join(__dirname, 'temp-test-file.txt');
  try {
    await fs.promises.writeFile(tempFile, 'test content');
    expect(await fileUtils.exists(tempFile)).toBe(true);
    expect(await fileUtils.exists(tempFile + '.nonexistent')).toBe(false);
  } finally {
    try {
      await fs.promises.unlink(tempFile);
    } catch (e) {
    }
  }
});

test('getTaskPath() should return the correct path', async () => {
  expect(
    fileUtils.getTaskPath('/tasks', 'task-1')
  ).toBe(path.join('/tasks', 'task-1.md'));
});

test('addFileExtension() should add .md extension if needed', async () => {
  expect(fileUtils.addFileExtension('task-1')).toBe('task-1.md');
  expect(fileUtils.addFileExtension('task-1.md')).toBe('task-1.md');
});

  test('removeFileExtension() should remove .md extension if present', async () => {
    expect(fileUtils.removeFileExtension('task-1.md')).toBe('task-1');
    expect(fileUtils.removeFileExtension('task-1')).toBe('task-1');
  });

});
