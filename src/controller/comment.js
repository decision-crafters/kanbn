const kanbnModule = require('../main');
const utility = require('../utility');
const inquirer = require('inquirer');
const { getGitUsername } = require('../lib/git-utils');

/**
 * Add a comment interactively
 * @param {string} text
 * @param {string} author
 * @return {Promise<any>}
 */
async function interactive(text, author) {
  return await inquirer.prompt([
    {
      type: 'input',
      name: 'text',
      message: 'Comment text:',
      default: text || '',
      validate: async value => {
        if (!value) {
          return 'Comment text cannot be empty';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'author',
      message: 'Author:',
      default: author || ''
    }
  ]);
}

/**
 * Add a comment
 * @param {string} taskId
 * @param {string} text
 * @param {string} author
 * @param {object} kanbnInstance The Kanbn instance to use
 */
function addComment(taskId, text, author, kanbnInstance) {
  kanbnInstance
  .comment(taskId, text, author)
  .then(taskId => {
    console.log(`Added comment to task "${taskId}"`);
  })
  .catch(error => {
    utility.error(error);
  });
}

module.exports = async args => {
  const kanbn = kanbnModule();

  // Make sure kanbn has been initialised
  if (!await kanbn.initialised()) {
    utility.error('Kanbn has not been initialised in this folder\nTry running: {b}kanbn init{b}');
    return;
  }

  // Get the task that we're add a comment to
  const taskId = args._[1];
  if (!taskId) {
    utility.error('No task id specified\nTry running {b}kanbn comment "task id"{b}');
    return;
  }

  // Make sure the task exists
  try {
    await kanbn.taskExists(taskId);
  } catch (error) {
    utility.error(error);
    return;
  }

  // Get comment values from arguments
  let commentText = '', commentAuthor = '';

  // Text
  if (args.text) {
    commentText = utility.strArg(args.text);
  }

  // Author
  if (args.author && typeof args.author === 'string') {
    commentAuthor = utility.strArg(args.author);
  } else {
    commentAuthor = getGitUsername() || 'Anonymous';
  }
  
  if (!commentAuthor || typeof commentAuthor !== 'string') {
    commentAuthor = 'Anonymous';
  }

  // Add comment interactively
  if (args.interactive) {
    interactive(commentText, commentAuthor)
    .then(answers => {
      addComment(taskId, answers.text, answers.author, kanbn);
    })
    .catch(error => {
      utility.error(error);
    });

  // Otherwise add comment non-interactively
  } else {
    addComment(taskId, commentText, commentAuthor, kanbn);
  }
};
