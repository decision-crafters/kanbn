const fs = require('fs');
const path = require('path');
const realFs = require('../real-fs-fixtures');
const Kanbn = require('../../src/main');
const context = require('../context');

QUnit.module('initialise tests', {
  beforeEach() {
    this.testDir = realFs.createTestDirectory('initialise-test');
    
    this.originalCwd = process.cwd();
    process.chdir(this.testDir);
    
    this.kanbn = Kanbn();
  },
  afterEach() {
    process.chdir(this.originalCwd);
    
    realFs.cleanupFixtures(this.testDir);
  }
});

QUnit.test('Initialise with default settings should create folders and index', async function(assert) {
  const BASE_PATH = await this.kanbn.getMainFolder();

  // Kanbn shouldn't be currently initialised in our test directory
  assert.equal(await this.kanbn.initialised(), false);

  // Initialise kanbn and check that the main folder, index, and tasks folder exists
  await this.kanbn.initialise();
  context.kanbnFolderExists(assert, BASE_PATH);
  context.indexExists(assert, BASE_PATH);
  context.tasksFolderExists(assert, BASE_PATH);

  // Kanbn should now be initialised
  assert.equal(await this.kanbn.initialised(), true);

  // Check for default name & columns
  context.indexHasName(assert, BASE_PATH, 'Kanbn Board');
  context.indexHasColumns(assert, BASE_PATH, ['Backlog', 'In Progress', 'Completed']);
});

QUnit.test('Initialise with custom settings should create folders and index with custom settings', async function(assert) {
  const BASE_PATH = await this.kanbn.getMainFolder();

  // Kanbn shouldn't be currently initialised in our test directory
  assert.equal(await this.kanbn.initialised(), false);

  // Initialise kanbn and check that the main folder, index, and tasks folder exists
  const CUSTOM_NAME = 'Custom Project Name';
  const CUSTOM_DESCRIPTION = 'Custom project description...';
  const CUSTOM_COLUMNS = [
    'Column 1',
    'Column 2',
    'Column 3'
  ];
  await this.kanbn.initialise({
    name: CUSTOM_NAME,
    description: CUSTOM_DESCRIPTION,
    columns: CUSTOM_COLUMNS
  });
  context.kanbnFolderExists(assert, BASE_PATH);
  context.indexExists(assert, BASE_PATH);
  context.tasksFolderExists(assert, BASE_PATH);

  // Kanbn should now be initialised
  assert.equal(await this.kanbn.initialised(), true);

  // Check for custom name, description & columns
  context.indexHasName(assert, BASE_PATH, CUSTOM_NAME);
  context.indexHasDescription(assert, BASE_PATH, CUSTOM_DESCRIPTION);
  context.indexHasColumns(assert, BASE_PATH, CUSTOM_COLUMNS);
});

QUnit.test('Reinitialise with additional settings should add settings to index', async function(assert) {
  const BASE_PATH = await this.kanbn.getMainFolder();

  // Kanbn shouldn't be currently initialised in our test directory
  assert.equal(await this.kanbn.initialised(), false);

  // Initialise kanbn and check that the main folder, index, and tasks folder exists
  await this.kanbn.initialise();
  context.kanbnFolderExists(assert, BASE_PATH);
  context.indexExists(assert, BASE_PATH);
  context.tasksFolderExists(assert, BASE_PATH);

  // Kanbn should now be initialised
  assert.equal(await this.kanbn.initialised(), true);

  // Reinitialise kanbn with additional settings
  const CUSTOM_NAME = 'Custom Project Name';
  const CUSTOM_DESCRIPTION = 'Custom project description...';
  const CUSTOM_COLUMNS = [
    'Column 1',
    'Column 2',
    'Column 3'
  ];
  await this.kanbn.initialise({
    name: CUSTOM_NAME,
    description: CUSTOM_DESCRIPTION,
    columns: CUSTOM_COLUMNS
  });

  // Kanbn should still be initialised
  assert.equal(await this.kanbn.initialised(), true);

  // Check for custom name, description & columns
  context.indexHasName(assert, BASE_PATH, CUSTOM_NAME);
  context.indexHasDescription(assert, BASE_PATH, CUSTOM_DESCRIPTION);
  context.indexHasColumns(assert, BASE_PATH, [
    'Backlog',
    'In Progress',
    'Completed',
    ...CUSTOM_COLUMNS
  ]);
});
