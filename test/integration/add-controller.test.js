const IntegrationTestUtils = require('../integration-utils');
const {
  config: mockConfig,
  kanbn: mockKanbn
} = require('../mock-kanbn');

describe('Add Task Controller Integration Tests', () => {
  let kanbn;

  beforeAll(() => {
    jest.mock('../../src/main', () => require('../mock-kanbn'));
    kanbn = require('../../index');
  });

  beforeEach(() => {
    mockConfig.initialised = true;
    mockConfig.output = null;
  });

  test('should handle add task without initialising kanbn', async () => {
    mockConfig.initialised = false;
    const output = await IntegrationTestUtils.runCliCommand(['add'], kanbn);
    expect(output).toMatch(/Kanbn has not been initialised in this folder/);
  });

  test('should handle add task with no columns defined', async () => {
    const backupColumns = mockConfig.index.columns;
    mockConfig.index.columns = {};
    
    // Capture both stdout and stderr
    const output = [];
    const captureConsole = require('capture-console');
    captureConsole.startIntercept(process.stdout, s => output.push(s));
    captureConsole.startIntercept(process.stderr, s => output.push(s));
    
    // TODO: Replace mock-argv with a Jest-compatible CLI testing approach
    // For now, we simulate the call directly
    await kanbn.cli(['', '', 'add', '-n', 'Test Task']);
    console.log('mockArgv call completed');
    
    captureConsole.stopIntercept(process.stdout);
    captureConsole.stopIntercept(process.stderr);
    const finalOutput = output.join('');
    console.log('Full output:', JSON.stringify(finalOutput));
    console.log('Output length:', finalOutput.length);
    console.log('Contains "No columns defined":', finalOutput.includes('No columns defined'));
    console.log('Contains "Error:":', finalOutput.includes('Error:'));
    console.log('Contains "Task name cannot be blank":', finalOutput.includes('Task name cannot be blank'));
    
    mockConfig.index.columns = backupColumns;
    expect(finalOutput).toMatch(/No columns defined in the index/);
  });

  test('should handle add task to an invalid column', async () => {
    const output = await IntegrationTestUtils.runCliCommand(['add', '-c', 'This column does not exist'], kanbn);
    expect(output).toMatch(/Column ".+" doesn't exist/);
  });

  test('should handle add untracked tasks with no untracked tasks', async () => {
    const output = await IntegrationTestUtils.runCliCommand(['add', '-u'], kanbn);
    expect(output).toMatch(/No untracked tasks to add/);
  });
});
