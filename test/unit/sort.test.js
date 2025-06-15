const mockFileSystem = require('mock-fs');
const kanbnFactory = require('../../src/main');
const fixtures = require('../fixtures');
let kanbn;

describe('sort tests', () => {
  let originalCwd;
  let testDir;
  
  beforeEach(() => {
    originalCwd = process.cwd();
    mockFileSystem();
  });
  
  afterEach(() => {
    if (originalCwd) {
      process.chdir(originalCwd);
    }
    mockFileSystem.restore();
  });

  test('Sort in uninitialised folder should throw "not initialised" error', async () => {
    const uninitializedKanbn = kanbnFactory();
    await expect(
      uninitializedKanbn.sort('column', {})
    ).rejects.toThrow(/Not initialised in this folder/);
  });

  test('Sort non-existent column should throw "non-existent column" error', async () => {
    const fixtureData = fixtures({
      countTasks: 0,
      countColumns: 1
    });
    testDir = fixtureData.testPath;
    process.chdir(testDir);
    kanbn = kanbnFactory(testDir);
    
    await expect(
      kanbn.sort('Column 2', {})
    ).rejects.toThrow(/Column "Column 2" doesn't exist/);
  });

  test('Sort on string field', async () => {
    const fixtureData = fixtures({
      noRandom: true,
      tasks: [
        {
          name: 'C task 2'
        },
        {
          name: 'A task 1'
        },
        {
          name: 'B task 3'
        }
      ]
    });
    testDir = fixtureData.testPath;
    process.chdir(testDir);
    kanbn = kanbnFactory(testDir);
    
    await kanbn.sort('Column 1', [{
      field: 'name'
    }]);
    
    const index = await kanbn.getIndex();
    expect(index.columns['Column 1']).toEqual(['a-task-1', 'b-task-3', 'c-task-2']);
  });

  test('Sort on string field and save sorter settings', async () => {
    const fixtureData = fixtures({
      noRandom: true,
      tasks: [
        {
          name: 'C task 2'
        },
        {
          name: 'A task 1'
        },
        {
          name: 'B task 3'
        }
      ]
    });
    testDir = fixtureData.testPath;
    process.chdir(testDir);
    kanbn = kanbnFactory(testDir);
    
    await kanbn.sort('Column 1', [{
      field: 'name'
    }], true);
    
    let index = await kanbn.getIndex();
    expect(index.columns['Column 1']).toEqual(['a-task-1', 'b-task-3', 'c-task-2']);
    
    // Sort using the saved sorter settings
    await kanbn.sort('Column 1');
    index = await kanbn.getIndex();
    expect(index.columns['Column 1']).toEqual(['a-task-1', 'b-task-3', 'c-task-2']);
  });

  test('Sort on numeric field', async () => {
    const fixtureData = fixtures({
      noRandom: true,
      tasks: [
        {
          name: 'Task 1',
          metadata: {
            priority: 3
          }
        },
        {
          name: 'Task 2',
          metadata: {
            priority: 1
          }
        },
        {
          name: 'Task 3',
          metadata: {
            priority: 2
          }
        }
      ]
    });
    testDir = fixtureData.testPath;
    process.chdir(testDir);
    kanbn = kanbnFactory(testDir);
    
    await kanbn.sort('Column 1', [{
      field: 'priority'
    }]);
    
    const index = await kanbn.getIndex();
    expect(index.columns['Column 1']).toEqual(['task-2', 'task-3', 'task-1']);
  });

  test('Sort on date field', async () => {
    const fixtureData = fixtures({
      noRandom: true,
      tasks: [
        {
          name: 'Task 1',
          metadata: {
            created: '2021-01-03'
          }
        },
        {
          name: 'Task 2',
          metadata: {
            created: '2021-01-01'
          }
        },
        {
          name: 'Task 3',
          metadata: {
            created: '2021-01-02'
          }
        }
      ]
    });
    testDir = fixtureData.testPath;
    process.chdir(testDir);
    kanbn = kanbnFactory(testDir);
    
    await kanbn.sort('Column 1', [{
      field: 'created'
    }]);
    
    const index = await kanbn.getIndex();
    expect(index.columns['Column 1']).toEqual(['task-2', 'task-3', 'task-1']);
  });

  test('Sort on custom field', async () => {
    const fixtureData = fixtures({
      noRandom: true,
      tasks: [
        {
          name: 'Task 1',
          metadata: {
            customField: 'zebra'
          }
        },
        {
          name: 'Task 2',
          metadata: {
            customField: 'apple'
          }
        },
        {
          name: 'Task 3',
          metadata: {
            customField: 'banana'
          }
        }
      ]
    });
    testDir = fixtureData.testPath;
    process.chdir(testDir);
    kanbn = kanbnFactory(testDir);
    
    await kanbn.sort('Column 1', [{
      field: 'customField'
    }]);
    
    const index = await kanbn.getIndex();
    expect(index.columns['Column 1']).toEqual(['task-2', 'task-3', 'task-1']);
  });
});
