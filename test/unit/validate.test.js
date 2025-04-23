const fs = require('fs');
const path = require('path');
const realFs = require('../real-fs-fixtures');
const kanbnFactory = require('../../src/main');

if (!fs.existsSync(path.join(__dirname, '../real-fs-fixtures'))) {
  fs.mkdirSync(path.join(__dirname, '../real-fs-fixtures'), { recursive: true });
}

QUnit.module('validate tests', {
  before() {
    require('../qunit-throws-async');
  },
  beforeEach() {
    const timestamp = Date.now();
    this.testDir = realFs.createFixtures(`validate-test-${timestamp}`, {
      countColumns: 1,
      countTasks: 3
    }).testDir;
    
    this.originalCwd = process.cwd();
    process.chdir(this.testDir);
    
    this.kanbn = kanbnFactory();
  },
  afterEach() {
    process.chdir(this.originalCwd);
    realFs.cleanupFixtures(this.testDir);
  }
});

QUnit.test('Validate uninitialised folder should throw "not initialised" error', async function(assert) {
  const emptyDir = path.join(this.testDir, 'empty');
  fs.mkdirSync(emptyDir);
  process.chdir(emptyDir);
  
  const emptyKanbn = kanbnFactory();
  
  await assert.throwsAsync(
    async () => {
      await emptyKanbn.validate();
    },
    /Not initialised in this folder/
  );
  
  process.chdir(this.testDir);
});

QUnit.test('Validate valid index and tasks should return true', async function(assert) {
  // Validate with re-save, then validate again
  const result1 = await this.kanbn.validate(true);
  assert.deepEqual(result1, [], "validate(true) should return empty array when no errors");
  
  const result2 = await this.kanbn.validate();
  assert.deepEqual(result2, [], "validate() should return empty array when no errors");
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

QUnit.test('Validate with problems in task files should return array of task errors', async function(assert) {
  const index = await this.kanbn.getIndex();
  const taskIds = Object.values(index.columns).flat();
  assert.ok(taskIds.length >= 3, "Should have at least 3 tasks");
  
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
  assert.ok(Array.isArray(results), "Results should be an array");
  assert.equal(results.length, 3, "Should have 3 validation errors");
  
  const sortedResults = results.sort((a, b) => a.task.localeCompare(b.task));
  
  assert.equal(sortedResults[0].errors, 'Unable to parse task: data is null or empty');
  assert.equal(sortedResults[1].errors, 'Unable to parse task: data is missing a name heading');
  assert.equal(sortedResults[2].errors, 'Unable to parse task: invalid metadata content');
});
