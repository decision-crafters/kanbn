const Kanbn = require('../main');
const utility = require('../utility');
const inquirer = require('inquirer');
const fuzzy = require('fuzzy');
const { OpenRouterClient } = require('../ai');
const getGitUsername = require('git-user-name');
const AILogging = require('../lib/ai-logging');

inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

/**
 * Call OpenRouter API to decompose a task
 * @param {Object} kanbnInstance Kanbn instance
 * @param {string} description Task description to decompose
 * @param {Object} task The task object
 * @param {boolean} includeReferences Whether to include references in the context
 * @return {Promise<Array>} Array of subtasks
 */
async function callOpenRouterAPI(kanbnInstance, description, task, includeReferences = false) {
  try {
    // Check if we're in a test environment or CI environment
    if (process.env.KANBN_ENV === 'test' || process.env.CI === 'true') {
      console.log('Skipping actual API call for testing or CI environment...');
      // Return a simple mock decomposition
      const mockSubtasks = [
        { text: `Subtask 1 for: ${description.substring(0, 30)}...`, completed: false },
        { text: `Subtask 2 for: ${description.substring(0, 30)}...`, completed: false }
      ];

      // Log the interaction
      const aiLogging = new AILogging(kanbnInstance);
      await aiLogging.logInteraction(process.cwd(), 'request', {
        message: description,
        context: `You are a task decomposition assistant. Given a task description, break it down into smaller, actionable subtasks.`
      });

      await aiLogging.logInteraction(process.cwd(), 'response', {
        message: description,
        response: JSON.stringify({ subtasks: mockSubtasks })
      });

      return mockSubtasks;
    }

    // Get API key from environment or command line arguments
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OpenRouter API key not found. Please set the OPENROUTER_API_KEY environment variable.');
    }

    // Use the model specified in the environment or default to a cost-effective option
    const model = process.env.OPENROUTER_MODEL || 'google/gemma-3-4b-it:free';
    console.log(`Using model: ${model}`);

    // Create a system message with context
    const systemMessage = {
      role: 'system',
      content: `You are a task decomposition assistant. Given a task description, break it down into smaller, actionable subtasks.
      ${includeReferences && task.metadata && task.metadata.references && task.metadata.references.length > 0 ?
        `\nHere are references that might be helpful:\n${task.metadata.references.map(ref => `- ${ref}`).join('\n')}` : ''}`
    };

    // Log the interaction
    const aiLogging = new AILogging(kanbnInstance);
    await aiLogging.logInteraction(process.cwd(), 'request', {
      message: description,
      context: systemMessage.content
    });


    const client = new OpenRouterClient(apiKey, model);
    const content = await client.chat([
      systemMessage,
      {
        role: 'user',
        content: `Please decompose the following task into smaller, actionable subtasks:\n\n${description}`
      }
    ]);




    
    
    const parsedContent = JSON.parse(content);

    // Log the response
    await aiLogging.logInteraction(process.cwd(), 'response', {
      message: description,
      response: content
    });

    return parsedContent.subtasks || [];
  } catch (error) {
    console.error('Error calling OpenRouter API:', error.message);
    return fallbackDecomposition(description);
  }
}

/**
 * Fallback decomposition when API is unavailable
 * @param {string} description Task description
 * @return {Array} Array of subtasks
 */
function fallbackDecomposition(description) {
  const lines = description.split(/\n+/).filter(line => line.trim().length > 0);
  if (lines.length > 1) {
    return lines.map(line => ({ text: line.trim(), completed: false }));
  }

  const sentences = description.split(/\.(?!\d)/).filter(s => s.trim().length > 0);
  return sentences.map(s => ({ text: s.trim(), completed: false }));
}

/**
 * Decompose a task interactively
 * @param {string} taskId Task ID to decompose
 * @param {string[]} taskIds All task IDs for autocomplete
 * @return {Promise<any>}
 */
async function interactiveDecompose(taskId, taskIds) {
  return await inquirer.prompt([
    {
      type: 'autocomplete',
      name: 'taskId',
      message: 'Select a task to decompose:',
      default: taskId,
      source: (answers, input) => {
        input = input || '';
        const result = fuzzy.filter(input, taskIds);
        return new Promise(resolve => {
          resolve(result.map(result => result.string));
        });
      },
      when: () => !taskId
    },
    {
      type: 'confirm',
      name: 'useAI',
      message: 'Use AI to decompose this task?',
      default: true
    },
    {
      type: 'input',
      name: 'customDescription',
      message: 'Enter a custom description for decomposition (leave empty to use task description):',
      default: ''
    }
  ]);
}

/**
 * Create child tasks from decomposition
 * @param {Object} kanbnInstance Kanbn instance
 * @param {string} parentTaskId Parent task ID
 * @param {Array} subtasks Array of subtask objects
 */
async function createChildTasks(kanbnInstance, parentTaskId, subtasks) {
  const parentTask = await kanbnInstance.getTask(parentTaskId);
  const parentColumn = await kanbnInstance.findTaskColumn(parentTaskId);

  const index = await kanbnInstance.getIndex();
  const columnNames = Object.keys(index.columns);

  const columnName = parentColumn || columnNames[0];

  const childTasks = [];

  for (const subtask of subtasks) {
    try {
      // Create a child task in the same column as the parent
      const childTaskId = await kanbnInstance.createTask({
        name: subtask.text || subtask,
        description: subtask.text || subtask,
        metadata: {
          tags: parentTask.metadata?.tags || [],
          parent: parentTaskId
        }
      }, columnName);
      
      childTasks.push(childTaskId);
      
      // Add reference to child in parent task
      if (!parentTask.metadata) {
        parentTask.metadata = {};
      }
      
      if (!parentTask.metadata.children) {
        parentTask.metadata.children = [];
      }
      
      parentTask.metadata.children.push(childTaskId);
    } catch (error) {
      console.error(`Error creating child task: ${error.message}`);
    }
  }

  await kanbnInstance.updateTask(parentTaskId, parentTask);

  return childTasks;
}

module.exports = async args => {
    // Create a Kanbn instance
    const kanbn = Kanbn();

    // Make sure kanbn has been initialised
    try {
      if (!await kanbn.initialised()) {
        utility.warning('Kanbn has not been initialised in this folder\nTry running: {b}kanbn init{b}');
        return;
      }
    } catch (error) {
      utility.warning('Kanbn has not been initialised in this folder\nTry running: {b}kanbn init{b}');
      return;
    }

  let taskId = args.task ? utility.strArg(args.task) : null;

  let customDescription = args.description ? utility.strArg(args.description) : '';

  const taskIds = [...await kanbn.findTrackedTasks()];

  if (args.interactive) {
    try {
      const answers = await interactiveDecompose(taskId, taskIds);
      taskId = answers.taskId || taskId;
      customDescription = answers.customDescription;

      if (!answers.useAI) {
        utility.error('Manual decomposition not implemented yet. Please use AI decomposition.');
        return;
      }
    } catch (error) {
      utility.error(error);
      return;
    }
  }

  if (!taskId) {
    utility.error('No task specified. Use --task or -t to specify a task ID.');
    return;
  }

  try {
    // Normalize the task ID by removing any file extension
    if (taskId.endsWith('.md')) {
      taskId = taskId.slice(0, -3);
    }

    // Check if task exists
    const allTaskIds = await kanbn.findTrackedTasks();
    
    // Handle both Set and Array return types for backward compatibility
    let taskExists = false;
    let matchingTaskId = null;
    
    // Convert to array for consistent processing
    const taskIdsArray = Array.isArray(allTaskIds) ? allTaskIds : 
                        (allTaskIds instanceof Set) ? [...allTaskIds] : 
                        (allTaskIds && typeof allTaskIds === 'object') ? Object.keys(allTaskIds) : [];
    
    // Check for exact match
    taskExists = taskIdsArray.includes(taskId);
    
    if (!taskExists) {
      // Try to find a task that matches the given ID (case-insensitive)
      matchingTaskId = taskIdsArray.find(id => id.toLowerCase() === taskId.toLowerCase());

      if (matchingTaskId) {
        // Use the matching task ID with correct case
        taskId = matchingTaskId;
      } else {
        utility.error(`Task "${taskId}" doesn't exist`);
        return;
      }
    }
  } catch (error) {
    utility.error(error);
    return;
  }

  let task;
  try {
    task = await kanbn.getTask(taskId);
  } catch (error) {
    utility.error(error);
    return;
  }

  const description = customDescription || task.description;

  console.log(`Decomposing task "${task.name}"...`);
  const subtasks = await callOpenRouterAPI(kanbn, description, task, args['with-refs']);

  if (subtasks.length === 0) {
    utility.error('Failed to decompose task. No subtasks generated.');
    return;
  }

  console.log(`Generated ${subtasks.length} subtasks:`);
  subtasks.forEach((subtask, index) => {
    console.log(`${index + 1}. ${subtask.text}`);
  });

  console.log('\nCreating child tasks...');
  const childTasks = await createChildTasks(kanbn, taskId, subtasks);

  console.log(`\nCreated ${childTasks.length} child tasks for "${task.name}"`);
  childTasks.forEach(childTaskId => {
    console.log(`- ${childTaskId}`);
  });
};
