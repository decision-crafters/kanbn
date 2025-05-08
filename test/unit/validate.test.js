const fs = require('fs');
const path = require('path');
const realFs = require('../real-fs-fixtures');
const kanbnFactory = require('../../src/main');

if (!fs.existsSync(path.join(__dirname, '../real-fs-fixtures'))) {
  fs.mkdirSync(path.join(__dirname, '../real-fs-fixtures'), { recursive: true });
}

describe('validate tests', () => {
  beforeAll(() => {
    require('../qunit-throws-async');
  
  });
  beforeEach(() => {
    const timestamp = Date.now();
    this.testDir = realFs.createFixtures(`validate-test-${timestamp
  });
  afterEach(() => {
    process.chdir(this.originalCwd);
    realFs.cleanupFixtures(this.testDir);
  
  });

  test('Validate uninitialised folder should throw ', not initialised" error', async function(assert) {
  const emptyDir = path.join(this.testDir, 'empty');
  fs.mkdirSync(emptyDir);
  process.chdir(emptyDir);
  
  const emptyKanbn = kanbnFactory();
  
  await await expect(async () => {
      await emptyKanbn.validate();
    }).toThrowAsync(/Not initialised in this folder/
  );
  
  process.chdir(this.testDir);
});

  test('Validate valid index and tasks should return true', async function(assert) {
  // Validate with re-save, then validate again
  const result1 = await this.kanbn.validate(true);
  expect(result1).toEqual([]);
  
  const result2 = await this.kanbn.validate();
  expect(result2).toEqual([]);
});

QUnit.test(
  'Validate with problems in index should return single-element array containing index error',
  async function(assert) {
    const brokenDir = path.join(this.testDir, 'broken-index');
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
    
    assert.ok(Array.isArray(result), "Result should be an array");
    assert.equal(result.length, 1, "Result should have one error");
    assert.equal(result[0].task, null, "Error should be for the index (null task)");
    assert.ok(result[0].errors.includes("Unable to parse index"), 
      "Error should mention 'Unable to parse index'");
    
    process.chdir(originalDir);
  }
);

  test('Validate with problems in task files should return array of task errors', async function(assert) {
  const index = await this.kanbn.getIndex();
  const taskIds = Object.values(index.columns).flat();
  expect(taskIds.length >= 3).toBeTruthy();
  
  // Re-write invalid task files
  await fs.promises.writeFile(
    path.join(this.testDir, '.kanbn', 'tasks', `${taskIds[0]}.md`),
    ''
  );
  await fs.promises.writeFile(
    path.join(this.testDir, '.kanbn', 'tasks', `${taskIds[1]}.md`),
    'test'
  );
  await fs.promises.writeFile(
    path.join(this.testDir, '.kanbn', 'tasks', `${taskIds[2]}.md`),
    '# Name\n\n## Metadata\n\ntest'
  );

  // Validate
  const results = await this.kanbn.validate();
  expect(Array.isArray(results).toBeTruthy(), "Results should be an array");
  expect(results.length).toEqual(3);
  
  const sortedResults = results.sort((a, b) => a.task.localeCompare(b.task));
  
  expect(sortedResults[0].errors).toEqual('Unable to parse task: data is null or empty');
  expect(sortedResults[1].errors).toEqual('Unable to parse task: data is missing a name heading');
  expect(sortedResults[2].errors).toEqual('Unable to parse task: invalid metadata content');
});

});\