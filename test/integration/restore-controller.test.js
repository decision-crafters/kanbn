const mockRequire = require('mock-require');
const mockArgv = require('mock-argv');
const captureConsole = require('capture-console');
const { config: mockConfig } = require('../mock-kanbn');

let kanbn;

describe('restore controller tests', () => {
  beforeAll(() => {
    require('../qunit-contains');
    const mockKanbnModule = require('../mock-kanbn');
    mockRequire('../../src/main', mockKanbnModule);
    kanbn = require('../../index');
  });
  
  beforeEach(() => {
    mockConfig.initialised = false;
    mockConfig.output = null;
  });

  test('Restore task in uninitialised folder', async () => {
    const output = [];
    captureConsole.startIntercept(process.stderr, s => {
      output.push(s);
    });

    await mockArgv(['restore'], kanbn);

    captureConsole.stopIntercept(process.stderr);
    expect(output.some(s => /Kanbn has not been initialised in this folder/.test(s))).toBe(true);
  });

  test('Restore a task with no task specified', async () => {
    const output = [];
    captureConsole.startIntercept(process.stderr, s => {
      output.push(s);
    });

    mockConfig.initialised = true;
    await mockArgv(['restore'], kanbn);

    captureConsole.stopIntercept(process.stderr);
    expect(output.some(s => /No task id specified/.test(s))).toBe(true);
  });

  test('Restore a task with no columns defined in the index', async () => {
    const output = [];
    captureConsole.startIntercept(process.stderr, s => {
      output.push(s);
    });

    const backupIndex = mockConfig.index;
    mockConfig.index = {
      name: 'Test Project',
      description: 'Test description',
      columns: [],
      options: {}
    };
    mockConfig.initialised = true;
    await mockArgv(['restore', 'task-1'], kanbn);
    mockConfig.index = backupIndex;

    captureConsole.stopIntercept(process.stderr);
    expect(output.some(s => /No columns defined in the index/.test(s))).toBe(true);
  });

  test("Restore a task into a column that doesn't exist", async () => {
    const output = [];
    captureConsole.startIntercept(process.stderr, s => {
      output.push(s);
    });

    mockConfig.initialised = true;
    await mockArgv(['restore', 'task-1', '-c', 'Test Column 2'], kanbn);

    captureConsole.stopIntercept(process.stderr);
    expect(output.some(s => /Column "Test Column 2" doesn't exist/.test(s))).toBe(true);
  });

  test('Restore a task', async () => {
    const output = [];
    captureConsole.startIntercept(process.stdout, s => {
      output.push(s);
    });

    mockConfig.initialised = true;
    await mockArgv(['restore', 'task-1'], kanbn);

    captureConsole.stopIntercept(process.stdout);
    expect(output.some(s => /Restored task "task-1" from the archive/.test(s))).toBe(true);
    expect(mockConfig.output).toEqual({
      taskId: 'task-1',
      columnName: null
    });
  });

  test('Restore a task into a custom column', async () => {
    const output = [];
    captureConsole.startIntercept(process.stdout, s => {
      output.push(s);
    });

    mockConfig.initialised = true;
    await mockArgv(['restore', 'task-1', '-c', 'Test Column'], kanbn);

    captureConsole.stopIntercept(process.stdout);
    expect(output.some(s => /Restored task "task-1" from the archive/.test(s))).toBe(true);
    expect(mockConfig.output).toEqual({
      taskId: 'task-1',
      columnName: 'Test Column'
    });
  });
});
