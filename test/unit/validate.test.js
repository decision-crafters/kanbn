const fs = require('fs');
const path = require('path');
const realFs = require('../real-fs-fixtures');
const kanbnFactory = require('../../src/main');

if (!fs.existsSync(path.join(__dirname, '../real-fs-fixtures'))) {
  fs.mkdirSync(path.join(__dirname, '../real-fs-fixtures'), { recursive: true });
}

// Converted from QUnit to Jest to address Issue #201

describe('validate tests', () => {
  beforeEach(() => {
    const timestamp = Date.now();
    const fixtures = realFs.createFixtures(`validate-test-${timestamp}`, {
      countColumns: 1,
      countTasks: 3
    });
    global.testDir = fixtures.testDir;

    global.originalCwd = process.cwd();
    process.chdir(global.testDir);

    global.kanbn = kanbnFactory();
  });

  afterEach(() => {
    process.chdir(global.originalCwd);
    realFs.cleanupFixtures(global.testDir);
  });

test('Validate uninitialised folder should throw "not initialised" error', async () => {
  const emptyDir = path.join(global.testDir, 'empty');
  fs.mkdirSync(emptyDir);
  process.chdir(emptyDir);

  const emptyKanbn = kanbnFactory();

  await expect(emptyKanbn.validate()).rejects.toThrow(/Not initialised in this folder/);

  process.chdir(global.testDir);
});

test('Validate valid index and tasks should return true', async () => {
  // Validate with re-save, then validate again
  const result1 = await global.kanbn.validate(true);
  expect(result1).toEqual([]);

  const result2 = await global.kanbn.validate();
  expect(result2).toEqual([]);
});

test(
  'Validate with problems in index should return single-element array containing index error',
  async () => {
    const brokenDir = path.join(global.testDir, 'broken-index');
    fs.mkdirSync(path.join(brokenDir, '.kanbn', 'tasks'), { recursive: true });
    
    await fs.promises.writeFile(
      path.join(brokenDir, '.kanbn', 'index.md'),
      '# Test Project\n\n## Column 1\n\n'
    );
    
    const originalDir = process.cwd();
    process.chdir(brokenDir);

    const brokenKanbn = kanbnFactory();
    
    // Now corrupt the index file
    await fs.promises.writeFile(
      path.join(brokenDir, '.kanbn', 'index.md'),
      '#'  // Invalid index - missing name
    );
    
    // Validate should return an array with the error
    const result = await brokenKanbn.validate();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].task).toBe(null);
    expect(result[0].errors.includes('Unable to parse index')).toBe(true);
    
    process.chdir(originalDir);
  }
);

test('Validate with problems in task files should return array of task errors', async () => {
  const index = await global.kanbn.getIndex();
  const taskIds = Object.values(index.columns).flat();
  expect(taskIds.length >= 3).toBe(true);
  
  // Re-write invalid task files
  await fs.promises.writeFile(
    path.join(global.testDir, '.kanbn', 'tasks', `${taskIds[0]}.md`),
    ''
  );
  await fs.promises.writeFile(
    path.join(global.testDir, '.kanbn', 'tasks', `${taskIds[1]}.md`),
    'test'
  );
  await fs.promises.writeFile(
    path.join(global.testDir, '.kanbn', 'tasks', `${taskIds[2]}.md`),
    '# Name\n\n## Metadata\n\ntest'
  );

  // Validate
  const results = await global.kanbn.validate();
  expect(Array.isArray(results)).toBe(true);
  expect(results.length).toBe(3);
  
  const sortedResults = results.sort((a, b) => a.task.localeCompare(b.task));

  expect(sortedResults[0].errors).toBe('Unable to parse task: data is null or empty');
  expect(sortedResults[1].errors).toBe('Unable to parse task: data is missing a name heading');
  expect(sortedResults[2].errors).toBe('Unable to parse task: invalid metadata content');
});
});
