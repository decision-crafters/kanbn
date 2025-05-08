const mockFileSystem = require('mock-fs');
const kanbn = require('../../src/main');
const context = require('../context');

describe('archive tests', () => {
  beforeAll(() => {
    require('../qunit-throws-async');
  
  });
  },
  afterEach() {
    mockFileSystem.restore();
  }
});

  test('Archive task in uninitialised folder should throw ', not initialised" error', async assert => {
  mockFileSystem();
  await expect(async () => {
      await kanbn.archiveTask('task-1');
    }).toThrowAsync(/Not initialised in this folder/
  );
});

  test('Archive non-existent task should throw ', task file not found" error', async assert => {
  await expect(async () => {
      await kanbn.archiveTask('task-2');
    }).toThrowAsync(/No task file found with id "task-2"/
  );
});

  test('Archive untracked task should throw ', task not indexed" error', async assert => {

  // Create a mock index and untracked task
  mockFileSystem({
    '.kanbn': {
      'index.md': '# Test Project\n\n## Test Column 1',
      'tasks': {
        'test-task.md': '# Test Task'
      }
    }
  });

  // Try to archive an untracked task
  await expect(async () => {
      await kanbn.archiveTask('test-task');
    }).toThrowAsync(/Task "test-task" is not in the index/
  );
});

QUnit.test(
  'Archive task with a duplicate already in the archive should throw "already archived" error',
  async assert => {

    // Create a mock index and untracked task
    mockFileSystem({
      '.kanbn': {
        'index.md': '# Test Project\n\n## Test Column 1\n\n- [test-task](test-task.md)',
        'tasks': {
          'test-task.md': '# Test Task'
        },
        'archive': {
          'test-task.md': '# Test Task'
        }
      }
    });

    // Try to archive a task that has a duplicate in the archive
    assert.throwsAsync(
      async () => {
        await kanbn.archiveTask('test-task');
      },
      /An archived task with id "test-task" already exists/
    );
  }
);

  test('Archive a task', async () => {
  const BASE_PATH = await kanbn.getMainFolder();

  await kanbn.archiveTask('task-1');
  context.archiveFolderExists(assert, BASE_PATH);
  context.archivedTaskFileExists(assert, BASE_PATH, 'task-1');
  context.taskFileExists(assert, BASE_PATH, 'task-1', false);
});

});\