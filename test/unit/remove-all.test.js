const mockFileSystem = require('mock-fs');
const Kanbn = require('../../src/main');
const context = require('../context');

describe('removeAll tests', () => {
  let kanbn;
  
  beforeEach(() => {
    mockFileSystem();
    kanbn = Kanbn();
  });
  
  afterEach(() => {
    mockFileSystem.restore();
  });

  test('Remove all should remove all kanbn files and folders', async () => {
    await kanbn.initialise();
    const BASE_PATH = await kanbn.getMainFolder();

    // Kanbn should be initialised
    expect(await kanbn.initialised()).toBe(true);

    // Remove everything
    await kanbn.removeAll();

    // Kanbn should not be initialised
    expect(await kanbn.initialised()).toBe(false);

    // Verify that the index and folders have been removed
    const indexExists = context.indexExists({ ok: expect }, BASE_PATH, false);
    const kanbnFolderExists = context.kanbnFolderExists({ ok: expect }, BASE_PATH, false);
    const tasksFolderExists = context.tasksFolderExists({ ok: expect }, BASE_PATH, false);
    
    expect(indexExists).toBeTruthy();
    expect(kanbnFolderExists).toBeTruthy();
    expect(tasksFolderExists).toBeTruthy();
  });
});
