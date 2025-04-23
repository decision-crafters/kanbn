const Kanbn = require('../main');
const utility = require('../utility');

/**
 * Archive a task
 * @param {string} taskId
 */
function archiveTask(taskId) {
  const kanbn = Kanbn();
  kanbn
  .archiveTask(taskId)
  .then(taskId => {
    console.log(`Archived task "${taskId}"`);
  })
  .catch(error => {
    utility.error(error);
  });
}

/**
 * Show a list of archived task filenames
 */
function listArchivedTasks() {
  const kanbn = Kanbn();
  kanbn
  .listArchivedTasks()
  .then(archivedTasks => {
    console.log(archivedTasks.join('\n'));
  })
  .catch(error => {
    utility.error(error);
  });
}

module.exports = async args => {
  // Create a Kanbn instance
  const kanbn = Kanbn();

  // Make sure kanbn has been initialised
  try {
    if (!await kanbn.initialised()) {
      utility.error('Kanbn has not been initialised in this folder\nTry running: {b}kanbn init{b}');
      return;
    }
  } catch (error) {
    utility.error('Kanbn has not been initialised in this folder\nTry running: {b}kanbn init{b}');
    return;
  }

  // Check if we're listing archived tasks
  if (args.list) {
    listArchivedTasks();
    return;
  }

  // Get the task that we're archiving
  const taskId = args._[1];
  if (!taskId) {
    utility.error('No task id specified\nTry running {b}kanbn archive "task id"{b}');
    return;
  }

  // Make sure the task exists
  try {
    await kanbn.taskExists(taskId);
  } catch (error) {
    utility.error(error);
    return;
  }

  // Archive task
  archiveTask(taskId);
};
