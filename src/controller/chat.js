const kanbnModule = require('../main');
const utility = require('../utility');
const inquirer = require('inquirer');
const eventBus = require('../lib/event-bus');
const ChatHandler = require('../lib/chat-handler');
const OpenRouterClient = require('../lib/openrouter-client');
const openRouterConfig = require('../config/openrouter');

// Use a simple color function since chalk v5+ is ESM-only
const chalk = {
  yellow: (text) => `\u001b[33m${text}\u001b[0m`,
  blue: (text) => `\u001b[34m${text}\u001b[0m`,
  green: (text) => `\u001b[32m${text}\u001b[0m`,
  gray: (text) => `\u001b[90m${text}\u001b[0m`
};
chalk.blue.bold = (text) => `\u001b[1;34m${text}\u001b[0m`;
const getGitUsername = require('git-user-name');

/**
 * Call OpenRouter API for project chat
 * @param {string} message User message
 * @param {Object} projectContext Project context information
 * @param {string|null} apiKeyOverride Optional API key override
 * @param {string|null} modelOverride Optional model override
 * @return {Promise<string>} AI response
 */
async function callOpenRouterAPI(message, projectContext, apiKeyOverride = null, modelOverride = null) {
  try {
    console.log('Starting OpenRouter API call...');

    // Debug logging
    if (process.env.DEBUG === 'true') {
      console.log('DEBUG: callOpenRouterAPI function');
      console.log('DEBUG: apiKeyOverride:', apiKeyOverride ? `${apiKeyOverride.substring(0, 5)}... (${apiKeyOverride.length} chars)` : 'not set');
      console.log('DEBUG: modelOverride:', modelOverride || 'not set');
      console.log('DEBUG: process.env.OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? `${process.env.OPENROUTER_API_KEY.substring(0, 5)}... (${process.env.OPENROUTER_API_KEY.length} chars)` : 'not set');
    }

    // Create a new OpenRouter client
    const client = new OpenRouterClient(apiKeyOverride, modelOverride);

    // Handle undefined project context
    const safeContext = projectContext || {
      projectName: 'Unnamed Project',
      projectDescription: 'No description available',
      taskCount: 0,
      columns: ['Backlog'],
      tags: []
    };

    // Ensure columns is an array with at least a Backlog column
    if (!safeContext.columns || safeContext.columns.length === 0) {
      safeContext.columns = ['Backlog'];
    }

    // Check if we're in a test environment or CI environment
    if (process.env.KANBN_ENV === 'test' || process.env.CI === 'true') {
      console.log('Skipping actual API call for testing or CI environment...');

      // Load conversation history
      const history = global.chatHistory || [];

      // Create mock response
      const mockResponse = {
        role: 'assistant',
        content: `I'm a project management assistant for your Kanbn board.

Your project "${safeContext.projectName}" has ${safeContext.taskCount} tasks${safeContext.columns.length > 0 ? ` across ${safeContext.columns.length} columns` : ''}.

Based on your project data, here's a summary:
- Project name: ${safeContext.projectName}
- Project description: ${safeContext.projectDescription}
- Tasks: ${safeContext.taskCount}
- Columns: ${safeContext.columns.length > 0 ? safeContext.columns.join(', ') : 'None'}

How can I help you manage your project today?`
      };

      // Update conversation history
      global.chatHistory = [
        ...history,
        { role: 'user', content: message },
        mockResponse
      ];

      console.log('Logging AI interaction...');
      await logAIInteraction('chat', message, mockResponse.content);

      return mockResponse.content;
    }

    // Load conversation history with size limit
    const MAX_HISTORY = 20;
    const history = (global.chatHistory || []).slice(-MAX_HISTORY);

    // Prepare messages array with system prompt and history
    const messages = [
      {
        role: 'system',
        content: `You are a project management assistant for a Kanbn board.
        Here is the context of the project:
        Project name: ${safeContext.projectName}
        Project description: ${safeContext.projectDescription}
        Number of tasks: ${safeContext.taskCount}
        Columns: ${safeContext.columns.length > 0 ? safeContext.columns.join(', ') : 'None'}
        Tags used: ${safeContext.tags && safeContext.tags.length > 0 ? safeContext.tags.join(', ') : 'None'}
        ${safeContext.references ? `
References by task:
${Object.entries(safeContext.references).map(([taskId, refs]) => `- ${taskId}: ${refs.join(', ')}`).join('\n')}` : ''}

        Provide helpful, concise responses to help the user manage their project.`
      },
      ...history,
      {
        role: 'user',
        content: message
      }
    ];

    // Use the client to make the API call with streaming output to console
    console.log('About to call client.chatCompletion...');
    let fullContent;

    try {
      if (process.env.OPENROUTER_STREAM === 'false') {
        console.log('Using non-streaming API call...');
        fullContent = await client.chatCompletion(messages);
      } else {
        console.log('Using streaming API call...');
        fullContent = await client.chatCompletion(messages, (content) => {
          process.stdout.write(content);
        });
      }
      console.log('client.chatCompletion completed successfully.');
    } catch (error) {
      console.error('Error in client.chatCompletion:', error);
      throw error;
    }

    console.log(); // Add a newline at the end

    // Update conversation history
    global.chatHistory = [
      ...history,
      { role: 'user', content: message },
      { role: 'assistant', content: fullContent }
    ];

    console.log('Logging AI interaction...');
    await logAIInteraction('chat', message, fullContent);

    return fullContent;
  } catch (error) {
    console.error('Error in OpenRouter API:', error);
    return `I'm having trouble with the project assistant. ${error.message}`;
  }
}

/**
 * Log AI interaction for tracking
 * @param {string} type Type of interaction
 * @param {string} input User input
 * @param {string} output AI output
 */
async function logAIInteraction(type, input, output) {
  try {
    const kanbn = typeof kanbnModule === 'function' ? kanbnModule() : kanbnModule;
    const taskId = 'ai-interaction-' + Date.now();
    const username = getGitUsername() || 'unknown';
    const date = new Date();

    const taskData = {
      name: `AI ${type} interaction at ${date.toISOString()}`,
      description: `This is an automatically generated record of an AI interaction.`,
      metadata: {
        created: date,
        updated: date,
        tags: ['ai-interaction', type]
      },
      comments: [
        {
          author: username,
          date: date,
          text: `Input: ${input}\n\nOutput: ${output}`
        }
      ]
    };

    try {
      // Get the index to check if it has columns
      const index = await kanbn.getIndex();

      // Initialize index.columns if null or undefined
      if (!index) {
        console.log('Skipping AI interaction logging: Invalid index structure');
        return taskId;
      }

      if (!index.columns) {
        index.columns = { 'Backlog': [] };
        console.log('No columns defined, creating default Backlog column');
      } else if (Object.keys(index.columns).length === 0) {
        index.columns['Backlog'] = [];
        console.log('Empty columns object, creating default Backlog column');
      }

      const createdTaskId = await kanbn.createTask(taskData, 'Backlog', true);
      eventBus.emit('taskCreated', {
        taskId: createdTaskId,
        column: 'Backlog',
        taskData,
        source: 'chat'
      });
      eventBus.emit('contextUpdated', { taskId: createdTaskId, type: 'chat' });
      return createdTaskId;
    } catch (createError) {
      console.log('Skipping AI interaction logging:', createError.message);
      eventBus.emit('taskCreationFailed', { error: createError.message });
    }

    return taskId;
  } catch (error) {
    console.error('Error logging AI interaction:', error.message);
    return null;
  }
}

/**
 * Get project context for AI
 * @param {boolean} includeReferences Whether to include task references in the context
 * @return {Promise<Object>} Project context
 */
async function getProjectContext(includeReferences = false) {
  try {
    const kanbn = typeof kanbnModule === 'function' ? kanbnModule() : kanbnModule;
    const index = await kanbn.getIndex();
    const tasks = await kanbn.loadAllTrackedTasks();
    const status = await kanbn.status(false, false, false, null, null);

    const findTaskColumn = (index, taskId) => {
      for (const [column, tasks] of Object.entries(index.columns)) {
        if (tasks.includes(taskId)) {
          return column;
        }
      }
      return null;
    };

    if (!index) {
      console.error('Error getting project context: Invalid index structure');
      return null;
    }

    // Ensure index.columns exists with at least a Backlog column
    if (!index.columns) {
      index.columns = { 'Backlog': [] };
      console.log('No columns defined, creating default Backlog column');
    } else if (Object.keys(index.columns).length === 0) {
      index.columns['Backlog'] = [];
      console.log('Empty columns object, creating default Backlog column');
    }

    const projectContext = {
      projectName: index.name || 'Unnamed Project',
      projectDescription: index.description || 'No description available',
      columns: Object.keys(index.columns),
      taskCount: tasks ? tasks.length : 0,
      tasksByColumn: await Object.keys(index.columns).reduce(async (pAcc, column) => {
        const acc = await pAcc;
        if (tasks && tasks.length > 0) {
          const taskColumns = tasks.map(t => findTaskColumn(index, t.id));
          acc[column] = taskColumns.filter(c => c === column).length;
        } else {
          acc[column] = 0;
        }
        return acc;
      }, Promise.resolve({})),
      tags: tasks ? [...new Set(tasks.flatMap(task =>
        task.metadata && task.metadata.tags ? task.metadata.tags : []
      ))] : [],
      statistics: status || {}
    };

    // Include references if requested
    if (includeReferences && tasks && tasks.length > 0) {
      const referencesMap = {};
      for (const task of tasks) {
        if (task.metadata && task.metadata.references && task.metadata.references.length > 0) {
          referencesMap[task.id] = task.metadata.references;
        }
      }
      projectContext.references = referencesMap;
    }

    eventBus.emit('contextQueried', { context: projectContext });
    return projectContext;
  } catch (error) {
    console.error('Error getting project context:', error.message);
    return null;
  }
}

/**
 * Interactive chat mode
 * @param {Object} projectContext Project context
 * @param {ChatHandler} chatHandler Chat handler instance
 * @param {Object} args Command line arguments
 */
async function interactiveChat(projectContext, chatHandler, args) {
  console.log(chalk.blue.bold('\n📊 Kanbn Project Assistant 📊'));

  // Show model information if available
  const model = openRouterConfig.getModel(args['model']);
  console.log(`\u001b[90mUsing model: ${model}\u001b[0m`);

  console.log(chalk.gray('Type "exit" or "quit" to end the conversation\n'));

  let chatActive = true;

  while (chatActive) {
    try {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'message',
          message: chalk.green('You:')
        }
      ]);

      const message = answers.message.trim();

      if (message.toLowerCase() === 'exit' || message.toLowerCase() === 'quit') {
        console.log(chalk.blue('Project Assistant: Goodbye! Happy organizing!'));
        chatActive = false;
        continue;
      }

      console.log(chalk.yellow('Project Assistant: ') + chalk.gray('Thinking...'));

      let response;
      if (process.env.KANBN_ENV === 'test' || process.env.CI === 'true') {
        response = await chatHandler.handleMessage(message);
      } else {
        // Try direct command first
        try {
          console.log('Attempting to handle message with chat handler...');
          response = await chatHandler.handleMessage(message);
        } catch (error) {
          // Fall back to AI chat if command fails
          console.log('Chat handler failed, falling back to OpenRouter API:', error.message);
          // Get API key and model from args
          const apiKey = openRouterConfig.getApiKey(args['api-key']);
          const model = openRouterConfig.getModel(args['model']);

          response = await callOpenRouterAPI(message, projectContext, apiKey, model);
        }
      }

      process.stdout.write('\r[K');
      console.log(chalk.yellow('Project Assistant: ') + response + '\n');
    } catch (error) {
      console.error('Error in chat:', error.message);
      chatActive = false;
    }
  }
}

// Main export function
const chatController = async args => {
  try {
    // Create a Kanbn instance - handle both function and object shapes
    const kanbn = typeof kanbnModule === 'function' ? kanbnModule() : kanbnModule;

    try {
      if (!(await kanbn.initialised())) {
        utility.warning('Kanbn has not been initialised in this folder\nTry running: {b}kanbn init{b}');
        return;
      }
    } catch (error) {
      utility.warning('Kanbn has not been initialised in this folder\nTry running: {b}kanbn init{b}');
      return;
    }

    if (args.help) {
      utility.showHelp('chat');
      return;
    }

    try {
      const projectContext = await getProjectContext(args['with-refs']);
      const chatHandler = new ChatHandler(kanbn);

      if (args.message) {
        const message = utility.strArg(args.message);

        // Show model information if available
        const model = openRouterConfig.getModel(args['model']);
        console.log(`\u001b[90mUsing model: ${model}\u001b[0m`);

        let response;
        if (process.env.KANBN_ENV === 'test' || process.env.CI === 'true') {
          response = await chatHandler.handleMessage(message);
        } else {
          // Try direct command first
          // Get API key and model from args
          // Use the API key directly from args if available, otherwise use the environment variable
          const apiKey = args['api-key'] || process.env.OPENROUTER_API_KEY;
          const model = args['model'] || process.env.OPENROUTER_MODEL || 'google/gemma-3-4b-it:free';

          // Debug logging
          console.log('DEBUG: API key from args:', args['api-key'] ? `${args['api-key'].substring(0, 5)}... (${args['api-key'].length} chars)` : 'not set');
          console.log('DEBUG: API key being used:', apiKey ? `${apiKey.substring(0, 5)}... (${apiKey.length} chars)` : 'not set');
          console.log('DEBUG: Model from args:', args['model'] || 'not set');
          console.log('DEBUG: Model being used:', model);

          // Verify that we have an API key
          if (!apiKey) {
            console.error('ERROR: No API key available. Please set OPENROUTER_API_KEY environment variable or use --api-key option.');
            return 'Error: OpenRouter API key not found. Please set OPENROUTER_API_KEY environment variable or use --api-key option.';
          }

          // Set the API key in the environment for the OpenRouterClient to use
          process.env.OPENROUTER_API_KEY = apiKey;
          console.log('DEBUG: Set process.env.OPENROUTER_API_KEY to:', process.env.OPENROUTER_API_KEY.substring(0, 5) + '... (' + process.env.OPENROUTER_API_KEY.length + ' chars)');

          // Set the model in the environment for the OpenRouterClient to use
          process.env.OPENROUTER_MODEL = model;
          console.log('DEBUG: Set process.env.OPENROUTER_MODEL to:', process.env.OPENROUTER_MODEL);

          try {
            console.log('Attempting to handle message with chat handler...');
            response = await chatHandler.handleMessage(message);
          } catch (error) {
            // Fall back to AI chat if command fails
            console.log('Chat handler failed, falling back to OpenRouter API:', error.message);

            try {
              console.log('Attempting to call OpenRouter API...');

              // More detailed debug logging
              if (process.env.DEBUG === 'true') {
                console.log('DEBUG: projectContext:', JSON.stringify(projectContext, null, 2));
                console.log('DEBUG: message:', message);
                console.log('DEBUG: process.env.OPENROUTER_STREAM:', process.env.OPENROUTER_STREAM || 'not set');
              }

              // Force disable streaming for testing
              process.env.OPENROUTER_STREAM = 'false';

              response = await callOpenRouterAPI(message, projectContext, apiKey, model);
              console.log('OpenRouter API call completed successfully.');
            } catch (apiError) {
              console.error('Error calling OpenRouter API:', apiError);
              response = `I'm having trouble with the project assistant. ${apiError.message}`;
            }
          }
        }

        console.log(chalk.yellow('Project Assistant: ') + response);
        return response;
      } else {
        await interactiveChat(projectContext, chatHandler, args);
        return '';
      }
    } catch (error) {
      console.error('Error in chat command:', error);
      const errorMessage = 'Error processing chat command: ' + error.message;
      utility.error(errorMessage);
      return errorMessage;
    }
  } catch (error) {
    const errorMessage = 'Error in chat command: ' + error.message;
    utility.error(errorMessage);
    return errorMessage;
  }
};

// Export the main controller function
module.exports = chatController;

// Export internal functions for testing
if (process.env.KANBN_ENV === 'test') {
  module.exports.__callOpenRouterAPI = callOpenRouterAPI;
  module.exports.__logAIInteraction = logAIInteraction;
  module.exports.__getProjectContext = getProjectContext;
  module.exports.__interactiveChat = interactiveChat;
}
