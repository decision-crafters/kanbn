const mockRequire = require('mock-require');
const IntegrationTestUtils = require('../utils/integration-test-utils');
const { config: mockConfig, kanbn: mockKanbn } = require('../mock-kanbn');

describe('Archive Task Controller Integration Tests', () => {
  let kanbn;

  beforeAll(() => {
    const mockKanbnModule = require('../mock-kanbn');
    mockRequire('../../src/main', mockKanbnModule);
    kanbn = require('../../index');
  });

  beforeEach(() => {
    mockConfig.initialised = false;
    mockConfig.output = null;
  });

  test('should handle archive task in uninitialised folder', async () => {
    const output = await IntegrationTestUtils.runCliCommand(['archive'], kanbn);
    expect(output).toMatch(/Kanbn has not been initialised in this folder/);
  });

  test('should list archived tasks', async () => {
    mockConfig.initialised = true;
    mockConfig.archivedTasks = [
      'task-1',
      'task-2',
      'task-3'
    ];
    const output = await IntegrationTestUtils.runCliCommand(['archive', '-l'], kanbn);
    expect(output).toMatch(/task-1/);
    expect(output).toMatch(/task-2/);
    expect(output).toMatch(/task-3/);
  });

  test('should handle archive with no task specified', async () => {
    mockConfig.initialised = true;
    const output = await IntegrationTestUtils.runCliCommand(['archive'], kanbn);
    expect(output).toMatch(/No task id specified/);
  });

  test('should handle archive of non-existent task', async () => {
    mockConfig.initialised = true;
    const output = await IntegrationTestUtils.runCliCommand(['archive', 'task-1'], kanbn);
    expect(output).toMatch(/No task file found with id "task-1"/);
  });

  test('should successfully archive a task', async () => {
    mockConfig.initialised = true;
    mockConfig.taskExists = true;
    const output = await IntegrationTestUtils.runCliCommand(['archive', 'task-1'], kanbn);
    expect(output).toMatch(/Archived task "task-1"/);
    expect(mockConfig.output).toEqual({
      taskId: 'task-1'
    });
  });
});
