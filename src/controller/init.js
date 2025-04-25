const kanbn_module = require('../main');
const kanbn = kanbn_module();
const utility = require('../utility');
const inquirer = require('inquirer');
const path = require('path');
const fs = require('fs');
const ChatHandler = require('../lib/chat-handler');
const MemoryManager = require('../lib/memory-manager');
const PromptLoader = require('../lib/prompt-loader');
const OpenRouterClient = require('../lib/openrouter-client');
const openRouterConfig = require('../config/openrouter');
const eventBus = require('../lib/event-bus');

// Use a simple color function since chalk v5+ is ESM-only
const chalk = {
  yellow: (text) => `\u001b[33m${text}\u001b[0m`,
  blue: (text) => `\u001b[34m${text}\u001b[0m`,
  green: (text) => `\u001b[32m${text}\u001b[0m`,
  gray: (text) => `\u001b[90m${text}\u001b[0m`,
  red: (text) => `\u001b[31m${text}\u001b[0m`
};
chalk.blue.bold = (text) => `\u001b[1;34m${text}\u001b[0m`;

inquirer.registerPrompt('recursive', require('inquirer-recursive'));

/**
 * Initialise kanbn interactively
 * @param {object} options
 * @param {boolean} initialised
 * @return {Promise<any>}
 */
async function interactive(options, initialised) {
  const columnNames = [];
  return await inquirer
  .prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Project name:',
      default: options.name || '',
      validate: value => {
        if (!value) {
          return 'Project name cannot be empty';
        }
        return true;
      }
    },
    {
      type: 'confirm',
      name: 'setDescription',
      message: initialised ? 'Edit the project description?' : 'Add a project description?'
    },
    {
      type: 'editor',
      name: 'description',
      message: 'Project description:',
      default: options.description || '',
      when: answers => answers.setDescription
    },
    {
      type: 'recursive',
      initialMessage: 'Add a column?',
      message: 'Add another column?',
      name: 'columns',
      when: () => !initialised,
      prompts: [
        {
          type: 'input',
          name: 'columnName',
          message: 'Column name:',
          validate: value => {
            if (value.length === 0) {
              return 'Column name cannot be empty';
            }
            if (
              (options.columns || []).indexOf(value) !== -1 ||
              columnNames.indexOf(value) !== -1
            ) {
              return 'Column name already exists';
            }
            columnNames.push(value);
            return true;
          }
        }
      ]
    }
  ]);
}

/**
 * Initialise kanbn
 * @param {object} options
 * @param {boolean} initialised
 */
async function initialise(options, initialised) {
  const mainFolder = await kanbn.getMainFolder();
  kanbn.initialise(options)
  .then(() => {
    if (initialised) {
      console.log(`Reinitialised existing kanbn board in ${mainFolder}`);
    } else {
      console.log(`Initialised empty kanbn board in ${mainFolder}`);
    }
  })
  .catch(error => {
    utility.error(error);
  });
}

/**
 * Call OpenRouter API for AI-powered initialization
 * @param {string} message The message to send to the API
 * @param {Object} context The context to include in the message
 * @param {string} apiKey The API key to use
 * @param {string} model The model to use
 * @param {string} promptName The name of the prompt to use
 * @param {PromptLoader} promptLoader The prompt loader instance
 * @param {MemoryManager} memoryManager The memory manager instance
 * @returns {Promise<string>} The API response
 */
async function callOpenRouterAPI(message, context, apiKey, model, promptName, promptLoader, memoryManager) {
  try {
    // Create a new OpenRouter client
    const client = new OpenRouterClient(apiKey, model);

    // Load the prompt
    let promptContent = '';
    if (promptLoader && promptName) {
      try {
        promptContent = await promptLoader.loadPrompt(promptName);
      } catch (error) {
        console.error(`Error loading prompt ${promptName}:`, error);
      }
    }

    // Get conversation history
    const history = memoryManager ? memoryManager.getConversationHistory('init') : [];

    // Check if we're in a test environment or CI environment
    if (process.env.KANBN_ENV === 'test' || process.env.CI === 'true') {
      console.log('Skipping actual API call for testing or CI environment...');

      // Create mock response based on the prompt name
      let mockResponse = {
        role: 'assistant',
        content: ''
      };

      // First, check if we already have a board structure to work with
      let existingColumns = [];
      let hasBoardStructure = false;
      
      // Try to get existing board structure from the message or context
      try {
        if (context && context.columns && context.columns.length > 0) {
          existingColumns = context.columns;
          hasBoardStructure = true;
        }
      } catch (err) {
        console.log('Error getting existing board structure:', err);
      }
      
      switch (promptName) {
        case 'project-type':
          if (hasBoardStructure) {
            // If we already have columns, acknowledge them and focus on tasks
            mockResponse.content = `I see you already have a board with the following columns: ${existingColumns.join(', ')}.

This existing structure is suitable for your project and ready to use. I recommend focusing on creating task content rather than modifying the board structure.

Would you like me to suggest some initial tasks that would be appropriate for your project?`;
          } else {
            // Otherwise provide a default recommendation
            mockResponse.content = `Based on your project description, I recommend a Software Development project type with the following columns:

- Backlog
- To Do
- In Progress
- Review
- Done

This structure follows a standard software development workflow and will help you track tasks from initial ideas through completion.`;
          }
          break;
        case 'class-of-service':
          mockResponse.content = `For your project, I recommend the following Classes of Service:

1. Standard - Normal work items
2. Expedite - High priority items that should be worked on first
3. Fixed Date - Items with a specific deadline
4. Intangible - Technical debt or learning tasks

You can implement these using tags in your tasks.`;
          break;
        case 'timebox-strategy':
          mockResponse.content = `I recommend using 2-week sprints for your project. This provides a good balance between having enough time to complete meaningful work while still maintaining regular feedback cycles.`;
          break;
        case 'initial-tasks':
          mockResponse.content = `Here are some initial tasks to get you started:

1. Project Setup - Set up the development environment
2. Requirements Gathering - Document the project requirements
3. Architecture Design - Create the high-level architecture
4. Sprint Planning - Plan the first sprint
5. Documentation - Set up project documentation`;
          break;
        default:
          mockResponse.content = `This is a mock response for the ${promptName} prompt in test mode.`;
      }

      // Add the message and response to history if memory manager exists
      if (memoryManager) {
        await memoryManager.addMessage('user', message, 'init');
        await memoryManager.addMessage('assistant', mockResponse.content, 'init');
      }

      return mockResponse.content;
    }

    // Prepare system message with the prompt content
    const systemMessage = {
      role: 'system',
      content: promptContent || 'You are a project management assistant helping to initialize a new Kanbn board.'
    };

    // Log the system prompt being used
    console.log(chalk.gray('System prompt:'));
    console.log(chalk.gray(systemMessage.content.substring(0, 200) + (systemMessage.content.length > 200 ? '...' : '')));

    // Prepare messages array with system prompt, context, and history
    const messages = [
      systemMessage,
      ...history,
      {
        role: 'user',
        content: message
      }
    ];

    // Use the client to make the API call
    console.log('Calling OpenRouter API...');
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
      console.log('\nOpenRouter API call completed successfully.');
    } catch (error) {
      console.error('Error in client.chatCompletion:', error);
      throw error;
    }

    // Add the message and response to history if memory manager exists
    if (memoryManager) {
      await memoryManager.addMessage('user', message, 'init');
      await memoryManager.addMessage('assistant', fullContent, 'init');
    }

    return fullContent;
  } catch (error) {
    console.error('Error in OpenRouter API:', error);
    return `I'm having trouble with the project assistant. ${error.message}`;
  }
}

/**
 * AI-powered initialization
 * @param {Object} options Initial options
 * @param {boolean} initialised Whether Kanbn is already initialised
 * @param {Object} args Command line arguments
 */
async function aiInit(options, initialised, args) {
  try {
    console.log(chalk.blue.bold('\n📊 Kanbn AI-Powered Initialization 📊\n'));

    // Get the main folder
    const mainFolder = await kanbn.getMainFolder();

    // Create memory manager and prompt loader
    const memoryManager = new MemoryManager(mainFolder);
    await memoryManager.loadMemory();
    await memoryManager.startNewConversation('init');

    const promptLoader = new PromptLoader(mainFolder);

    // Create chat handler
    const chatHandler = new ChatHandler(kanbn, memoryManager, promptLoader);
    await chatHandler.initializeForInit(mainFolder);

    // Get API key and model from args
    const apiKey = openRouterConfig.getApiKey(args['api-key']);
    const model = openRouterConfig.getModel(args['model']);

    // Show model information if available
    console.log(`${chalk.gray('Using model:')} ${model}\n`);

    // List available prompts
    const prompts = await promptLoader.listPrompts();
    if (prompts.length > 0) {
      console.log(chalk.gray('Available prompts:'));
      prompts.forEach(prompt => {
        console.log(chalk.gray(`- ${prompt}`));
      });
      console.log('');
    }

    // Step 1: Get project name and description
    let projectName = options.name;
    let projectDescription = options.description;

    if (!projectName) {
      const nameAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Project name:',
          validate: value => {
            if (!value) {
              return 'Project name cannot be empty';
            }
            return true;
          }
        }
      ]);
      projectName = nameAnswer.name;
    }

    // Only prompt for a description if one wasn't provided through options or args
    // This allows bootstrap scripts to provide descriptions non-interactively
    if (!projectDescription) {
      // Check if we're in a non-interactive environment
      if (process.env.KANBN_ENV === 'test' || process.env.CI === 'true') {
        console.log(chalk.gray('Skipping project description prompt in non-interactive mode'));
        projectDescription = 'Auto-generated project description';
      } else {
        const descAnswer = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'setDescription',
            message: 'Add a project description?',
            default: true
          },
          {
            type: 'editor',
            name: 'description',
            message: 'Project description:',
            when: answers => answers.setDescription
          }
        ]);

        if (descAnswer.setDescription) {
          projectDescription = descAnswer.description;
        }
      }
    } else {
      console.log(chalk.green('Using provided project description'));
    }

    // Update options with project name and description
    options.name = projectName;
    options.description = projectDescription || '';

    // Step 2: Detect project type and suggest columns
    console.log(chalk.blue('\n📋 Detecting Project Type...\n'));

    // Check if this is an existing repository
    let isExistingRepo = false;
    let repoInfo = '';

    try {
      // Check if .git directory exists
      if (fs.existsSync(path.join(mainFolder, '.git'))) {
        isExistingRepo = true;
        console.log(chalk.green('Detected existing Git repository...'));

        // Try to get repository information
        try {
          // Get repository name from package.json if it exists
          if (fs.existsSync(path.join(mainFolder, 'package.json'))) {
            const packageJson = JSON.parse(fs.readFileSync(path.join(mainFolder, 'package.json'), 'utf8'));
            if (packageJson.name) {
              repoInfo += `Repository name from package.json: ${packageJson.name}\n`;
            }
            if (packageJson.description) {
              repoInfo += `Repository description: ${packageJson.description}\n`;
            }
          }

          // Get list of top-level directories
          const dirs = fs.readdirSync(mainFolder, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
            .map(dirent => dirent.name);

          if (dirs.length > 0) {
            repoInfo += `Top-level directories: ${dirs.join(', ')}\n`;
          }

          // Get list of top-level files with extensions
          const files = fs.readdirSync(mainFolder, { withFileTypes: true })
            .filter(dirent => dirent.isFile() && !dirent.name.startsWith('.'))
            .map(dirent => dirent.name);

          if (files.length > 0) {
            repoInfo += `Top-level files: ${files.join(', ')}\n`;
          }

          console.log(chalk.gray('Repository information:'));
          console.log(chalk.gray(repoInfo));
        } catch (error) {
          console.error('Error getting repository information:', error);
        }
      }
    } catch (error) {
      console.error('Error checking for Git repository:', error);
    }

    // Check if a custom message was provided
    let userPrompt;
    if (args.message) {
      userPrompt = args.message;
      console.log(chalk.green('Using custom message for project type detection...'));

      // If this is an existing repository, add repository information to the prompt
      if (isExistingRepo && repoInfo) {
        userPrompt = `${userPrompt}\n\nThis is an existing repository with the following information:\n${repoInfo}`;
      }
    } else {
      // Create a default user prompt based on the project name and description
      userPrompt = `Project Name: ${projectName}\nProject Description: ${projectDescription || 'No description provided'}`;

      // If this is an existing repository, add repository information to the prompt
      if (isExistingRepo && repoInfo) {
        userPrompt += `\n\nThis is an existing repository with the following information:\n${repoInfo}`;
      }

      userPrompt += `\n\nBased on this information, what type of project is this and what columns would you recommend for the Kanbn board?`;
      console.log(chalk.green('Analyzing project information...'));
    }

    // Show which prompt is being used
    const promptName = 'project-type';
    console.log(chalk.gray(`Using prompt: ${promptName}`));

    // Log the user prompt
    console.log(chalk.gray('User prompt:'));
    console.log(chalk.gray(userPrompt));

    const projectTypeResponse = await callOpenRouterAPI(
      userPrompt,
      { projectName, projectDescription },
      apiKey,
      model,
      promptName,
      promptLoader,
      memoryManager
    );

    console.log(chalk.yellow('\nProject Assistant: ') + projectTypeResponse);

    // Extract recommended columns from the response
    let recommendedColumns = [];
    const columnMatch = projectTypeResponse.match(/columns?:([^\n]+)/i) ||
                       projectTypeResponse.match(/recommend(?:ed)? columns?:([^\n]+)/i) ||
                       projectTypeResponse.match(/- ([^\n-]+)\n- ([^\n-]+)\n- ([^\n-]+)/i);

    if (columnMatch) {
      const columnsText = columnMatch[1] || projectTypeResponse;
      recommendedColumns = columnsText
        .split(/[,\n-]/) // Split by commas, newlines, or hyphens
        .map(col => col.trim())
        .filter(col => col.length > 0 && !col.match(/^(columns?|recommend)/i));
    }

    // If no columns were extracted, use default columns
    if (recommendedColumns.length === 0) {
      recommendedColumns = ['Backlog', 'To Do', 'In Progress', 'Done'];
    }

    // In test mode, use the provided columns or recommended columns
    if (process.env.KANBN_ENV === 'test') {
      if (!options.columns || options.columns.length === 0) {
        console.log('Test mode: Using recommended columns');
        options.columns = recommendedColumns;
      } else {
        console.log(`Test mode: Using provided columns: ${options.columns.join(', ')}`);
      }
    } else {
      // Ask user to confirm or modify columns
      const columnConfirm = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'useRecommended',
          message: `Use recommended columns: ${recommendedColumns.join(', ')}?`,
          default: true
        },
        {
          type: 'editor',
          name: 'customColumns',
          message: 'Enter custom columns (one per line):',
          default: recommendedColumns.join('\n'),
          when: answers => !answers.useRecommended
        }
      ]);

      if (columnConfirm.useRecommended) {
        options.columns = recommendedColumns;
      } else {
        options.columns = columnConfirm.customColumns
          .split('\n')
          .map(col => col.trim())
          .filter(col => col.length > 0);
      }
    }

    // Step 3: Initialize the board
    console.log(chalk.blue('\n🚀 Initializing Kanbn Board...\n'));

    try {
      await kanbn.initialise(options);
      console.log(chalk.green(`${initialised ? 'Reinitialised' : 'Initialised'} Kanbn board in ${mainFolder} with ${options.columns.length} columns`));
    } catch (error) {
      console.error(chalk.red('Error initializing Kanbn board:'), error);
      return;
    }

    // Step 4: Ask if user wants to create initial tasks
    let createTasks = true;

    // In test mode, always create tasks
    if (process.env.KANBN_ENV !== 'test') {
      const createTasksConfirm = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'createTasks',
          message: 'Would you like to create some initial tasks?',
          default: true
        }
      ]);
      createTasks = createTasksConfirm.createTasks;
    } else {
      console.log('Test mode: Automatically creating initial tasks');
    }

    if (createTasks) {
      console.log(chalk.blue('\n📝 Suggesting Initial Tasks...\n'));

      // Check if a custom message was provided for tasks
      let userTasksPrompt;
      if (args.message) {
        userTasksPrompt = args.message;
        console.log(chalk.green('Using custom message for task suggestions...'));

        // Add columns information to the prompt
        userTasksPrompt += `\n\nThe board has the following columns: ${options.columns.join(', ')}`;

        // If this is an existing repository, add repository information to the prompt
        if (isExistingRepo && repoInfo) {
          userTasksPrompt += `\n\nThis is an existing repository with the following information:\n${repoInfo}`;
        }

        userTasksPrompt += `\n\nPlease suggest 5-7 initial tasks for this project.`;
      } else {
        // Create a default user prompt for task suggestions
        userTasksPrompt = `Project Name: ${projectName}\nProject Description: ${projectDescription || 'No description provided'}\nColumns: ${options.columns.join(', ')}`;

        // If this is an existing repository, add repository information to the prompt
        if (isExistingRepo && repoInfo) {
          userTasksPrompt += `\n\nThis is an existing repository with the following information:\n${repoInfo}`;
        }

        userTasksPrompt += `\n\nPlease suggest 5-7 initial tasks for this project.`;
        console.log(chalk.green('Generating task suggestions...'));
      }

      // Show which prompt is being used
      const tasksPromptName = 'initial-tasks';
      console.log(chalk.gray(`Using prompt: ${tasksPromptName}`));

      // Log the user prompt
      console.log(chalk.gray('User prompt:'));
      console.log(chalk.gray(userTasksPrompt));

      const tasksResponse = await callOpenRouterAPI(
        userTasksPrompt,
        { projectName, projectDescription, columns: options.columns },
        apiKey,
        model,
        tasksPromptName,
        promptLoader,
        memoryManager
      );

      console.log(chalk.yellow('\nProject Assistant: ') + tasksResponse);

      // Extract tasks from the response
      const taskLines = tasksResponse.split('\n')
        .filter(line => line.match(/^\d+\.\s+|^-\s+|^•\s+/)) // Lines starting with numbers, hyphens, or bullets
        .map(line => line.replace(/^\d+\.\s+|^-\s+|^•\s+/, '').trim()); // Remove the prefix

      if (taskLines.length > 0) {
        for (const taskLine of taskLines) {
          // Extract task name (everything up to the first dash or colon)
          const taskNameMatch = taskLine.match(/^([^:-]+)(?:[-:]|$)/);
          const taskName = taskNameMatch ? taskNameMatch[1].trim() : taskLine;

          // Extract description (everything after the first dash or colon)
          const taskDescMatch = taskLine.match(/(?:[-:])\s*(.+)$/);
          const taskDescription = taskDescMatch ? taskDescMatch[1].trim() : '';

          // Create the task
          const taskData = {
            name: taskName,
            description: taskDescription,
            metadata: {
              created: new Date(),
              tags: ['ai-generated']
            }
          };

          try {
            // Use the first column as default
            const column = options.columns[0] || 'Backlog';
            const taskId = await kanbn.createTask(taskData, column);
            console.log(chalk.green(`Created task: ${taskName} in ${column}`));

            // Emit event
            eventBus.emit('taskCreated', {
              taskId,
              column,
              taskData,
              source: 'init'
            });
          } catch (error) {
            console.error(chalk.red(`Error creating task ${taskName}:`), error);
          }
        }
      } else {
        console.log(chalk.red('No tasks could be extracted from the AI response.'));
      }
    }

    console.log(chalk.blue.bold('\n✅ Initialization Complete!\n'));
    console.log(`Run ${chalk.green('kanbn board')} to see your new board.`);
    console.log(`Run ${chalk.green('kanbn chat')} to chat with your project assistant.\n`);

  } catch (error) {
    console.error(chalk.red('Error in AI initialization:'), error);
  }
}

module.exports = async args => {
  let options = {};

  // If --help or -h is provided, show detailed help
  if (args.help || args.h) {
    console.log(chalk.blue.bold('\n📊 Kanbn Initialization Options 📊\n'));
    console.log('Basic Options:');
    console.log(`  ${chalk.green('--name, -n')}             Project name`);
    console.log(`  ${chalk.green('--description, -d')}      Project description`);
    console.log(`  ${chalk.green('--column, -c')}           Columns (can be specified multiple times)`);
    console.log(`  ${chalk.green('--interactive, -i')}      Interactive initialization`);

    console.log('\nAI-Powered Initialization:');
    console.log(`  ${chalk.green('--ai, -a')}               Use AI to help initialize the project`);
    console.log(`  ${chalk.green('--api-key, -k')}          OpenRouter API key (overrides environment variable)`);
    console.log(`  ${chalk.green('--model, -mod')}          AI model to use (defaults to google/gemma-3-4b-it:free)`);

    console.log('\nAvailable Prompts:');

    // Create a temporary prompt loader to list available prompts
    try {
      const mainFolder = await kanbn.getMainFolder();
      const promptLoader = new PromptLoader(mainFolder);
      const prompts = await promptLoader.listPrompts();

      if (prompts.length > 0) {
        prompts.forEach(prompt => {
          console.log(`  - ${chalk.yellow(prompt)}`);
        });
      } else {
        console.log('  No custom prompts found. Default prompts will be used.');
      }
    } catch (error) {
      console.log('  Error listing prompts:', error.message);
    }

    console.log('\nExamples:');
    console.log(`  ${chalk.gray('kanbn init --name "My Project" --description "A project for tracking tasks"')}`);
    console.log(`  ${chalk.gray('kanbn init --interactive')}`);
    console.log(`  ${chalk.gray('kanbn init --ai --name "Web Development" --description "A project for developing a website"')}`);

    return;
  }

  // If this folder is already initialised, set the default name and description using the current values
  const initialised = await kanbn.initialised();
  if (initialised) {
    try {
      const index = await kanbn.getIndex();
      options.name = index.name;
      options.description = index.description;
      options.columns = Object.keys(index.columns);
    } catch (error) {
      utility.error(error);
      return;
    }
  }

  // Check for arguments and override the defaults if present
  // Project name
  if (args.name) {
    options.name = utility.strArg(args.name);
  }

  // Project description
  if (args.description) {
    options.description = utility.strArg(args.description);
  }

  // Columns
  if (args.column) {
    options.columns = utility.arrayArg(args.column);
  }

  // AI-powered initialization
  if (args.ai) {
    await aiInit(options, initialised, args);
  }
  // Interactive initialization
  else if (args.interactive) {
    interactive(options, initialised)
    .then(async (answers) => {
      if ('columns' in answers) {
        answers.columns = answers.columns.map(column => column.columnName);
      }
      await initialise(answers, initialised);
    })
    .catch(error => {
      utility.error(error);
    });
  // Non-interactive initialization
  } else {
    await initialise(options, initialised);
  }
};
