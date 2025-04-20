const { Kanbn } = require('../main');
const utility = require('../utility');
const inquirer = require('inquirer');
const axios = require('axios');
const EventEmitter = require('events');

// Create global event bus
const eventBus = new EventEmitter();

// Export event bus for testing
module.exports.eventBus = eventBus;
// Use a simple color function since chalk v5+ is ESM-only
const chalk = {
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`
};
chalk.blue.bold = (text) => `\x1b[1;34m${text}\x1b[0m`;
const getGitUsername = require('git-user-name');

// Create Kanbn instance when needed in each function

/**
 * Call OpenRouter API for project chat
 * @param {string} message User message
 * @param {Object} projectContext Project context information
 * @return {Promise<string>} AI response
 */
async function callOpenRouterAPI(message, projectContext) {
  try {
    console.log('Starting OpenRouter API call...');
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OpenRouter API key not found. Please set the OPENROUTER_API_KEY environment variable.');
    }
    console.log('API key found, length:', apiKey.length);

    // Use the model specified in the environment or default to a cost-effective option
    const model = process.env.OPENROUTER_MODEL || 'google/gemma-3-4b-it:free';
    console.log(`Using model: ${model}`);

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
      const mockResponse = `I'm a project management assistant for your Kanbn board.

Your project "${safeContext.projectName}" has ${safeContext.taskCount} tasks${safeContext.columns.length > 0 ? ` across ${safeContext.columns.length} columns` : ''}.

Based on your project data, here's a summary:
- Project name: ${safeContext.projectName}
- Project description: ${safeContext.projectDescription}
- Tasks: ${safeContext.taskCount}
- Columns: ${safeContext.columns.length > 0 ? safeContext.columns.join(', ') : 'None'}

How can I help you manage your project today?`;

      console.log('Logging AI interaction...');
      await logAIInteraction('chat', message, mockResponse);

      return mockResponse;
    }

    // Make the actual API call
    console.log('Making API call to OpenRouter...');
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: `You are a project management assistant for a Kanbn board.
            Here is the context of the project:
            Project name: ${safeContext.projectName}
            Project description: ${safeContext.projectDescription}
            Number of tasks: ${safeContext.taskCount}
            Columns: ${safeContext.columns.length > 0 ? safeContext.columns.join(', ') : 'None'}
            Tags used: ${safeContext.tags && safeContext.tags.length > 0 ? safeContext.tags.join(', ') : 'None'}

            Provide helpful, concise responses to help the user manage their project.`
          },
          {
            role: 'user',
            content: message
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://github.com/decision-crafters/kanbn',
          'X-Title': 'Kanbn Project Assistant'
        }
      }
    );

    const aiResponse = response.data.choices[0].message.content;
    console.log('Logging AI interaction...');
    await logAIInteraction('chat', message, aiResponse);

    return aiResponse;
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
    const kanbn = new Kanbn();
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
 * @return {Promise<Object>} Project context
 */
async function getProjectContext() {
  try {
    const kanbn = new Kanbn();
    const { findTaskColumn } = require('../main');
    const index = await kanbn.getIndex();
    const tasks = await kanbn.loadAllTrackedTasks();
    const status = await kanbn.status(false, false, false, null, null);

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

    const columns = Object.keys(index.columns);
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
 */
async function interactiveChat(projectContext) {
  console.log(chalk.blue.bold('\n📊 Kanbn Project Assistant 📊'));
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

      const response = await callOpenRouterAPI(message, projectContext);

      process.stdout.write('\r\x1b[K');

      console.log(chalk.yellow('Project Assistant: ') + response + '\n');
    } catch (error) {
      console.error('Error in chat:', error.message);
      chatActive = false;
    }
  }
}

module.exports = async args => {
  try {
    // Create a Kanbn instance
    const kanbn = new Kanbn();

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
      const projectContext = await getProjectContext();

      if (args.message) {
        const message = utility.strArg(args.message);
        const response = await callOpenRouterAPI(message, projectContext);
        console.log(chalk.yellow('Project Assistant: ') + response);
      } else {
        await interactiveChat(projectContext);
      }
    } catch (error) {
      console.error('Error in chat command:', error);
      utility.error('Error processing chat command: ' + error.message);
    }
  } catch (error) {
    utility.error('Error in chat command: ' + error.message);
  }
};
