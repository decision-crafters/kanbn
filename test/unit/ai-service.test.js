const QUnit = require('qunit');
const path = require('path');
const fs = require('fs');
const mockRequire = require('mock-require');

// Set test environment
process.env.KANBN_ENV = 'test';
process.env.OPENROUTER_API_KEY = 'test-api-key';

// Mock axios for API calls
const mockAxios = {
  post: async (url, data) => {
    if (url.includes('openrouter.ai')) {
      return {
        data: {
          choices: [{
            message: {
              content: 'This is a test response from the mock OpenRouter API.'
            }
          }]
        }
      };
    } else if (url.includes('localhost:11434')) {
      return {
        data: {
          message: {
            content: 'This is a test response from the mock Ollama API.'
          }
        }
      };
    }
    throw new Error('Unknown API endpoint');
  },
  get: async (url) => {
    if (url.includes('localhost:11434/api/tags')) {
      return {
        status: 200,
        data: {
          models: [
            { name: 'llama3' }
          ]
        }
      };
    }
    throw new Error('Unknown API endpoint');
  }
};

// Mock the axios module
mockRequire('axios', mockAxios);

// Original modules to restore after tests
let originalAIService;
let originalOllamaClient;
let originalOpenRouterClient;

describe('AI Service tests', () => {

  test('should use OpenRouter when API key is available', async function(assert) {
  // Load the modules with our mocks
  mockRequire.reRequire('../../src/lib/openrouter-client');
  mockRequire.reRequire('../../src/lib/ollama-client');
  const AIService = mockRequire.reRequire('../../src/lib/ai-service');
  
  // Create a new AIService instance with an API key
  const aiService = new AIService({
    apiKey: 'test-api-key',
    model: 'test-model'
  });
  
  // Call chat completion
  const response = await aiService.chatCompletion([
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello' }
  ]);
  
  // Verify that OpenRouter was used
  expect(response).toEqual('This is a test response from the mock OpenRouter API.');
});

  test('should fall back to Ollama when OpenRouter API key is not available', async function(assert) {
  // Create a mock OllamaClient that always returns true for isAvailable
  const MockOllamaClient = class extends originalOllamaClient {
    async isAvailable() {
      return true;
    }
  };
  
  // Mock the OllamaClient
  mockRequire('../../src/lib/ollama-client', MockOllamaClient);
  
  // Mock the OpenRouterClient to throw an error
  const MockOpenRouterClient = class extends originalOpenRouterClient {
    async chatCompletion() {
      throw new Error('OpenRouter API error');
    }
  };
  
  // Mock the OpenRouterClient
  mockRequire('../../src/lib/openrouter-client', MockOpenRouterClient);
  
  // Load the AIService module with our mocks
  const AIService = mockRequire.reRequire('../../src/lib/ai-service');
  
  // Create a new AIService instance with no API key
  const aiService = new AIService({
    apiKey: null,
    ollamaModel: 'llama3'
  });
  
  // Call chat completion
  const response = await aiService.chatCompletion([
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello' }
  ]);
  
  // Verify that Ollama was used as a fallback
  expect(response).toEqual('This is a test response from the mock Ollama API.');
});

  test('should provide clear error message when both OpenRouter and Ollama are unavailable', async function(assert) {
  // Create a mock OllamaClient that returns false for isAvailable
  const MockOllamaClient = class extends originalOllamaClient {
    async isAvailable() {
      return false;
    }
  };
  
  // Mock the OllamaClient
  mockRequire('../../src/lib/ollama-client', MockOllamaClient);
  
  // Mock the OpenRouterClient to throw an error
  const MockOpenRouterClient = class extends originalOpenRouterClient {
    async chatCompletion() {
      throw new Error('OpenRouter API error');
    }
  };
  
  // Mock the OpenRouterClient
  mockRequire('../../src/lib/openrouter-client', MockOpenRouterClient);
  
  // Load the AIService module with our mocks
  const AIService = mockRequire.reRequire('../../src/lib/ai-service');
  
  // Create a new AIService instance with no API key
  const aiService = new AIService({
    apiKey: null
  });
  
  try {
    // Call chat completion - this should throw an error
    await aiService.chatCompletion([
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello' }
    ]);
    
    // If we get here, the test failed
    expect(false).toBeTruthy();
  } catch (error) {
    // Verify that a clear error message was provided
    expect(error.message.includes('AI services are not available').toBeTruthy(), 'Error message should indicate that both services are unavailable');
    expect(error.message.includes('OPENROUTER_API_KEY').toBeTruthy(), 'Error message should mention OPENROUTER_API_KEY');
    expect(error.message.includes('Ollama').toBeTruthy(), 'Error message should mention Ollama');
  }
});

  test('should load and save conversation history', async function(assert) {
  // Load the AIService module
  const AIService = require('../../src/lib/ai-service');
  
  // Create a temporary folder for testing
  const testFolder = path.join(__dirname, '..', 'ai-service-test');
  const conversationsDir = path.join(testFolder, '.kanbn', 'conversations');
  
  // Create the folder structure
  if (!fs.existsSync(testFolder)) {
    fs.mkdirSync(testFolder, { recursive: true });
  }
  if (!fs.existsSync(path.join(testFolder, '.kanbn'))) {
    fs.mkdirSync(path.join(testFolder, '.kanbn'), { recursive: true });
  }
  if (!fs.existsSync(conversationsDir)) {
    fs.mkdirSync(conversationsDir, { recursive: true });
  }
  
  try {
    // Create a new AIService instance
    const aiService = new AIService();
    
    // Test conversation history
    const conversationId = 'test-conversation';
    const history = [];
    const userMessage = { role: 'user', content: 'Hello' };
    const response = 'Hi there!';
    
    // Save conversation history
    const updatedHistory = await aiService.saveConversationHistory(
      testFolder,
      conversationId,
      history,
      userMessage,
      response
    );
    
    // Verify that the history was updated
    expect(updatedHistory.length).toEqual(2);
    expect(updatedHistory[0].role).toEqual('user');
    expect(updatedHistory[1].role).toEqual('assistant');
    
    // Verify that the history was saved to disk
    assert.ok(fs.existsSync(path.join(conversationsDir, `${conversationId}.json`)), 'Conversation file should exist');
    
    // Load conversation history
    const loadedHistory = aiService.loadConversationHistory(testFolder, conversationId);
    
    // Verify that the loaded history matches the saved history
    expect(loadedHistory.length).toEqual(2);
    expect(loadedHistory[0].role).toEqual('user');
    expect(loadedHistory[1].role).toEqual('assistant');
  } finally {
    // Clean up the test folder
    if (fs.existsSync(testFolder)) {
      fs.rmSync(testFolder, { recursive: true, force: true });
    }
  }
});

});\