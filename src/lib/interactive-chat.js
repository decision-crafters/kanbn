/**
 * Interactive Chat Module
 *
 * Handles interactive chat sessions with the AI assistant
 */

// Use dynamic import to avoid issues with ESM vs CommonJS
let inquirer;
try {
  inquirer = require('inquirer');
} catch (error) {
  console.error('Error loading inquirer:', error.message);
  // Fallback to a simple readline implementation if inquirer fails
  const readline = require('readline');
  inquirer = {
    prompt: (questions) => new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const question = questions[0];
      rl.question(`${question.message} `, (answer) => {
        rl.close();
        resolve({ [question.name]: answer });
      });
    }),
  };
}

// Simple color helper
const chalk = {
  yellow: (text) => `\u001b[33m${text}\u001b[0m`,
  blue: (text) => `\u001b[34m${text}\u001b[0m`,
  green: (text) => `\u001b[32m${text}\u001b[0m`,
  gray: (text) => `\u001b[90m${text}\u001b[0m`,
  cyan: (text) => `\u001b[36m${text}\u001b[0m`,
  reset: (text) => `\u001b[0m${text}\u001b[0m`,
};
chalk.blue.bold = (text) => `\u001b[1;34m${text}\u001b[0m`;

class InteractiveChat {
  /**
   * Create a new interactive chat instance
   * @param {Object} options Configuration options
   * @param {Object} options.chatHandler ChatHandler instance
   * @param {Object} options.aiService AIService instance
   * @param {Object} options.projectContext ProjectContext instance
   * @param {Object} options.aiLogging AILogging instance
   * @param {string} options.boardFolder Board folder path
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
   * @param {Object} args Command line arguments
   * @returns {Promise<string>} Session result
   */
  async start(args) {
    console.log('Debug: InteractiveChat.start method called');
    try {
      // Validate components
      console.log('Debug: Validating components:');
      console.log('- chatHandler:', !!this.chatHandler);
      console.log('- aiService:', !!this.aiService);
      console.log('- projectContext:', !!this.projectContext);
      console.log('- aiLogging:', !!this.aiLogging);
      console.log('- boardFolder:', this.boardFolder);

      // Get the model information
      console.log('Debug: Getting model information');
      const model = this.aiService?.options?.model || 'default model';

      console.log('Debug: Showing welcome message');
      console.log(chalk.blue.bold('\n📊 Kanbn Project Assistant 📊'));
      console.log(`\u001b[90mUsing model: ${model}\u001b[0m`);
      console.log(chalk.gray('Type "exit" or "quit" to end the conversation\n'));

      console.log('Debug: Setting up chat loop');
      let chatActive = true;

      // Make sure inquirer is available
      if (!inquirer || !inquirer.prompt) {
        throw new Error('Interactive chat requires the inquirer module which is not available');
      }

      console.log('Debug: Starting chat loop');
      while (chatActive) {
        try {
          console.log('Debug: Prompting for user input');
          // Get user input
          let answers;
          try {
            answers = await inquirer.prompt([
              {
                type: 'input',
                name: 'message',
                message: chalk.green('You:'),
              },
            ]);
          } catch (promptError) {
            console.error('Error during prompt:', promptError.message);
            // Fallback to basic readline if inquirer fails
            const readline = require('readline');
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout,
            });

            answers = await new Promise((resolve) => {
              rl.question(chalk.green('You: '), (answer) => {
                rl.close();
                resolve({ message: answer });
              });
            });
          }

          const message = answers.message.trim();

          // Check for exit commands
          if (message.toLowerCase() === 'exit' || message.toLowerCase() === 'quit') {
            console.log(chalk.blue('Project Assistant: Goodbye! Happy organizing!'));
            chatActive = false;
            continue;
          }

          // Show thinking message
          console.log(chalk.yellow('Project Assistant: ') + chalk.gray('Thinking...'));

          // Try to process the message
          try {
          // First try to handle with ChatHandler
            try {
              console.log('Attempting to handle message with chat handler...');
              const response = await this.chatHandler.handleMessage(message, {
                outputCallback: (response) => {
                // Clear the line
                  process.stdout.write(`\r${' '.repeat(100)}\r`);
                  process.stdout.write(`${chalk.cyan('Kanbn Assistant: ') + response}\n`);
                },
                columnCompletionCallback: (columns) => {
                  inquirer.prompt([
                    {
                      type: 'list',
                      name: 'column',
                      message: 'Choose a column:',
                      choices: columns,
                    },
                  ]).then((answers) => {
                    process.stdout.write(chalk.gray(`Selected column: ${answers.column}\n`));
                    // Send the column back to the chat handler
                    this.chatHandler.handleColumnSelection(message, answers.column);
                  });
                },
              });

              // Display the response
              process.stdout.write('\r[K');
              console.log(`${chalk.yellow('Project Assistant: ') + response}\n`);
            } catch (error) {
            // If the message doesn't match any command, use AI service
              process.stdout.write('\r[K');
              console.log(chalk.yellow('Project Assistant: ') + chalk.gray('Processing your message...'));

              try {
              // Get project context
                const context = await this.projectContext.getContext(true);

                // Create system message
                const systemMessage = this.projectContext.createSystemMessage(context);

                // Load conversation history
                const history = this.aiService.loadConversationHistory(this.boardFolder, this.conversationId);

                // Create user message
                const userMessage = {
                  role: 'user',
                  content: message,
                };

                // Define streaming callback
                const streamCallback = (chunk) => {
                // Clear the line
                  process.stdout.write(`\r${' '.repeat(100)}\r`);
                  // Write the chunk
                  process.stdout.write(chalk.yellow('Project Assistant: ') + chalk.reset(chunk));
                };

                // Call AI service
                console.log('No command matched, calling AI service...');
                const response = await this.aiService.chatCompletion(
                  [systemMessage, ...history, userMessage],
                  {
                    streamCallback,
                    logCallback: async (type, data) => {
                      await this.aiLogging.logInteraction(this.boardFolder, type, data);
                    },
                  },
                );

                // Save conversation history
                await this.aiService.saveConversationHistory(
                  this.boardFolder,
                  this.conversationId,
                  history,
                  userMessage,
                  response,
                );

                // Print a newline after streaming
                console.log('\n');
              } catch (aiError) {
              // If AI service fails, show error
                process.stdout.write('\r[K');
                console.error('Error calling AI service:', aiError.message);
                console.log(`${chalk.yellow('Project Assistant: ')
                }I'm having trouble processing your request. ${aiError.message}\n`);
              }
            }
          } catch (error) {
            console.error('Error in chat:', error.message);
            chatActive = false;
          }
        } catch (inputError) {
          console.error('Error getting user input:', inputError.message);
          chatActive = false;
        }
      }

      console.log('Debug: Chat session ended normally');
      return 'Interactive chat session ended';
    } catch (startError) {
      console.error('Error in InteractiveChat.start:', startError);
      console.error('Error stack:', startError.stack);
      throw startError;
    }
  }
}

module.exports = InteractiveChat;
