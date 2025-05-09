const kanbnModule = require('../main');
const utility = require('../utility');
const inquirer = require('inquirer');

inquirer.registerPrompt('selectLine', require('inquirer-select-line'));

/**
 * Move a task interactively
 * @param {object} columns
 * @param {string} columnName
 * @param {string[]} columnNames
 * @param {string[]} sortedColumnNames
 * @param {string} taskId
 * @param {number} position
 * @return {Promise<any>}
 */
async function interactive(columns, columnName, columnNames, sortedColumnNames, taskId, position) {
  return await inquirer.prompt([
    {
      type: 'list',
      name: 'column',
      message: 'Column:',
      default: columnName,
      choices: columnNames
    },
    {
      type: 'selectLine',
      name: 'position',
      message: 'Move task:',
      default: answers => Math.max(Math.min(position, columns[answers.column].length), 0),
      choices: answers => columns[answers.column].filter(t => t !== taskId),
      placeholder: taskId,
      when: answers => sortedColumnNames.indexOf(answers.column) === -1
    }
  ]);
}

/**
 * Move a task
 * @param {string} taskId
 * @param {string} columnName
 * @param {?number} [position=null]
 * @param {boolean} [relative=false]
 * @param {object} kanbnInstance The Kanbn instance to use
 */
function moveTask(taskId, columnName, position = null, relative = false, kanbnInstance) {
  kanbnInstance
  .moveTask(taskId, columnName, position, relative)
  .then(taskId => {
    // Get the index to verify the task was moved to the correct column
    kanbnInstance.getIndex().then(index => {
      const actualColumn = Object.entries(index.columns).find(([_, tasks]) => tasks.includes(taskId))?.[0] || null;
      console.log(`Moved task "${taskId}" to column "${actualColumn}"`);
    }).catch(error => {
      console.log(`Moved task "${taskId}" to column "${columnName}"`);
    });
  })
  .catch(error => {
    utility.error(error);
  });
}

module.exports = async args => {
  // Create a Kanbn instance
  const kanbn = kanbnModule();

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

  // Get the task that we're moving
  const taskId = args._[1];
  if (!taskId) {
    utility.error('No task id specified\nTry running {b}kanbn move "task id"{b}');
    return;
  }

  // Make sure the task exists
  try {
    await kanbn.taskExists(taskId);
  } catch (error) {
    utility.error(error);
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

  // Get column name if specified
  const currentColumnName = Object.entries(index.columns).find(([_, tasks]) => tasks.includes(taskId))?.[0] || null;
  let columnName = currentColumnName;

  // Check for column name in positional arguments (args._[2]) or named argument (args.column)
  if (args._[2]) {
    columnName = args._[2];
  } else if (args.column) {
    columnName = utility.strArg(args.column);
  }

  // Validate the column name
  if (columnName !== currentColumnName && columnNames.indexOf(columnName) === -1) {
    utility.error(`Column "${columnName}" doesn't exist`);
    return;
  }

  // Re-use sprint option for position
  const currentPosition = index.columns[currentColumnName].indexOf(taskId);
  let newPosition = args.position || args.p;
  if (newPosition) {
    newPosition = parseInt(utility.trimLeftEscapeCharacters(newPosition));
    if (isNaN(newPosition)) {
      utility.error('Position value must be numeric');
      return;
    }
  } else {
    newPosition = null;
  }

  // Get a list of sorted columns
  const sortedColumnNames = 'columnSorting' in index.options ? Object.keys(index.options.columnSorting) : [];

  // Move task interactively
  if (args.interactive) {
    interactive(
      index.columns,
      columnName,
      columnNames,
      sortedColumnNames,
      taskId,
      newPosition === null
        ? currentPosition
        : (args.relative ? (currentPosition + newPosition) : newPosition)
    )
    .then(answers => {
      moveTask(taskId, answers.column, answers.position, false, kanbn);
    })
    .catch(error => {
      utility.error(error);
    });

  // Otherwise move task non-interactively
  } else {
    moveTask(taskId, columnName, newPosition, args.relative, kanbn);
  }
};
