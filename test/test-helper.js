/**
 * Kanbn Test Helper
 * 
 * Provides utilities for testing Kanbn functionality.
 * This centralizes test-specific code that was previously included in production files.
 */

const kanbnModule = require('../src/main');
const AIService = require('../src/lib/ai-service');
const ProjectContext = require('../src/lib/project-context');
const AILogging = require('../src/lib/ai-logging');
const InteractiveChat = require('../src/lib/interactive-chat');
const fs = require('fs');
const path = require('path');

/**
 * Get project context for testing
 * @param {boolean} includeReferences Whether to include references in the context
 * @returns {Promise<Object>} Project context
 */
async function getProjectContext(includeReferences = false) {
  const kanbn = typeof kanbnModule === 'function' ? kanbnModule() : kanbnModule;
  const projectContextHelper = new ProjectContext(kanbn);
  return await projectContextHelper.getContext(includeReferences);
}

/**
 * Call AI service API for testing
 * @param {string} message User message
 * @param {Object} context Project context
 * @param {string} apiKey API key
 * @param {string} model Model name
 * @param {string} boardFolder Board folder path
 * @param {string} conversationId Conversation ID
 * @param {Function} streamCallback Optional callback for streaming responses
 * @returns {Promise<string>} AI response
 */
async function callAIService(message, context, apiKey, model, boardFolder, conversationId, streamCallback = null) {
  const aiService = new AIService({
    apiKey: apiKey,
    model: model
  });
  
  // Create system message using ProjectContext
  const kanbn = typeof kanbnModule === 'function' ? kanbnModule() : kanbnModule;
  const projectContextHelper = new ProjectContext(kanbn);
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
 * @param {string} type Interaction type
 * @param {Object} data Interaction data
 * @returns {Promise<void>}
 */
async function logAIInteraction(boardFolder, type, data) {
  const kanbn = typeof kanbnModule === 'function' ? kanbnModule() : kanbnModule;
  const aiLogging = new AILogging(kanbn);
  return await aiLogging.logInteraction(boardFolder, type, data);
}

/**
 * Run interactive chat session for testing
 * @param {Object} projectContext Project context
 * @param {Object} chatHandler Chat handler
 * @param {Object} args Command arguments
 * @returns {Promise<string>} Session result
 */
async function interactiveChat(projectContext, chatHandler, args) {
  const kanbn = typeof kanbnModule === 'function' ? kanbnModule() : kanbnModule;
  const boardFolder = process.cwd();
  
  const aiService = new AIService({
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL
  });
  
  const aiLogging = new AILogging(kanbn);
  
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
    
    loadConversationHistory: (boardFolder, conversationId) => {
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
