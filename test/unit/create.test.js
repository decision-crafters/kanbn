const fixtures = require('../fixtures');
const context = require('../jest-helpers');
const kanbnFactory = require('../../src/main');
const path = require('path');

let testDir;
let BASE_PATH;
let TASK_ID;
let fixtureData;
let kanbn;

describe('create', () => {
  beforeEach(() => {
    fixtureData = fixtures({ countTasks: 0 });
    testDir = fixtureData.testPath;
    process.chdir(testDir);
    BASE_PATH = process.cwd();
    TASK_ID = 'task-1';
    // Initialize kanbn with the test directory as root
    kanbn = kanbnFactory(testDir);
  });

  afterEach(() => {
    fixtures.cleanup(testDir);
  });

  test('should create a task successfully', async () => {
    const taskId = await kanbn.createTask({ name: 'Test Task' }, 'Column 1');
    
    context.taskFileExists(BASE_PATH, taskId);
    context.indexHasTask(BASE_PATH, taskId, 'Column 1');
  });

});
