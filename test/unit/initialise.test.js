const fs = require('fs');
const path = require('path');
const realFs = require('../real-fs-fixtures');
const Kanbn = require('../../src/main');
const context = require('../context');

describe('initialise tests', () => {
  let testDir;
  let originalCwd;
  let kanbn;

  beforeEach(() => {
    testDir = realFs.createTestDirectory('initialise-test');
    originalCwd = process.cwd();
    process.chdir(testDir);
    kanbn = Kanbn();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    realFs.cleanupFixtures(testDir);
  });

  test('Initialise with default settings should create folders and index', async () => {
    const BASE_PATH = await kanbn.getMainFolder();

    // Kanbn shouldn't be currently initialised in our test directory
    expect(await kanbn.initialised()).toBe(false);

    // Initialise kanbn and check that the main folder, index, and tasks folder exists
    await kanbn.initialise();
    
    const kanbnFolderExists = context.kanbnFolderExists({ ok: expect }, BASE_PATH);
    const indexExists = context.indexExists({ ok: expect }, BASE_PATH);
    const tasksFolderExists = context.tasksFolderExists({ ok: expect }, BASE_PATH);
    
    expect(kanbnFolderExists).toBeTruthy();
    expect(indexExists).toBeTruthy();
    expect(tasksFolderExists).toBeTruthy();

    // Kanbn should now be initialised
    expect(await kanbn.initialised()).toBe(true);

    // Check for default name & columns
    const nameCheck = context.indexHasName({ ok: expect }, BASE_PATH, 'Kanbn Board');
    const columnsCheck = context.indexHasColumns({ ok: expect }, BASE_PATH, ['Backlog', 'In Progress', 'Completed']);
    
    expect(nameCheck).toBeTruthy();
    expect(columnsCheck).toBeTruthy();
  });

  test('Initialise with custom settings should create folders and index with custom settings', async () => {
    const BASE_PATH = await kanbn.getMainFolder();

    // Kanbn shouldn't be currently initialised in our test directory
    expect(await kanbn.initialised()).toBe(false);

    // Initialise kanbn and check that the main folder, index, and tasks folder exists
    const CUSTOM_NAME = 'Custom Project Name';
    const CUSTOM_DESCRIPTION = 'Custom project description...';
    const CUSTOM_COLUMNS = [
      'Column 1',
      'Column 2',
      'Column 3'
    ];
    
    await kanbn.initialise({
      name: CUSTOM_NAME,
      description: CUSTOM_DESCRIPTION,
      columns: CUSTOM_COLUMNS
    });
    
    const kanbnFolderExists = context.kanbnFolderExists({ ok: expect }, BASE_PATH);
    const indexExists = context.indexExists({ ok: expect }, BASE_PATH);
    const tasksFolderExists = context.tasksFolderExists({ ok: expect }, BASE_PATH);
    
    expect(kanbnFolderExists).toBeTruthy();
    expect(indexExists).toBeTruthy();
    expect(tasksFolderExists).toBeTruthy();

    // Kanbn should now be initialised
    expect(await kanbn.initialised()).toBe(true);

    // Check for custom name, description & columns
    const nameCheck = context.indexHasName({ ok: expect }, BASE_PATH, CUSTOM_NAME);
    const descriptionCheck = context.indexHasDescription({ ok: expect }, BASE_PATH, CUSTOM_DESCRIPTION);
    const columnsCheck = context.indexHasColumns({ ok: expect }, BASE_PATH, CUSTOM_COLUMNS);
    
    expect(nameCheck).toBeTruthy();
    expect(descriptionCheck).toBeTruthy();
    expect(columnsCheck).toBeTruthy();
  });

  test('Reinitialise with additional settings should add settings to index', async () => {
    const BASE_PATH = await kanbn.getMainFolder();

    // Kanbn shouldn't be currently initialised in our test directory
    expect(await kanbn.initialised()).toBe(false);

    // Initialise kanbn and check that the main folder, index, and tasks folder exists
    await kanbn.initialise();
    
    const kanbnFolderExists = context.kanbnFolderExists({ ok: expect }, BASE_PATH);
    const indexExists = context.indexExists({ ok: expect }, BASE_PATH);
    const tasksFolderExists = context.tasksFolderExists({ ok: expect }, BASE_PATH);
    
    expect(kanbnFolderExists).toBeTruthy();
    expect(indexExists).toBeTruthy();
    expect(tasksFolderExists).toBeTruthy();

    // Kanbn should now be initialised
    expect(await kanbn.initialised()).toBe(true);

    // Reinitialise kanbn with additional settings
    const CUSTOM_NAME = 'Custom Project Name';
    const CUSTOM_DESCRIPTION = 'Custom project description...';
    const CUSTOM_COLUMNS = [
      'Column 1',
      'Column 2',
      'Column 3'
    ];
    
    await kanbn.initialise({
      name: CUSTOM_NAME,
      description: CUSTOM_DESCRIPTION,
      columns: CUSTOM_COLUMNS
    });

    // Kanbn should still be initialised
    expect(await kanbn.initialised()).toBe(true);

    // Check for custom name, description & columns
    const nameCheck = context.indexHasName({ ok: expect }, BASE_PATH, CUSTOM_NAME);
    const descriptionCheck = context.indexHasDescription({ ok: expect }, BASE_PATH, CUSTOM_DESCRIPTION);
    const columnsCheck = context.indexHasColumns({ ok: expect }, BASE_PATH, [
      'Backlog',
      'In Progress',
      'Completed',
      ...CUSTOM_COLUMNS
    ]);
    
    expect(nameCheck).toBeTruthy();
    expect(descriptionCheck).toBeTruthy();
    expect(columnsCheck).toBeTruthy();
  });
});
