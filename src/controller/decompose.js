const kanbn = require('../main');
const utility = require('../utility');
const inquirer = require('inquirer');
const fuzzy = require('fuzzy');
const axios = require('axios');
const getGitUsername = require('git-user-name');

inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

/**
 * Call OpenRouter API to decompose a task
 * @param {string} description Task description to decompose
 * @return {Promise<Array>} Array of subtasks
 */
async function callOpenRouterAPI(description) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OpenRouter API key not found. Please set the OPENROUTER_API_KEY environment variable.');
    }

    // Use the model specified in the environment or default to a cost-effective option
    const model = process.env.OPENROUTER_MODEL || 'google/gemma-3-4b-it:free';
    console.log(`Using model: ${model}`);

    // Check if we're in a test environment
    if (process.env.KANBN_ENV === 'test' && !process.env.USE_REAL_API) {
      console.log('Skipping actual API call for testing...');
      // Return a simple mock decomposition
      const mockSubtasks = [
        { text: `Subtask 1 for: ${description.substring(0, 30)}...`, completed: false },
        { text: `Subtask 2 for: ${description.substring(0, 30)}...`, completed: false }
      ];

      await logAIInteraction('decompose', description, JSON.stringify({ subtasks: mockSubtasks }));
      return mockSubtasks;
    }

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a task decomposition assistant. Given a task description, break it down into smaller, actionable subtasks.'
          },
          {
            role: 'user',
            content: `Please decompose the following task into smaller, actionable subtasks:\n\n${description}`
          }
        ],
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/decision-crafters/kanbn',
          'X-Title': 'Kanbn Task Decomposition'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    const parsedContent = JSON.parse(content);

    await logAIInteraction('decompose', description, content);

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
 * @param {string} parentTaskId Parent task ID
 * @param {Array} subtasks Array of subtask objects
 */
async function createChildTasks(parentTaskId, subtasks) {
  const parentTask = await kanbn.getTask(parentTaskId);
  const parentColumn = await kanbn.findTaskColumn(parentTaskId);

  const index = await kanbn.getIndex();
  const columnNames = Object.keys(index.columns);

  const columnName = parentColumn || columnNames[0];

  const childTasks = [];

  for (const subtask of subtasks) {
    try {
      const taskData = {
        name: subtask.text,
        description: subtask.text,
        metadata: {
          tags: parentTask.metadata.tags || []
        },
        relations: [
          {
            task: parentTaskId,
            type: 'child-of'
          }
        ]
      };

      if (parentTask.metadata.assigned) {
        taskData.metadata.assigned = parentTask.metadata.assigned;
      }

      const childTaskId = await kanbn.createTask(taskData, columnName);
      childTasks.push(childTaskId);

      if (!parentTask.relations) {
        parentTask.relations = [];
      }

      parentTask.relations.push({
        task: childTaskId,
        type: 'parent-of'
      });
    } catch (error) {
      console.error(`Error creating child task: ${error.message}`);
    }
  }

  await kanbn.updateTask(parentTaskId, parentTask);

  return childTasks;
}

module.exports = async args => {
  if (!await kanbn.initialised()) {
    utility.error('Kanbn has not been initialised in this folder\nTry running: {b}kanbn init{b}');
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
    if (!await kanbn.taskExists(taskId)) {
      utility.error(`Task "${taskId}" doesn't exist`);
      return;
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
  const subtasks = await callOpenRouterAPI(description);

  if (subtasks.length === 0) {
    utility.error('Failed to decompose task. No subtasks generated.');
    return;
  }

  console.log(`Generated ${subtasks.length} subtasks:`);
  subtasks.forEach((subtask, index) => {
    console.log(`${index + 1}. ${subtask.text}`);
  });

  console.log('\nCreating child tasks...');
  const childTasks = await createChildTasks(taskId, subtasks);

  console.log(`\nCreated ${childTasks.length} child tasks for "${task.name}"`);
  childTasks.forEach(childTaskId => {
    console.log(`- ${childTaskId}`);
  });
};
