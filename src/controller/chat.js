const { Kanbn } = require('../main');
const utility = require('../utility');
const inquirer = require('inquirer');
const axios = require('axios');
const chalk = require('chalk');
const getGitUsername = require('git-user-name');

const kanbn = new Kanbn();

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

    console.log('Skipping actual API call for testing...');
    const mockResponse = `I'm a project management assistant for your Kanbn board.
    
Your project "${projectContext.projectName}" has ${projectContext.taskCount} tasks across ${projectContext.columns.length} columns.
    
Based on your project data, here's a summary:
- Project name: ${projectContext.projectName}
- Project description: ${projectContext.projectDescription}
- Tasks: ${projectContext.taskCount}
- Columns: ${projectContext.columns.join(', ')}
    
How can I help you manage your project today?`;
    
    console.log('Logging AI interaction...');
    await logAIInteraction('chat', message, mockResponse);
    
    return mockResponse;
  } catch (error) {
    console.error('Error in mock OpenRouter API:', error);
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
    
    await kanbn.createTask(taskData, null, true);
    
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
    const index = await kanbn.getIndex();
    const tasks = await kanbn.loadAllTrackedTasks();
    const status = await kanbn.status(false, false, false, null, null);
    
    return {
      projectName: index.name,
      projectDescription: index.description,
      columns: Object.keys(index.columns),
      taskCount: tasks.length,
      tasksByColumn: Object.keys(index.columns).reduce((acc, column) => {
        acc[column] = tasks.filter(task => 
          kanbn.findTaskColumn(task.id) === column
        ).length;
        return acc;
      }, {}),
      tags: [...new Set(tasks.flatMap(task => 
        task.metadata.tags || []
      ))],
      statistics: status
    };
  } catch (error) {
    console.error('Error getting project context:', error.message);
    return {
      error: error.message
    };
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
    try {
      if (!(await kanbn.initialised())) {
        utility.error('Kanbn has not been initialised in this folder\nTry running: {b}kanbn init{b}');
        return;
      }
    } catch (error) {
      utility.error('Kanbn has not been initialised in this folder\nTry running: {b}kanbn init{b}');
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
