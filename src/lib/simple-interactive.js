/**
 * Simple Interactive Chat Module
 *
 * A simplified, robust implementation of interactive chat that works reliably
 * across different Node.js versions
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Simple color helper that doesn't rely on external dependencies
const colors = {
  reset: '\x1b[0m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

class SimpleInteractive {
  /**
   * Create a new simple interactive chat instance
   * @param {Object} options Configuration options
   * @param {Object} options.chatHandler ChatHandler instance
   * @param {Object} options.aiService AIService instance
   * @param {Object} options.projectContext ProjectContext instance
   * @param {Object} options.aiLogging AILogging instance
   * @param {string} options.boardFolder Board folder path
   * @param {string} options.conversationId Conversation ID
   */
  constructor(options) {
    this.chatHandler = options.chatHandler;
    this.aiService = options.aiService;
    this.projectContext = options.projectContext;
    this.aiLogging = options.aiLogging;
    this.boardFolder = options.boardFolder;
    this.conversationId = options.conversationId || `chat-${Date.now()}`;
  }

  /**
   * Start an interactive chat session
   * @param {Object} args Command arguments
   * @returns {Promise<string>} Session result
   */
  async start(args) {
    console.log('Debug: SimpleInteractive.start method called');
    try {
      // Validate components with detailed logging
      console.log('Debug: Validating components:');

      if (!this.chatHandler) {
        console.error('ERROR: chatHandler is missing');
        throw new Error('Chat handler is required but not provided');
      }
      console.log('- chatHandler:', typeof this.chatHandler, 'with handleMessage:', typeof this.chatHandler.handleMessage === 'function');

      if (!this.aiService) {
        console.log('WARNING: aiService is missing');
      } else {
        console.log('- aiService:', typeof this.aiService, 'with options:', JSON.stringify(this.aiService.options || {}, null, 2));
      }

      if (!this.projectContext) {
        console.error('ERROR: projectContext is missing');
        throw new Error('Project context is required but not provided');
      }
      console.log('- projectContext:', typeof this.projectContext);

      console.log('- aiLogging:', typeof this.aiLogging);
      console.log('- boardFolder:', this.boardFolder);

      // Get the model information
      console.log('Debug: Getting model information');
      const model = this.aiService?.options?.model || 'default model';

      // Show welcome message
      console.log(`${colors.blue}\n📊 Kanbn Project Assistant 📊${colors.reset}`);
      console.log(`${colors.gray}Using model: ${model}${colors.reset}`);
      console.log(`${colors.gray}Type "exit" or "quit" to end the conversation\n${colors.reset}`);

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
      });

      // Create chat loop
      let chatActive = true;

      while (chatActive) {
        try {
          // Get user input
          console.log('Debug: Waiting for user input...');
          const message = await new Promise((resolve) => {
            rl.question(`${colors.green}You: ${colors.reset}`, (answer) => {
              resolve(answer.trim());
            });
          });
          console.log('Debug: Received user input:', message);

          // Check for exit commands
          if (message.toLowerCase() === 'exit' || message.toLowerCase() === 'quit') {
            console.log(`${colors.blue}Project Assistant: Goodbye! Happy organizing!${colors.reset}`);
            chatActive = false;
            continue;
          }

          // Show thinking message
          process.stdout.write(`${colors.yellow}Project Assistant: ${colors.gray}Thinking...${colors.reset}`);

          // Verify chatHandler exists and has handleMessage method
          if (!this.chatHandler || typeof this.chatHandler.handleMessage !== 'function') {
            throw new Error('Chat handler is not properly initialized');
          }

          console.log('\nDebug: Calling chatHandler.handleMessage with message:', message);
          // Process the message with ChatHandler
          const response = await this.chatHandler.handleMessage(message);
          console.log('Debug: Received response from chatHandler');

          // Clear the thinking message and show the response
          process.stdout.write(`\r${' '.repeat(100)}\r`);
          console.log(`${colors.yellow}Project Assistant: ${colors.reset}${response}`);
        } catch (messageError) {
          console.error('Error processing message:', messageError);
          console.log(`${colors.red}Error: ${colors.reset}${messageError.message || 'Unknown error'}`);
          // Continue the chat loop despite errors
        }
      }

      rl.close();
      return 'Chat session ended';
    } catch (error) {
      console.error('Error in SimpleInteractive.start:', error);
      console.error('Error stack:', error.stack);
      // Return error message instead of throwing to prevent crashing the application
      return `Error in chat: ${error.message || 'Unknown error'}. Please try using the --message flag instead.`;
    }
  }

  /**
   * Define streaming callback
   * @param {string} chunk Text chunk
   */
  streamCallback(chunk) {
    process.stdout.write(chunk);
  }

  /**
   * Define logging callback
   * @param {string} type Log type
   * @param {Object} data Log data
   */
  logCallback(type, data) {
    console.log(`[${type}]`, data);
  }
}

module.exports = SimpleInteractive;
