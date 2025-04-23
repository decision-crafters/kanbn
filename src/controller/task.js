const Kanbn = require("../main");
const utility = require("../utility");
const parseTask = require("../parse-task");
const marked = require("marked");
const markedTerminalRenderer = require("marked-terminal");
const promptBuilder = require("../promptBuilder");

/**
 * Show task information
 * @param {string} taskId
 * @param {boolean} json - Whether to show as JSON
 * @param {boolean} prompt - Whether to show as AI prompt
 */
function showTask(taskId, json = false, prompt = false) {
  const kanbn = Kanbn();
  kanbn
    .getTask(taskId)
    .then((task) => {
      if (json) {
        console.log(task);
      } else if (prompt) {
        try {
          const taskPrompt = promptBuilder.buildPromptForTask(task);
          console.log(taskPrompt);
        } catch (error) {
          utility.error(`Error generating prompt: ${error.message}`);
        }
      } else {
        marked.setOptions({
          renderer: new markedTerminalRenderer(),
        });
        console.log(marked(parseTask.json2md(task)));
      }
    })
    .catch((error) => {
      utility.error(error);
    });
}

module.exports = async (args) => {
  // Make sure kanbn has been initialised
  const kanbn = Kanbn();
  try {
    if (!(await kanbn.initialised())) {
      utility.warning("Kanbn has not been initialised in this folder\nTry running: {b}kanbn init{b}");
      return;
    }
  } catch (error) {
    utility.warning("Kanbn has not been initialised in this folder\nTry running: {b}kanbn init{b}");
    return;
  }

  // Get the task that we're showing
  const taskId = args._[1];
  if (!taskId) {
    utility.error('No task id specified\nTry running {b}kanbn task "task id"{b}');
    return;
  }

  // Make sure the task exists
  try {
    await kanbn.taskExists(taskId);
  } catch (error) {
    utility.error(error);
    return;
  }

  // Show the task
  showTask(taskId, args.json, args.prompt);
};
