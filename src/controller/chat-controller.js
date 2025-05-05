/**
 * Kanbn Chat Controller
 *
 * Main entry point for the chat functionality
 */

// Suppress deprecation warnings (including punycode)
process.noDeprecation = true;

// When spawning child processes, make sure they also suppress deprecation warnings
process.env.NODE_OPTIONS = process.env.NODE_OPTIONS || '';
if (!process.env.NODE_OPTIONS.includes('--no-deprecation')) {
  process.env.NODE_OPTIONS += ' --no-deprecation';
}

const kanbnModule = require('../main');
const utility = require('../utility');
const AIService = require('../lib/ai-service');
const ProjectContext = require('../lib/project-context');
const ChatHandler = require('../lib/chat-handler');
const InteractiveChat = require('../lib/interactive-chat');
const ContextSerializer = require('../lib/context-serializer');
const AILogging = require('../lib/ai-logging');
const PromptLoader = require('../lib/prompt-loader');
const MemoryManager = require('../lib/memory-manager');
const eventBus = require('../lib/event-bus');

// const { execSync } = require('child_process'); // Commented out as unused
// const { debugLog } = require('../utility'); // Commented out as unused

// Try to use the new SimpleInteractive class first, fall back to InteractiveChat if needed
let SimpleInteractive;
try {
  SimpleInteractive = require('../lib/simple-interactive');
} catch (error) {
  utility.debugLog('SimpleInteractive not available, using InteractiveChat');
}

try {
  InteractiveChat = require('../lib/interactive-chat');
} catch (error) {
  utility.debugLog('InteractiveChat not available');
}

// Simple color helper
const chalk = {
  yellow: (text) => `\u001b[33m${text}\u001b[0m`,
  blue: (text) => `\u001b[34m${text}\u001b[0m`,
  green: (text) => `\u001b[32m${text}\u001b[0m`,
  gray: (text) => `\u001b[90m${text}\u001b[0m`,
  cyan: (text) => `\u001b[36m${text}\u001b[0m`,
  red: (text) => `\u001b[31m${text}\u001b[0m`,
  reset: (text) => `\u001b[0m${text}\u001b[0m`
};
chalk.blue.bold = (text) => `\u001b[1;34m${text}\u001b[0m`;

/**
 * Handle a single chat message
 * @param {Object} options Chat options
 * @param {Object} options.kanbn Kanbn instance
 * @param {Object} options.boardFolder Board folder path
 * @param {Object} options.message User message
 * @param {Object} options.conversationId Conversation ID
 * @returns {Promise<string>} Chat response
 */
async function handleChatMessage(options) {
  try {
    const { kanbn, boardFolder, message, parentContext } = options;
    utility.debugLog(`Chat message: ${message}`);

    // Check if we have pre-serialized context from a parent process
    let projectContext;
    let chatHandler;

    if (parentContext && parentContext.project) {
      utility.debugLog('Using pre-serialized context from parent process');
      projectContext = parentContext.project;

      // Create chat handler with the deserialized context
      chatHandler = new ChatHandler(kanbn, boardFolder, projectContext);

      // If parent process passed memory, restore it
      if (parentContext.memory && parentContext.memory.conversations) {
        utility.debugLog(`Restoring ${parentContext.memory.conversations.length} conversation items from parent`);
        chatHandler.setMemory(parentContext.memory);
      }
    } else {
      // Initialize components normally if no parent context
      utility.debugLog('No parent context found, initializing normally');
      const projectContextManager = new ProjectContext(kanbn);

      // Integration variables will be initialized later in the function

      // Include both system tasks and project tasks for the AI context
      // We'll handle integrations after initializing the variables
      projectContext = await projectContextManager.getContext(
        true, // include references
        true  // include system tasks
      );

      // Integration handling will be done after the variables are defined

      // Debug information about task counts
      if (projectContext.tasks) {
        const taskUtils = require('../lib/task-utils');
        const systemTasks = Object.entries(projectContext.tasks)
          .filter(([id, task]) => taskUtils.isSystemTask(id, task));

        utility.debugLog(`Providing AI with ${Object.keys(projectContext.tasks).length} total tasks, including ${systemTasks.length} system tasks`);
      }

      chatHandler = new ChatHandler(kanbn, boardFolder, projectContext);
    }

    // Initialize AI service
    const aiService = new AIService({
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL
    });

    const aiLogging = new AILogging(kanbn);
    const conversationId = options.conversationId || `chat-${Date.now()}`;

    // Check if we're using integrations
    // Safely access options.args if available
    const useIntegrations = options && options.args ? (options.args['with-integrations'] || false) : false;
    const specificIntegrations = options && options.args && options.args.integration ?
      (Array.isArray(options.args.integration) ? options.args.integration : [options.args.integration]) :
      [];
    const isUsingIntegrations = useIntegrations || (specificIntegrations && specificIntegrations.length > 0);

    // Update project context with integrations if needed
    if (isUsingIntegrations) {
      utility.debugLog(`Including integrations in context: ${useIntegrations ? 'all' : specificIntegrations.join(', ')}`);

      try {
        // Re-fetch context with integrations
        const projectContextManager = new ProjectContext(kanbn);

        // Create an array with a special flag for using all integrations
        let integrationParam = specificIntegrations;
        if (useIntegrations) {
          integrationParam = [];
          // Add a special flag to indicate we want all integrations
          integrationParam._useAllIntegrations = true;
        }

        const contextWithIntegrations = await projectContextManager.getContext(
          true, // include references
          true, // include system tasks
          integrationParam // Either specific integrations or all integrations with flag
        );

        // Update the project context with integration content
        if (contextWithIntegrations && contextWithIntegrations.integrationsContent) {
          projectContext.integrationsContent = contextWithIntegrations.integrationsContent;
          utility.debugLog('Successfully added integration content to context');
        }
      } catch (integrationError) {
        utility.debugLog(`Error loading integrations: ${integrationError.message}`);
      }
    }

    // Skip command processing if explicitly using integrations
    if (!isUsingIntegrations) {
      // Try direct command first
      try {
        // Process the message using ChatHandler
        return await chatHandler.handleMessage(message);
      } catch (error) {
        // If no command matched, use AI service
        utility.debugLog('No command matched, calling AI service...');
      }
    } else {
      utility.debugLog('Using integrations, skipping command processing and going straight to AI service');
    }

    // Create system message - use enhanced context if available
    let systemMessage;
      if (projectContext) {
        const contextManager = new ProjectContext(kanbn);

        // Load memory context for task reference history if available
        let memoryContext = null;
        try {
          // Use the project root directory for consistency with task reference recording
          const projectRoot = process.cwd();
          utility.debugLog(`Loading memory context using project root: ${projectRoot}`);

          const memoryManager = new MemoryManager(projectRoot);
          await memoryManager.loadMemory();
          memoryContext = memoryManager.memory;

          utility.debugLog(`Memory file location: ${memoryManager.memoryFile}`);
          utility.debugLog(`Loaded memory context with ${Object.keys(memoryContext.taskReferences || {}).length} task references`);
        } catch (memoryError) {
          utility.debugLog(`Error loading memory context: ${memoryError.message}`);
        }

        // Create system message with memory context if available
        // Note: createSystemMessage is now async
        try {
          systemMessage = await contextManager.createSystemMessage(projectContext, memoryContext);
          utility.debugLog('Successfully created system message with repository context');
        } catch (systemMessageError) {
          utility.debugLog(`Error creating system message: ${systemMessageError.message}`);
          // Fallback to simple system message
          systemMessage = {
            role: 'system',
            content: 'You are a helpful assistant for the Kanbn task management system.'
          };
        }
      } else {
        // Fallback to simple system message
        systemMessage = {
          role: 'system',
          content: 'You are a helpful assistant for the Kanbn task management system.'
        };
      }

      // Load conversation history
      const history = aiService.loadConversationHistory(boardFolder, conversationId);

      // Check if the user is asking about a specific task
      // Improved regex to more precisely extract just the task ID
      const taskIdRegex = /(?:details|info|about|show|tell me about|status of|what is|describe)\s+(?:task|the task)?\s+["']?([a-zA-Z0-9-_]+)["']?/i;

      // Direct task ID mention pattern (e.g., "test-feature task details")
      const directTaskIdRegex = /["']?([a-zA-Z0-9-_]+)["']?\s+(?:task|details|info)/i;

      // Try both patterns to find task ID
      const taskMatch = message.match(taskIdRegex) || message.match(directTaskIdRegex);
      let enhancedMessage = message;

      // If a potential task ID was detected, try to fetch task details
      if (taskMatch && taskMatch[1]) {
        const potentialTaskId = taskMatch[1].trim();
        utility.debugLog(`Potential task ID detected: ${potentialTaskId}`);

        try {
          // Check if the task exists before trying to get details
          let taskExists = false;
          try {
            // Use the safer task exists check first
            taskExists = await kanbn.taskExists(potentialTaskId);
            utility.debugLog(`Task existence check: ${potentialTaskId} exists = ${taskExists}`);
          } catch (existsError) {
            utility.debugLog(`Task existence check failed: ${existsError.message}`);
            // Fall through to try reading the task directly
          }

          // Only proceed if the task exists or we couldn't check
          if (taskExists) {
            // Create a ProjectContext instance if needed
            const contextManager = new ProjectContext(kanbn);
            const taskDetails = await contextManager.getTaskDetails(potentialTaskId);

            // Only enhance the message if task details were found
            if (taskDetails && !taskDetails.includes('not found')) {
              utility.debugLog('Task details found, enhancing message');
              enhancedMessage = `${message}\n\n${taskDetails}`;

              // Record the task reference in memory if we have access to a memory manager
              try {
                // Create a memory manager for the board folder if we don't already have one
                // Ensure we're using the project root directory
                const projectRoot = process.cwd();
                utility.debugLog(`Creating memory manager using project root: ${projectRoot}`);

                const memoryManager = new MemoryManager(projectRoot);
                await memoryManager.loadMemory();

                // Get basic task data to store in the reference
                const taskData = {
                  taskId: potentialTaskId,
                  taskName: taskDetails.match(/\*\*Name:\*\* ([^\n]+)/)?.[1] || potentialTaskId,
                  column: taskDetails.match(/\*\*Column:\*\* ([^\n]+)/)?.[1] || 'Unknown'
                };

                utility.debugLog(`Recording task reference for ${potentialTaskId}: ${JSON.stringify(taskData)}`);

                // Record this task reference
                await memoryManager.addTaskReference(potentialTaskId, taskData, 'view');

                // Log memory file location for debugging
                utility.debugLog(`Memory file location: ${memoryManager.memoryFile}`);

                // Emit an event for tracking
                eventBus.emit('taskDetailViewed', [{ taskId: potentialTaskId, taskName: taskData.taskName }]);
              } catch (memoryError) {
                utility.debugLog(`Error recording task reference: ${memoryError.message}`);
              }
            } else {
              utility.debugLog(`No details found for task: ${potentialTaskId}`);
            }
          } else {
            utility.debugLog(`Task ${potentialTaskId} does not exist, skipping details lookup`);
          }
        } catch (taskError) {
          utility.debugLog(`Error retrieving task details: ${taskError.message}`);
        }
      }

      // Create user message (possibly enhanced with task details)
      const userMessage = {
        role: 'user',
        content: enhancedMessage
      };

      // Call AI service
      let response = await aiService.chatCompletion(
        [systemMessage, ...history, userMessage],
        {
          logCallback: async (type, data) => {
            await aiLogging.logInteraction(boardFolder, type, data);
          }
        }
      );

      // Fix for duplicate responses: Check if the response is duplicated
      // This can happen in some environments due to how the response is processed
      if (response) {
        // Check if the response contains a duplicate of itself
        const firstHundredChars = response.substring(0, 100).trim();
        if (firstHundredChars.length > 20) {
          // Look for the same text pattern later in the response
          const secondHalfIndex = response.indexOf(firstHundredChars, 100);
          if (secondHalfIndex > 0) {
            // Found a potential duplicate
            utility.debugLog('Detected potential duplicated response');

            // Check if the second half is a complete duplicate of the first half
            const firstHalf = response.substring(0, secondHalfIndex).trim();
            const secondHalf = response.substring(secondHalfIndex).trim();

            // If the second half starts with the same content as the first half,
            // it's likely a duplicate
            if (secondHalf.startsWith(firstHalf.substring(0, Math.min(firstHalf.length, 100)))) {
              utility.debugLog('Confirmed duplicated response, using only the first half');
              response = firstHalf;
            }
          }
        }
      }

      // Save conversation history
      await aiService.saveConversationHistory(
        boardFolder,
        conversationId,
        history,
        userMessage,
        response
      );

      utility.debugLog('AI service call completed successfully.');
      return response;
  } catch (error) {
    console.error('Error handling chat message:', error);
    return `Error: ${error.message}. Please ensure either OpenRouter API key is set or Ollama is running.`;
  }
}

/**
 * Main chat controller module
 * @param {Object} args Command arguments
 * @returns {Promise<string>} Command result
 */
module.exports = async (args, _argv, _id) => {
  utility.debugLog('Chat controller started');
  // Validate required modules are loaded correctly
  try {
    utility.debugLog('Required modules check:');
    utility.debugLog(`- ChatHandler: ${typeof ChatHandler}`);
    utility.debugLog(`- AIService: ${typeof AIService}`);
    utility.debugLog(`- ProjectContext: ${typeof ProjectContext}`);
    utility.debugLog(`- InteractiveChat: ${typeof InteractiveChat}`);
  } catch (moduleError) {
    utility.error('Module validation error:', moduleError.message);
  }
  try {
    // Create a Kanbn instance - handle both function and object shapes
    const kanbn = typeof kanbnModule === 'function' ? kanbnModule() : kanbnModule;

    // Check if we're in a Kanbn board
    let inBoard = false;
    try {
      const data = await kanbn.getIndex();
      inBoard = true;
    } catch (error) {
      utility.warning('Not inside a Kanbn board. Some commands may not work correctly.');
    }

    // Store the board folder
    const boardFolder = process.cwd();
    args.boardFolder = boardFolder;

    // Set up prompt loader for any commands that need prompts
    let promptLoader;
    try {
      // Get the kanbn folder path - be resilient for testing environment
      let kanbnFolder = boardFolder;
      if (inBoard && typeof kanbn.getMainFolder === 'function') {
        try {
          kanbnFolder = await kanbn.getMainFolder();
        } catch (folderError) {
          utility.debugLog(`Using board folder as fallback: ${folderError.message}`);
        }
      }

      promptLoader = new PromptLoader(kanbnFolder);
      // Just initialize the loader - we'll load specific prompts as needed
      await promptLoader.listPrompts(); // List available prompts
    } catch (error) {
      utility.warning(`Error loading prompts: ${error.message}`);
      // Create an empty prompt loader for resilience in testing
      promptLoader = new PromptLoader(boardFolder);
    }

    // Create memory manager for commands that use conversation history
    let _memoryManager;
    try {
      // Get the kanbn folder path - be resilient for testing environment
      let kanbnFolder = boardFolder;
      if (inBoard && typeof kanbn.getMainFolder === 'function') {
        try {
          kanbnFolder = await kanbn.getMainFolder();
        } catch (folderError) {
          utility.debugLog(`Using board folder as fallback: ${folderError.message}`);
        }
      }

      _memoryManager = new MemoryManager(kanbnFolder);
    } catch (error) {
      utility.warning(`Error initializing memory manager: ${error.message}`);
      // Create an empty memory manager for resilience in testing
      memoryManager = new MemoryManager(boardFolder);
    }

    // Handle commands
    if (args.interactive || (!args.message && !args.interactive)) {
      // Start interactive chat with a reliable direct implementation
      utility.debugLog('Starting direct interactive chat implementation');

      try {
        // Initialize project context and chat handler for interactive mode
        const ProjectContext = require('../lib/project-context');
        const ChatHandler = require('../lib/chat-handler');

        // Initialize these before using them in the interactive loop
        let projectContext;
        let chatHandler;

        try {
          // Create project context
          const projectContextManager = new ProjectContext(kanbn);
          projectContext = await projectContextManager.getContext(true);
          utility.debugLog(`Initialized project context with ${projectContext.columns ? projectContext.columns.length : 0} columns`);

          // Create chat handler with the project context
          const chatHandler = new ChatHandler(kanbn, boardFolder, projectContext);
          utility.debugLog('Chat handler initialized successfully');
        } catch (contextError) {
          utility.error('Error initializing project context:', contextError.message);
          // Create fallback empty objects to prevent null reference errors
          projectContext = { columns: ['Backlog'], tasks: {} };
          utility.debugLog('Using fallback empty project context');
        }

        // Skip the complex setup and directly use the simple and robust approach that we know works
        const readline = require('readline');
        const { execSync } = require('child_process');

        const colors = {
          reset: '\x1b[0m',
          yellow: '\x1b[33m',
          blue: '\x1b[34m',
          green: '\x1b[32m',
          gray: '\x1b[90m'
        };

        // Create readline interface
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        // Show welcome message
        console.log(`${colors.blue}\n📊 Kanbn Project Assistant 📊${colors.reset}`);
        console.log(`${colors.gray}Type "exit" or "quit" to end the conversation\n${colors.reset}`);

        // Chat loop
        let chatActive = true;

        while (chatActive) {
          try {
            // Get user input
            const message = await new Promise(resolve => {
              rl.question(`${colors.green}You: ${colors.reset}`, answer => {
                resolve(answer.trim());
              });
            });

            // Check for exit commands
            if (message.toLowerCase() === 'exit' || message.toLowerCase() === 'quit') {
              console.log(`${colors.blue}Project Assistant: Goodbye! Happy organizing!${colors.reset}`);
              chatActive = false;
              continue;
            }

            console.log(`${colors.yellow}Project Assistant: ${colors.gray}Thinking...${colors.reset}`);

            try {
              // Prepare a standardized context object for the subprocess
              // Note: ChatHandler doesn't expose a getMemory method, so we pass null for memory
              // This is fine as the child process will initialize its own memory if needed
              const contextObject = ContextSerializer.createContextObject(
                projectContext,
                null, // We don't have access to memory directly from ChatHandler
                { interactive: true }
              );

              // Validate the context to ensure it's properly structured
              const validationResult = ContextSerializer.validate(contextObject);
              if (!validationResult.valid) {
                utility.debugLog(`Context validation errors: ${validationResult.errors.join(', ')}`);
              } else {
                utility.debugLog('Context validation successful');
              }

              // Serialize the context
              const serializedContext = ContextSerializer.serialize(contextObject);

              // Skip direct handling and go straight to the reliable message-based approach
              // This avoids any potential issues with complex object interactions
              const escapedMessage = message.replace(/"/g, '\\"'); // Escape quotes
              // Add a quiet flag to suppress warnings when using the fallback
              // Use a guaranteed absolute path to ensure consistent context
              const currentDir = process.cwd();
              utility.debugLog(`Current directory for subprocess: ${currentDir}`);

              // Store serialized context in a temporary environment variable
              const contextVar = 'KANBN_SERIALIZED_CONTEXT';

              // Prepare environment with context
              const envWithContext = {
                ...process.env,
                KANBN_CONTEXT_DIR: currentDir,
                [contextVar]: serializedContext
              };

              // Force KANBN_QUIET=true and explicitly disable DEBUG output in the subprocess
              const cmd = `KANBN_QUIET=true DEBUG=false kanbn chat --message "${escapedMessage}"`;
              let aiResponse = "I'm sorry, I couldn't process your request.";
              try {
                // Execute the command with enhanced context
                const result = execSync(cmd, {
                  cwd: currentDir,
                  env: envWithContext,
                  maxBuffer: 1024 * 1024 // Increase buffer size for large responses
                }).toString();

                // Log context transfer details for debugging
                const contextStats = {
                  contextSize: serializedContext.length,
                  hasProject: contextObject.project !== null,
                  hasMemory: contextObject.memory !== null,
                  taskCount: contextObject.project?.tasks?.length || 0
                };
                utility.debugLog(`Context transfer stats: ${JSON.stringify(contextStats)}`);

                // Extract just the AI response part from the output
                // Log the full result for debugging
                utility.debugLog(`Subprocess output (first 100 chars): ${result.substring(0, 100)}...`);

                // Try different regex patterns to match the response
                let match = null;

                // First try the standard pattern
                const aiResponseRegex1 = /Project Assistant: ([\s\S]*?)(?:(?:\n\[EVENT])|$)/;
                match = result.match(aiResponseRegex1);

                // If that fails, try a more relaxed pattern
                if (!match || !match[1]) {
                  const aiResponseRegex2 = /(?:Project Assistant:|Assistant:)\s*([\s\S]*?)(?:(?:\n[A-Z])|$)/;
                  match = result.match(aiResponseRegex2);
                }

                // If that still fails, try to extract anything after 'Thinking...'
                if (!match || !match[1]) {
                  const aiResponseRegex3 = /Thinking\.\.\.\s*([\s\S]*?)(?:$)/;
                  match = result.match(aiResponseRegex3);
                }

                if (match && match[1]) {
                  aiResponse = match[1].trim();
                  utility.debugLog(`Successfully extracted response: ${aiResponse.substring(0, 50)}...`);
                } else {
                  // Fall back to the raw result if regex doesn't match, but clean it first
                  const cleanedResult = result
                    .split('\n')
                    .filter(line => !line.includes('[DEBUG]') && !line.startsWith('DEBUG:'))
                    .join('\n')
                    .trim();

                  aiResponse = cleanedResult || result.trim();
                  utility.debugLog('Could not extract response with regex, using cleaned output');
                }

                // Commenting out memory updates as ChatHandler doesn't expose addMemoryItem method
                // Memory is maintained by the subprocess, so this is not essential for basic functionality
                // If memory persistence across sessions is needed, we would need to enhance ChatHandler
                // to expose proper memory management methods
                /*
                // Disabled memory updates
                try {
                  // Future implementation would go here
                  utility.debugLog('Memory updates disabled in interactive mode');
                } catch (memoryError) {
                  utility.debugLog(`Error updating chat memory: ${memoryError.message}`);
                }
                */
              } catch (execError) {
                // Detailed error logging to help diagnose subprocess issues
                utility.debugLog(`Subprocess execution failed: ${execError.message}`);
                if (execError.stdout) utility.debugLog(`Subprocess stdout: ${execError.stdout}`);
                if (execError.stderr) utility.debugLog(`Subprocess stderr: ${execError.stderr}`);
                aiResponse = `Error: ${execError.message}`;
              }

              // Filter out any remaining DEBUG lines and clean up HTML/markdown artifacts from the response
              let filteredResponse = aiResponse
                .split('\n')
                .filter(line => !line.includes('[DEBUG]') && !line.match(/^DEBUG:/))
                .join('\n');

              // Remove HTML doctype and common markup if present
              filteredResponse = filteredResponse
                .replace(/<!DOCTYPE\s+HTML>|<\/?html>|<\/?head>|<\/?body>|<\/?title>.*?<\/title>/gi, '')
                .replace(/<h1>Kanban Board<\/h1>/gi, '');

              // Remove AI interaction task references
              filteredResponse = filteredResponse
                .replace(/ai-(?:request|response)-interaction-at-[\w-\.]+/g, '[system task]')
                .replace(/AI (?:request|response) interaction at [\w-\.:]+/g, '[system task]');

              // Clear the thinking message and display response
              process.stdout.write('\r' + ' '.repeat(80) + '\r');
              // For interactive mode, keep the prefix for context
              console.log(`${colors.yellow}Project Assistant: ${colors.reset}${filteredResponse}`);
            } catch (execError) {
              console.error('Error with message-based approach:', execError.message);
              console.log(`${colors.yellow}Project Assistant: ${colors.reset}I'm sorry, there was an error processing your message.`);
            }
          } catch (inputError) {
            console.error('Error with user input:', inputError.message);
            console.log(`${colors.yellow}Project Assistant: ${colors.reset}There was an error processing your input. Please try again.`);
          }
        }

        rl.close();
        return 'Chat session ended';
      } catch (error) {
        console.error('Error in interactive chat:', error.message);
        return `Error in chat: ${error.message}. Try using the --message flag instead.`;
      }
    } else if (args.message) {
      // Handle single message chat

      // Check if we have a serialized context from a parent process
      let parentContext = null;
      const contextVar = 'KANBN_SERIALIZED_CONTEXT';

      if (process.env[contextVar]) {
        try {
          utility.debugLog('Found serialized context from parent process');
          parentContext = ContextSerializer.deserialize(process.env[contextVar]);

          // Validate the deserialized context
          const validationResult = ContextSerializer.validate(parentContext);
          if (!validationResult.valid) {
            utility.debugLog(`Context validation errors: ${validationResult.errors.join(', ')}`);
          } else {
            utility.debugLog('Context validation successful');
          }
        } catch (err) {
          utility.debugLog(`Error deserializing context: ${err.message}`);
        }
      }

      const response = await handleChatMessage({
        kanbn,
        boardFolder,
        message: args.message,
        parentContext: parentContext,
        conversationId: args.conversationId,
        args: args // Pass the full args object
      });

      if (response) {
        // Display response without the prefix for a more natural CLI experience
        // This makes the output feel more like a direct answer rather than a chat interface

        // Fix for duplicate responses
        // First, check if the response is duplicated
        const halfLength = Math.floor(response.length / 2);
        const firstHalf = response.substring(0, halfLength).trim();
        const secondHalf = response.substring(halfLength).trim();

        // If the first half and second half are very similar, only show the first half
        if (firstHalf.length > 20 && secondHalf.startsWith(firstHalf.substring(0, Math.min(50, firstHalf.length)))) {
          utility.debugLog('Detected duplicate response, showing only first half');
          const responseToShow = firstHalf;
          response = responseToShow;
        }

        // REMOVED: Direct console.log to avoid duplicate output
        // Let the top-level index.js handle printing the result exactly once
      }

      return response || 'No response from chat handler';
    } else {
      // Show help
      utility.info(`
${chalk.blue.bold('Kanbn Chat Commands')}\n
- ${chalk.yellow('kanbn chat')} - Start interactive chat session
- ${chalk.yellow('kanbn chat --message "Your message"')} - Send a single message
- ${chalk.yellow('kanbn chat --help')} - Show this help message

Required Environment Variables (one of):
- ${chalk.yellow('OPENROUTER_API_KEY')} - Your OpenRouter API key (get one at https://openrouter.ai)
- Install and run Ollama (https://ollama.com) as a local fallback

Optional Environment Variables:
- ${chalk.yellow('OPENROUTER_MODEL')} - The model to use (default: openai/gpt-3.5-turbo)
- ${chalk.yellow('OLLAMA_MODEL')} - The Ollama model to use (default: llama3)
- ${chalk.yellow('OLLAMA_URL')} - The Ollama API URL (default: http://localhost:11434)
`);
      return 'Chat help displayed';
    }
  } catch (error) {
    utility.error('Error in chat command:');
    utility.error(error.message);
    console.error('Error stack trace:', error.stack);

    // More detailed error output for debugging
    if (process.env.DEBUG === 'true') {
      console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    }

    return 'Error: ' + error.message;
  }
};
