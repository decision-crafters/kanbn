const inquirer = require('inquirer');
const kanbnModule = require('../main');
const utility = require('../utility');

/**
 * Remove a task
 * @param {string} taskId
 * @param {boolean} removeFile
 * @param {object} kanbnInstance The Kanbn instance to use
 * @returns {Promise<string>} A promise that resolves with the task ID
 */
async function removeTask(taskId, removeFile, kanbnInstance) {
  try {
    const result = await kanbnInstance.deleteTask(taskId, removeFile);
    console.log(`Removed task "${taskId}"${removeFile ? ' file and index entry' : ' from the index'}`);
    return result;
  } catch (error) {
    utility.error(error);
    throw error;
  }
}

module.exports = async (args) => {
  const kanbn = kanbnModule();

  // Make sure kanbn has been initialised
  if (!await kanbn.initialised()) {
    utility.error('Kanbn has not been initialised in this folder\nTry running: {b}kanbn init{b}');
    return;
  }

  // Get the task that we're removing
  const taskId = args._[1];
  if (!taskId) {
    utility.error('No task id specified\nTry running {b}kanbn remove "task id"{b}');
    return;
  }

  // Make sure the task exists
  try {
    await kanbn.taskExists(taskId);
  } catch (error) {
    utility.error(error);
    return;
  }

  // Get the index
  let index;
  try {
    index = await kanbn.getIndex();
  } catch (error) {
    utility.error(error);
    return;
  }

  // If the force flag is specified, remove the task without asking
  if (args.force) {
    try {
      await removeTask(taskId, !args.index, kanbn);
    } catch (error) {
      // Error already logged in removeTask
      throw error;
    }

  // Otherwise, prompt for confirmation first
  } else {
    try {
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          message: 'Are you sure you want to remove this task?',
          name: 'sure',
          default: false,
        },
      ]);

      if (answers.sure) {
        await removeTask(taskId, !args.index, kanbn);
      }
    } catch (error) {
      utility.error(error);
      throw error;
    }
  }
};
