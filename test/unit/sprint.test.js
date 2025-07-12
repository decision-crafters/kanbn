const mockFileSystem = require('mock-fs');
const kanbn = require('../../src/main');
const context = require('../context-jest');

describe('sprint tests', () => {
  beforeEach(() => {
    mockFileSystem();
  });

  afterEach(() => {
    mockFileSystem.restore();
  });

  test('Start a sprint in uninitialised folder should throw "not initialised" error', async () => {
    await expect(
      kanbn.sprint('Sprint 1', '', new Date())
    ).rejects.toThrow(/Not initialised in this folder/);
  });

  test('Start a sprint should create a new sprint', async () => {
    const SPRINT_NAME = 'Test Sprint';
    const SPRINT_DESCRIPTION = 'Test description...';
    const SPRINT_DATE = new Date();
    await kanbn.initialise();

    // Start a sprint
    await kanbn.sprint(SPRINT_NAME, SPRINT_DESCRIPTION, SPRINT_DATE);

    // Verify that the sprint exists
    context.indexHasOptions(await kanbn.getMainFolder(), {
      sprints: [
        {
          name: SPRINT_NAME,
          description: SPRINT_DESCRIPTION,
          start: SPRINT_DATE
        }
      ]
    });
  });

  test('Start a sprint with auto-generated name', async () => {
    const BASE_PATH = await kanbn.getMainFolder();
    const SPRINT_DATE = new Date();
    await kanbn.initialise();

    // Start a sprint without a name or description
    await kanbn.sprint('', '', SPRINT_DATE);

    // Verify that the sprint exists
    context.indexHasOptions(BASE_PATH, {
      sprints: [
        {
          name: 'Sprint 1',
          start: SPRINT_DATE
        }
      ]
    });

    // Start another sprint
    await kanbn.sprint('', '', SPRINT_DATE);

    // Verify that the new sprint exists
    context.indexHasOptions(BASE_PATH, {
      sprints: [
        {
          name: 'Sprint 1',
          start: SPRINT_DATE
        },
        {
          name: 'Sprint 2',
          start: SPRINT_DATE
        }
      ]
    });
  });
});
