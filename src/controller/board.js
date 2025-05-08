const Kanbn = require('../main');
const utility = require('../utility');
const board = require('../board');

module.exports = async (args) => {
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

  // Get the index and make sure it has some columns
  let index;
  try {
    index = await kanbn.getIndex();
  } catch (error) {
    utility.error(error);
    return;
  }
  const columnNames = Object.keys(index.columns);
  if (!columnNames.length) {
    utility.error('No columns defined in the index\nTry running {b}kanbn init -c "column name"{b}');
    return;
  }

  // Load all tracked tasks
  const taskUtils = require('../lib/task-utils');

  // Get all tasks from the index - returns an object with task IDs as keys
  const allTasks = await kanbn.loadAllTrackedTasks(index);

  // Convert tasks object to array for filtering and hydration
  const tasksArray = Object.entries(allTasks).map(([id, task]) => {
    // Make sure the task has its ID
    task.id = id;
    return task;
  });

  // Filter out system tasks (AI interaction records)
  const projectTasks = tasksArray.filter((task) => !taskUtils.isSystemTask(task.id, task));

  utility.debugLog(`Loaded ${tasksArray.length} total tasks, displaying ${projectTasks.length} project tasks`);

  // Hydrate only the project tasks for display
  const tasks = projectTasks.map((task) => kanbn.hydrateTask(index, task));

  // Show the board
  board
    .show(index, tasks, args.view, args.json)
    .catch((error) => {
      utility.error(error);
    });
};
