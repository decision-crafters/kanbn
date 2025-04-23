const QUnit = require('qunit');
const mockRequire = require('mock-require');
const eventBus = require('../../src/lib/event-bus');
const ChatHandler = require('../../src/lib/chat-handler');
const ChatContext = require('../../src/lib/chat-context');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Create a real temporary directory for testing
function createTempKanbnProject() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kanbn-event-test-'));
  const kanbnDir = path.join(tempDir, '.kanbn');
  const tasksDir = path.join(kanbnDir, 'tasks');

  // Create the directory structure
  fs.mkdirSync(kanbnDir);
  fs.mkdirSync(tasksDir);

  // Create a basic index file
  const indexContent = `---
name: Test Project
description: A test project for event integration testing
columns:
  Backlog: []
  "In Progress": []
  Done: []
---`;

  fs.writeFileSync(path.join(kanbnDir, 'index.md'), indexContent);

  return tempDir;
}

// Set a longer timeout for integration tests
QUnit.config.testTimeout = 10000;

QUnit.module('Chat Event Integration Tests', {
  before: function() {
    // Create a temporary Kanbn project
    this.tempDir = createTempKanbnProject();

    // Save the original working directory
    this.originalCwd = process.cwd();

    // Change to the temporary directory
    process.chdir(this.tempDir);

    // Set environment variables for testing
    process.env.KANBN_ENV = 'test';

    // Import the modules after setting up the environment
    this.kanbnModule = require('../../src/main');
    this.chatController = require('../../src/controller/chat');
  },
  beforeEach: function() {
    // Reset event listeners before each test
    eventBus.removeAllListeners();

    // Reset global chat history
    global.chatHistory = [];
  },
  afterEach: function() {
    // Clean up event listeners after each test
    eventBus.removeAllListeners();
  },
  after: function() {
    // Restore the original working directory
    process.chdir(this.originalCwd);

    // Clean up the temporary directory
    try {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up temp directory:', error);
    }

    // Clean up environment
    delete process.env.KANBN_ENV;
  }
});

QUnit.test('Creating a task via chat should emit events and create a file', async function(assert) {
  const done = assert.async();
  const events = [];

  // Set up event listeners
  eventBus.on('taskCreated', (data) => {
    events.push({ type: 'taskCreated', data });
  });

  eventBus.on('contextUpdated', (data) => {
    events.push({ type: 'contextUpdated', data });
  });

  // Create a chat handler with a real Kanbn instance
  const kanbn = this.kanbnModule();
  const chatHandler = new ChatHandler(kanbn);

  // Simulate creating a task through the chat handler
  await chatHandler.handleMessage('create task Test Event Task');

  // Wait a short time for all events to be processed
  setTimeout(async () => {
    // Check that events were emitted
    assert.equal(events.length, 2, 'Two events were emitted');
    assert.equal(events[0].type, 'taskCreated', 'First event was taskCreated');
    assert.equal(events[1].type, 'contextUpdated', 'Second event was contextUpdated');

    // Check that the task was actually created in the file system
    const taskId = events[0].data.taskId;
    const taskPath = path.join(this.tempDir, '.kanbn', 'tasks', `${taskId}.md`);

    assert.true(fs.existsSync(taskPath), 'Task file was created');

    // Check that the task was added to the index
    const index = await kanbn.getIndex();
    assert.true(index.columns.Backlog.includes(taskId), 'Task was added to the Backlog column');

    done();
  }, 100);
});

QUnit.test('Moving a task via chat should emit events and update the index', async function(assert) {
  const done = assert.async();
  const events = [];

  // Set up event listeners
  eventBus.on('taskCreated', (data) => {
    events.push({ type: 'taskCreated', data });
  });

  eventBus.on('contextUpdated', (data) => {
    events.push({ type: 'contextUpdated', data });
  });

  // Create a chat handler with a real Kanbn instance
  const kanbn = this.kanbnModule();
  const chatHandler = new ChatHandler(kanbn);

  // First create a task
  const createResult = await chatHandler.handleMessage('create task Task To Move');
  assert.ok(createResult.includes('Created task'), 'Task was created');

  // Get the task ID from the events
  const taskId = events[0].data.taskId;

  // Reset events array
  events.length = 0;

  // Now move the task
  const moveResult = await chatHandler.handleMessage(`move Task To Move to In Progress`);
  assert.ok(moveResult.includes('Moved task'), 'Task was moved');

  // Wait a short time for all events to be processed
  setTimeout(async () => {
    // Check that the task was moved in the index
    const index = await kanbn.getIndex();
    assert.false(index.columns.Backlog.includes(taskId), 'Task was removed from Backlog');
    assert.true(index.columns['In Progress'].includes(taskId), 'Task was added to In Progress');

    done();
  }, 100);
});

QUnit.test('Chat controller should handle the full event flow', async function(assert) {
  const done = assert.async();
  const events = [];

  // Set up event listeners
  eventBus.on('contextQueried', () => {
    events.push('contextQueried');
  });

  eventBus.on('taskCreated', () => {
    events.push('taskCreated');
  });

  eventBus.on('contextUpdated', () => {
    events.push('contextUpdated');
  });

  // Call the chat controller with a message
  await this.chatController({
    message: 'This is a test message'
  });

  // Wait a short time for all events to be processed
  setTimeout(() => {
    // Check that all expected events were emitted
    assert.deepEqual(
      events,
      ['contextQueried', 'taskCreated', 'contextUpdated'],
      'All expected events were emitted in the correct order'
    );

    done();
  }, 100);
});
