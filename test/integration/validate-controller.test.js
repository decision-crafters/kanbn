const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const assert = require('assert');
const rimraf = require('rimraf');

// Path to the kanbn binary
const KANBN_BIN = path.join(__dirname, '../../bin/kanbn');

// Test directory
const TEST_DIR = path.join(__dirname, 'validate-controller-test');

// Setup and teardown functions
function setup() {
  // Create test directory if it doesn't exist
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }

  // Change to test directory
  process.chdir(TEST_DIR);

  // Initialize kanbn
  execSync(`${KANBN_BIN} init --name "Validate Test" --description "Testing validate controller"`, { stdio: 'ignore' });

  // Add a valid task
  execSync(`${KANBN_BIN} add --name "Valid Task" --description "This is a valid task" --column "Todo"`, { stdio: 'ignore' });
}

function teardown() {
  // Change back to the original directory
  process.chdir(__dirname);

  // Remove test directory
  rimraf.sync(TEST_DIR);
}

// Test that validate succeeds with valid files
describe('validate controller with valid files', function() {
  before(setup);
  after(teardown);

  it('should exit with code 0 when all files are valid', function(done) {
    exec(`${KANBN_BIN} validate`, (error, stdout, stderr) => {
      assert.strictEqual(error, null, 'Expected no error');
      assert.match(stdout, /Everything OK/, 'Expected "Everything OK" in output');
      done();
    });
  });

  it('should exit with code 0 when using --save flag', function(done) {
    exec(`${KANBN_BIN} validate --save`, (error, stdout, stderr) => {
      assert.strictEqual(error, null, 'Expected no error');
      assert.match(stdout, /Everything OK/, 'Expected "Everything OK" in output');
      done();
    });
  });
});

// Test that validate fails with invalid files
describe('validate controller with invalid files', function() {
  before(function() {
    setup();

    // Create an invalid task file
    const taskPath = path.join(TEST_DIR, '.kanbn', 'tasks', 'invalid-task.md');
    fs.writeFileSync(taskPath, 'This is an invalid task file with no proper structure');

    // Add the invalid task to the index
    const indexPath = path.join(TEST_DIR, '.kanbn', 'index.md');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const updatedIndexContent = indexContent.replace(
      '# Todo\n\n- valid-task',
      '# Todo\n\n- valid-task\n- invalid-task'
    );
    fs.writeFileSync(indexPath, updatedIndexContent);
  });

  after(teardown);

  it('should exit with code 1 when there are invalid files', function(done) {
    exec(`${KANBN_BIN} validate`, (error, stdout, stderr) => {
      assert.notStrictEqual(error, null, 'Expected an error');
      assert.strictEqual(error.code, 1, 'Expected exit code 1');
      assert.match(stderr, /errors found in task files/, 'Expected error message about task files');
      done();
    });
  });

  it('should list the specific errors in the output', function(done) {
    exec(`${KANBN_BIN} validate`, (error, stdout, stderr) => {
      assert.match(stderr, /invalid-task/, 'Expected error to mention the invalid task');
      assert.match(stderr, /Unable to parse task/, 'Expected error about parsing the task');
      done();
    });
  });

  it('should output JSON format when --json flag is used', function(done) {
    exec(`${KANBN_BIN} validate --json`, (error, stdout, stderr) => {
      assert.notStrictEqual(error, null, 'Expected an error');
      assert.strictEqual(error.code, 1, 'Expected exit code 1');

      // Verify JSON output
      try {
        const jsonOutput = JSON.parse(stderr.substring(stderr.indexOf('[')));
        assert.strictEqual(Array.isArray(jsonOutput), true, 'Expected JSON array in output');
        assert.strictEqual(jsonOutput.length > 0, true, 'Expected at least one error in JSON output');
        assert.strictEqual(jsonOutput[0].task, 'invalid-task', 'Expected error for invalid-task');
      } catch (e) {
        assert.fail(`Failed to parse JSON output: ${e.message}`);
      }

      done();
    });
  });
});

// Test that validate handles non-initialized directories properly
describe('validate controller with non-initialized directory', function() {
  before(function() {
    // Create an empty test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }

    // Change to test directory
    process.chdir(TEST_DIR);
  });

  after(teardown);

  it('should exit with an error when directory is not initialized', function(done) {
    exec(`${KANBN_BIN} validate`, (error, stdout, stderr) => {
      assert.notStrictEqual(error, null, 'Expected an error');
      assert.match(stderr, /not been initialised/, 'Expected error about not being initialized');
      done();
    });
  });
});
