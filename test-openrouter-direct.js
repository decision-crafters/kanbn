/**
 * Direct test of OpenRouter API
 * This script directly calls the OpenRouter API without going through the Kanbn CLI
 */

const fetch = require('node-fetch');

// API key from command line argument or environment variable
const apiKey = process.argv[2] || process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  console.error('Error: No API key provided');
  console.error('Usage: node test-openrouter-direct.js <api-key>');
  process.exit(1);
}

console.log(`Using API key: ${apiKey.substring(0, 5)}... (${apiKey.length} chars)`);

// Make a simple request to the OpenRouter API
async function testOpenRouterAPI() {
  try {
    console.log('Making request to OpenRouter API...');
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/decision-crafters/kanbn',
        'X-Title': 'Kanbn Project Assistant'
      },
      body: JSON.stringify({
        model: 'google/gemma-3-4b-it:free',
        messages: [{ role: 'user', content: 'Hello, this is a test' }]
      })
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter API error: ${response.status} ${errorText}`);
      return;
    }
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.choices && data.choices.length > 0) {
      console.log('Message content:', data.choices[0].message.content);
    }
    
    console.log('API call successful!');
  } catch (error) {
    console.error('Error calling OpenRouter API:', error);
  }
}

// Run the test
testOpenRouterAPI();
