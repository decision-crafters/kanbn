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
  // Explicitly use the mock Kanbn for consistency in test helpers
  const MockKanbn = require('./mock-kanbn').Kanbn;
  const kanbn = new MockKanbn();
  // Ensure the mock has the necessary methods for ProjectContext
  if (!kanbn.loadIndex) {
    console.warn('Warning: MockKanbn in test-helper is missing loadIndex method.');
    kanbn.loadIndex = async () => ({ columns: { 'Backlog': [] } }); // Provide a basic default mock
  }
  if (!kanbn.loadAllTrackedTasks) {
     console.warn('Warning: MockKanbn in test-helper is missing loadAllTrackedTasks method.');
     kanbn.loadAllTrackedTasks = async () => ([]); // Provide a basic default mock
  }
   if (!kanbn.getTask) {
     console.warn('Warning: MockKanbn in test-helper is missing getTask method.');
     kanbn.getTask = async (taskId) => ({ id: taskId, name: 'Mock Task', description: '' }); // Basic mock
   }
   if (!kanbn.getTaskPath) {
     console.warn('Warning: MockKanbn in test-helper is missing getTaskPath method.');
     kanbn.getTaskPath = async (taskId) => `./mock/tasks/${taskId}.md`; // Basic mock
   }
   if (!kanbn.getTaskFilePath) {
     console.warn('Warning: MockKanbn in test-helper is missing getTaskFilePath method.');
     kanbn.getTaskFilePath = async (taskId) => `./mock/tasks/${taskId}.md`; // Basic mock
   }
   if (!kanbn.getOptions) {
     console.warn('Warning: MockKanbn in test-helper is missing getOptions method.');
     kanbn.getOptions = async () => ({}); // Basic mock
   }
   if (!kanbn.getCustomFields) {
     console.warn('Warning: MockKanbn in test-helper is missing getCustomFields method.');
     kanbn.getCustomFields = async () => ({}); // Basic mock
   }


  const projectContextHelper = new ProjectContext(kanbn);
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
    model: model,
    // Pass mock kanbn if needed by AIService dependencies
  });

  // Create system message using ProjectContext with a mock Kanbn
  const MockKanbn = require('./mock-kanbn').Kanbn;
  const mockKanbnForSystemMessage = new MockKanbn();
   // Ensure the mock has the necessary methods for ProjectContext
  if (!mockKanbnForSystemMessage.loadIndex) {
    mockKanbnForSystemMessage.loadIndex = async () => ({ columns: { 'Backlog': [] } });
  }
  if (!mockKanbnForSystemMessage.loadAllTrackedTasks) {
     mockKanbnForSystemMessage.loadAllTrackedTasks = async () => ([]);
  }
   if (!mockKanbnForSystemMessage.getTask) {
     mockKanbnForSystemMessage.getTask = async (taskId) => ({ id: taskId, name: 'Mock Task', description: '' });
   }
   if (!mockKanbnForSystemMessage.getTaskPath) {
     mockKanbnForSystemMessage.getTaskPath = async (taskId) => `./mock/tasks/${taskId}.md`;
   }
   if (!mockKanbnForSystemMessage.getTaskFilePath) {
     mockKanbnForSystemMessage.getTaskFilePath = async (taskId) => `./mock/tasks/${taskId}.md`;
   }
   if (!mockKanbnForSystemMessage.getOptions) {
     mockKanbnForSystemMessage.getOptions = async () => ({});
   }
   if (!mockKanbnForSystemMessage.getCustomFields) {
     mockKanbnForSystemMessage.getCustomFields = async () => ({});
   }

  const projectContextHelper = new ProjectContext(mockKanbnForSystemMessage);
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
  // Use mock Kanbn for logging as well
  const MockKanbn = require('./mock-kanbn').Kanbn;
  const kanbn = new MockKanbn();
   // Add necessary methods if AILogging depends on them
   if (!kanbn.getMainFolder) {
     kanbn.getMainFolder = async () => boardFolder || '.';
   }
   if (!kanbn.createTask) {
     kanbn.createTask = async () => 'mock-ai-log-task-id';
   }
   if (!kanbn.getTaskPath) {
     kanbn.getTaskPath = async (taskId) => path.join(boardFolder || '.', '.kanbn', 'tasks', `${taskId}.md`);
   }
    if (!kanbn.getTaskFilePath) {
     kanbn.getTaskFilePath = async (taskId) => path.join(boardFolder || '.', '.kanbn', 'tasks', `${taskId}.md`);
   }
   if (!kanbn.saveTask) {
     kanbn.saveTask = async () => {};
   }
   if (!kanbn.getOptions) {
     kanbn.getOptions = async () => ({ ai: { logging: true } }); // Assume logging enabled for mock
   }


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
  // Use mock Kanbn here too
  const MockKanbn = require('./mock-kanbn').Kanbn;
  const kanbn = new MockKanbn();
  const boardFolder = process.cwd(); // Or use a mock path if needed

  // Ensure mock kanbn has methods needed by AILogging if used within InteractiveChat
   if (!kanbn.getMainFolder) {
     kanbn.getMainFolder = async () => boardFolder || '.';
   }
   if (!kanbn.createTask) {
     kanbn.createTask = async () => 'mock-ai-log-task-id';
   }
   if (!kanbn.getTaskPath) {
     kanbn.getTaskPath = async (taskId) => path.join(boardFolder || '.', '.kanbn', 'tasks', `${taskId}.md`);
   }
    if (!kanbn.getTaskFilePath) {
     kanbn.getTaskFilePath = async (taskId) => path.join(boardFolder || '.', '.kanbn', 'tasks', `${taskId}.md`);
   }
   if (!kanbn.saveTask) {
     kanbn.saveTask = async () => {};
   }
   if (!kanbn.getOptions) {
     kanbn.getOptions = async () => ({ ai: { logging: true } }); // Assume logging enabled for mock
   }


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
