/**
 * Test of chat controller
 * This script tests the chat controller directly
 */

// Set environment variables
process.env.DEBUG = 'true';
process.env.OPENROUTER_STREAM = 'false'; // Disable streaming for simpler testing

// Import required modules
const chatController = require('./src/controller/chat');
const kanbnModule = require('./src/main');
const fs = require('fs');
const path = require('path');

// API key from command line argument
const apiKey = process.argv[2];

if (!apiKey) {
  console.error('Error: No API key provided');
  console.error('Usage: node test-chat-controller.js <api-key>');
  process.exit(1);
}

console.log(`Using API key: ${apiKey.substring(0, 5)}... (${apiKey.length} chars)`);

// Test the chat controller
async function testChatController() {
  try {
    // Create a test directory
    const testDir = path.join(__dirname, 'test-kanbn-dir');
    console.log(`Creating test directory: ${testDir}`);

    // Create the directory if it doesn't exist
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Change to the test directory
    process.chdir(testDir);
    console.log(`Changed to directory: ${process.cwd()}`);

    // Initialize a Kanbn board
    console.log('Initializing Kanbn board...');
    const kanbn = kanbnModule();
    await kanbn.initialise({
      name: 'Test Project',
      description: 'A test project for the chat controller',
      columns: ['Backlog', 'Todo', 'In Progress', 'Done']
    });

    // Add a test task
    console.log('Adding a test task...');
    try {
      await kanbn.createTask({
        name: 'Test Task',
        description: 'A test task',
        metadata: {
          created: new Date(),
          tags: ['test']
        }
      }, 'Backlog');
    } catch (error) {
      // If the task already exists, that's fine
      if (!error.message.includes('already exists')) {
        throw error;
      }
      console.log('Task already exists, continuing...');
    }

    console.log('Calling chat controller...');

    // Create args object similar to what minimist would create
    const args = {
      'message': 'Hello, this is a test of the chat controller.',
      'api-key': apiKey,
      'model': 'google/gemma-3-4b-it:free'
    };

    // Call the chat controller
    const response = await chatController(args);

    console.log('Chat controller response:', response);
    console.log('Test completed!');
  } catch (error) {
    console.error('Error testing chat controller:', error);
  }
}

// Run the test
testChatController();
