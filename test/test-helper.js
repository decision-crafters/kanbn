/**
 * Kanbn Test Helper
 * 
 * Provides utilities for testing Kanbn functionality.
 * This centralizes test-specific code that was previously included in production files.
 */

const AIService = require('../src/lib/ai-service');
const ProjectContext = require('../src/lib/project-context');
const AILogging = require('../src/lib/ai-logging');
const InteractiveChat = require('../src/lib/interactive-chat');

/**
 * Get project context for testing
 * @param {Object} kanbnInstance A pre-configured Kanbn instance (mock or real)
 * @param {boolean} includeReferences Whether to include references in the context
 * @returns {Promise<Object>} Project context
 */
async function getProjectContext(kanbnInstance, includeReferences = false) {
  if (!kanbnInstance || typeof kanbnInstance.loadIndex !== 'function') {
      console.error("Error: getProjectContext received invalid kanbn instance!");
      // Provide a default minimal context on error to prevent cascading failures
      return {
          projectName: 'Mock Project',
          projectDescription: 'Mock Description',
          columns: ['Backlog'],
          tasks: [],
          tags: [],
          repositoryContext: ''
      };
  }
  const projectContextHelper = new ProjectContext(kanbnInstance);
  try {
      return await projectContextHelper.getContext(includeReferences);
  } catch (e) {
      console.error("Error getting project context in test-helper:", e);
      // Provide a default minimal context on error to prevent cascading failures
      return {
          projectName: 'Mock Project',
          projectDescription: 'Mock Description',
          columns: ['Backlog'],
          tasks: [],
          tags: [],
          repositoryContext: ''
      };
  }
}

/**
 * Call AI service API for testing
 * @param {string} message User message
 * @param {Object} context Project context
 * @param {Object} kanbnInstance Kanbn instance for context generation
 * @param {string} apiKey API key
 * @param {string} model Model name
 * @param {string} boardFolder Board folder path
 * @param {string} conversationId Conversation ID
 * @param {Function} streamCallback Optional callback for streaming responses
 * @returns {Promise<string>} AI response
 */
async function callAIService(message, context, kanbnInstance, apiKey, model, _boardFolder, _conversationId, streamCallback = null) {
  const aiService = new AIService({
    apiKey: apiKey,
    model: model,
    // Pass mock kanbn if needed by AIService dependencies
  });

  // Create system message using ProjectContext with the provided Kanbn instance
  if (!kanbnInstance || typeof kanbnInstance.loadIndex !== 'function') { // Basic check
      console.error("Error: callAIService received invalid kanbn instance for ProjectContext!");
      // Handle error appropriately, maybe throw or return default
      throw new Error("Invalid Kanbn instance provided to callAIService");
  }
  const projectContextHelper = new ProjectContext(kanbnInstance);
  const systemMessage = projectContextHelper.createSystemMessage(context);
  // Create user message
  const userMessage = {
    role: 'user',
    content: message
  };
  
  // Call AI service
  return await aiService.chatCompletion([systemMessage, userMessage], { streamCallback });
}

/**
 * Log AI interaction for testing
 * @param {string} boardFolder Board folder path
 * @param {Object} kanbnInstance A pre-configured Kanbn instance (mock or real)
 * @param {string} type Interaction type
 * @param {Object} data Interaction data
 * @returns {Promise<void>}
 */
async function logAIInteraction(boardFolder, kanbnInstance, type, data) {
  if (!kanbnInstance || typeof kanbnInstance.createTask !== 'function') { // Basic check
      console.error("Error: logAIInteraction received invalid kanbn instance!");
      return; // Or throw
  }
  const aiLogging = new AILogging(kanbnInstance);
  return await aiLogging.logInteraction(boardFolder, type, data);
}

/**
 * Run interactive chat session for testing
 * @param {Object} kanbnInstance A pre-configured Kanbn instance (mock or real)
 * @param {Object} projectContext Project context
 * @param {Object} chatHandler Chat handler
 * @param {Object} args Command arguments
 * @returns {Promise<string>} Session result
 */
async function interactiveChat(kanbnInstance, projectContext, chatHandler, args) {
  if (!kanbnInstance || typeof kanbnInstance.createTask !== 'function') { // Basic check
      console.error("Error: interactiveChat received invalid kanbn instance!");
      throw new Error("Invalid Kanbn instance provided to interactiveChat");
  }
  const boardFolder = process.cwd(); // Or use a mock path if needed

  const aiService = new AIService({
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL
  });

  const aiLogging = new AILogging(kanbnInstance);

  const interactiveChat = new InteractiveChat({
    chatHandler,
    aiService,
    projectContext: projectContext,
    aiLogging,
    boardFolder,
    conversationId: args.conversationId
  });
  
  return await interactiveChat.start(args);
}

/**
 * Create a mock AI service for testing
 * @param {string} responseText The text to return from the mock AI service
 * @returns {Object} Mock AI service
 */
function createMockAIService(responseText = "This is a test response from the mock AI assistant.") {
  return {
    chatCompletion: async (messages, options = {}) => {
      // If there's a stream callback, simulate streaming
      if (options.streamCallback) {
        // Split the response into chunks to simulate streaming
        const chunks = responseText.split(' ');
        let accumulatedText = '';
        
        for (const chunk of chunks) {
          accumulatedText += chunk + ' ';
          options.streamCallback(accumulatedText);
          // Small delay to simulate network latency
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      // Log the interaction if a callback is provided
      if (options.logCallback) {
        await options.logCallback('response', { 
          service: 'mock', 
          response: responseText 
        });
      }
      
      return responseText;
    },
    
    loadConversationHistory: (_boardFolder, _conversationId) => {
      return [];
    },
    
    saveConversationHistory: async (boardFolder, conversationId, history, userMessage, response) => {
      return [...history, userMessage, { role: 'assistant', content: response }];
    },
    
    options: {
      model: 'mock-model'
    }
  };
}

module.exports = {
  getProjectContext,
  callAIService,
  logAIInteraction,
  interactiveChat,
  createMockAIService
};
