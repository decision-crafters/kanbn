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
 * Retrieves the project context using the provided Kanbn instance, returning a minimal mock context if the instance is invalid or an error occurs.
 *
 * @param {Object} kanbnInstance - A Kanbn instance (mock or real) used to obtain project context.
 * @param {boolean} [includeReferences=false] - Whether to include reference data in the context.
 * @returns {Promise<Object>} The project context object, or a default mock context on failure.
 *
 * @remark
 * If the Kanbn instance is invalid or an error occurs during context retrieval, a minimal mock context is returned instead of throwing.
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
 * Sends a user message and project context to the AI service and returns the AI's response.
 *
 * Throws an error if the provided Kanbn instance is invalid.
 *
 * @param {string} message - The user's message to send to the AI.
 * @param {Object} context - The project context to include in the system prompt.
 * @param {Object} kanbnInstance - The Kanbn instance used to generate the system message.
 * @param {string} apiKey - API key for the AI service.
 * @param {string} model - The AI model to use.
 * @param {Function} [streamCallback] - Optional callback for streaming partial responses.
 * @returns {Promise<string>} The AI assistant's response.
 *
 * @throws {Error} If {@link kanbnInstance} is missing or does not have a valid `loadIndex` method.
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
 * Logs an AI interaction to the specified board folder using the provided Kanbn instance.
 *
 * @param {string} boardFolder - Path to the board folder where the interaction will be logged.
 * @param {string} type - The type of AI interaction being logged.
 * @param {Object} data - The data associated with the AI interaction.
 *
 * @remark
 * If the provided Kanbn instance is invalid or missing the required method, the function logs an error and does not perform logging.
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
 * Runs an interactive AI chat session using the provided Kanbn instance and project context.
 *
 * @param {Object} kanbnInstance - A Kanbn instance with a `createTask` method.
 * @param {Object} projectContext - The context of the project for the chat session.
 * @param {Object} chatHandler - Handler for processing chat messages.
 * @param {Object} args - Command arguments, including conversation ID and other options.
 * @returns {Promise<string>} The result of the chat session.
 *
 * @throws {Error} If an invalid Kanbn instance is provided.
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
 * Creates a mock AI service object for testing AI-related functionality.
 *
 * The mock service simulates AI chat completions, conversation history loading, and saving, returning preset responses and supporting optional streaming and logging callbacks.
 *
 * @param {string} [responseText="This is a test response from the mock AI assistant."] - The response text returned by the mock AI service.
 * @returns {Object} A mock AI service implementing chat completion and conversation history methods.
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
