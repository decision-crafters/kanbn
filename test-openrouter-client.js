/**
 * Test of OpenRouterClient class
 * This script tests the OpenRouterClient class directly
 */

// Set environment variables
process.env.DEBUG = 'true';
process.env.OPENROUTER_STREAM = 'false'; // Disable streaming for simpler testing

// Import the OpenRouterClient class
const OpenRouterClient = require('./src/lib/openrouter-client');

// API key from command line argument or environment variable
const apiKey = process.argv[2] || process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  console.error('Error: No API key provided');
  console.error('Usage: node test-openrouter-client.js <api-key>');
  process.exit(1);
}

console.log(`Using API key: ${apiKey.substring(0, 5)}... (${apiKey.length} chars)`);

// Test the OpenRouterClient class
async function testOpenRouterClient() {
  try {
    console.log('Creating OpenRouterClient instance...');
    const client = new OpenRouterClient(apiKey);

    console.log('Sending chat completion request...');
    const messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello, this is a test of the OpenRouterClient class.' }
    ];

    // Call the chatCompletion method without streaming
    const response = await client.chatCompletion(messages);

    console.log('\n\nFull response:', response);
    console.log('API call successful!');
  } catch (error) {
    console.error('Error testing OpenRouterClient:', error);
  }
}

// Run the test
testOpenRouterClient();
