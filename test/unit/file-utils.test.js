const fileUtils = require('../../src/lib/file-utils');
const fs = require('fs');
const path = require('path');

QUnit.module('file-utils tests', {
  before() {
    require('../qunit-throws-async');
  }
});

QUnit.test('exists() should return true if a file exists', async assert => {
  const tempFile = path.join(__dirname, 'temp-test-file.txt');
  try {
    await fs.promises.writeFile(tempFile, 'test content');
    assert.equal(await fileUtils.exists(tempFile), true);
    assert.equal(await fileUtils.exists(tempFile + '.nonexistent'), false);
  } finally {
    try {
      await fs.promises.unlink(tempFile);
    } catch (e) {
    }
  }
});

QUnit.test('getTaskPath() should return the correct path', async assert => {
  assert.equal(
    fileUtils.getTaskPath('/tasks', 'task-1'),
    path.join('/tasks', 'task-1.md')
  );
});

QUnit.test('addFileExtension() should add .md extension if needed', async assert => {
  assert.equal(fileUtils.addFileExtension('task-1'), 'task-1.md');
  assert.equal(fileUtils.addFileExtension('task-1.md'), 'task-1.md');
});

QUnit.test('removeFileExtension() should remove .md extension if present', async assert => {
  assert.equal(fileUtils.removeFileExtension('task-1.md'), 'task-1');
  assert.equal(fileUtils.removeFileExtension('task-1'), 'task-1');
});
