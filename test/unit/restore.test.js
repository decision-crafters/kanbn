const mockFileSystem = require('mock-fs');
const kanbn = require('../../src/main');
const context = require('../context');

describe('restore tests', () => {
  beforeAll(() => {
    require('../qunit-throws-async');
  
  });
  afterEach(() => {
    mockFileSystem.restore();
  
  });

  test('Restore task in uninitialised folder should throw ', not initialised" error', async assert => {
  mockFileSystem();
  await expect(async () => {
      await kanbn.restoreTask('task-1');
    }).toThrowAsync(/Not initialised in this folder/
  );
});

  test('Restore task with no archive folder should throw ', no archive folder" error', async assert => {
  mockFileSystem({
    '.kanbn': {
      'index.md': '# Test Project\n\n## Test Column'
    }
  });
  await expect(async () => {
      await kanbn.restoreTask('task-1');
    }).toThrowAsync(/Archive folder doesn't exist/
  );
});

  test('Restore non-existing task should throw ', archived task not found" error', async assert => {
  mockFileSystem({
    '.kanbn': {
      'index.md': '# Test Project\n\n## Test Column',
      'archive': {}
    }
  });
  await expect(async () => {
      await kanbn.restoreTask('task-1');
    }).toThrowAsync(/No archived task found with id "task-1"/
  );
});

  test('Restore task with duplicate indexed task should throw ', already indexed" error', async assert => {
  mockFileSystem({
    '.kanbn': {
      'index.md': '# Test Project\n\n## Test Column\n\n- test-task-1',
      'tasks': {
        'test-task-1.md': '# Test Task 1'
      },
      'archive': {
        'test-task-1.md': '# Test Task 1'
      }
    }
  });
  await expect(async () => {
      await kanbn.restoreTask('test-task-1');
    }).toThrowAsync(/There is already an indexed task with id "test-task-1"/
  );
});

  test('Restore task with duplicate untracked task should throw ', already exists" error', async assert => {
  mockFileSystem({
    '.kanbn': {
      'index.md': '# Test Project\n\n## Test Column',
      'tasks': {
        'test-task-1.md': '# Test Task 1'
      },
      'archive': {
        'test-task-1.md': '# Test Task 1'
      }
    }
  });
  await expect(async () => {
      await kanbn.restoreTask('test-task-1');
    }).toThrowAsync(/There is already an untracked task with id "test-task-1"/
  );
});

  test('Restore task with no columns in the index should throw ', no columns" error', async assert => {
  mockFileSystem({
    '.kanbn': {
      'index.md': '# Test Project',
      'archive': {
        'test-task-1.md': '# Test Task 1'
      }
    }
  });
  await expect(async () => {
      await kanbn.restoreTask('test-task-1');
    }).toThrowAsync(/No columns defined in the index/
  );
});

  test('Restore task to original column', async () => {
  const BASE_PATH = await kanbn.getMainFolder();
  mockFileSystem({
    '.kanbn': {
      'index.md': '# Test Project\n\n## Test Column 1\n\n- test-task-1\n\n## Test Column 2',
      'tasks': {
        'test-task-1.md': '# Test Task 1'
      },
      'archive': {
        'test-task-2.md': '# Test Task 2\n\n## Metadata\n\n---\ncolumn: Test Column 2'
      }
    }
  });

  await kanbn.restoreTask('test-task-2');
  context.indexHasTask(assert, BASE_PATH, 'test-task-2', 'Test Column 2');
  context.taskFileExists(assert, BASE_PATH, 'test-task-2');
  context.archivedTaskFileExists(assert, BASE_PATH, 'test-task-2', false);
});

  test('Restore task to first column', async () => {
  const BASE_PATH = await kanbn.getMainFolder();
  mockFileSystem({
    '.kanbn': {
      'index.md': '# Test Project\n\n## Test Column 1\n\n- test-task-1\n\n## Test Column 2',
      'tasks': {
        'test-task-1.md': '# Test Task 1'
      },
      'archive': {
        'test-task-2.md': '# Test Task 2'
      }
    }
  });

  await kanbn.restoreTask('test-task-2');
  context.indexHasTask(assert, BASE_PATH, 'test-task-2', 'Test Column 1');
  context.taskFileExists(assert, BASE_PATH, 'test-task-2');
  context.archivedTaskFileExists(assert, BASE_PATH, 'test-task-2', false);
});

  test('Restore task to specified column', async () => {
  const BASE_PATH = await kanbn.getMainFolder();
  mockFileSystem({
    '.kanbn': {
      'index.md': '# Test Project\n\n## Test Column 1\n\n- test-task-1\n\n## Test Column 2',
      'tasks': {
        'test-task-1.md': '# Test Task 1'
      },
      'archive': {
        'test-task-2.md': '# Test Task 2'
      }
    }
  });

  await kanbn.restoreTask('test-task-2', 'Test Column 2');
  context.indexHasTask(assert, BASE_PATH, 'test-task-2', 'Test Column 2');
  context.taskFileExists(assert, BASE_PATH, 'test-task-2');
  context.archivedTaskFileExists(assert, BASE_PATH, 'test-task-2', false);
});

});\