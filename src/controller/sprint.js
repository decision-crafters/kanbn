const kanbnModule = require('../main');
const utility = require('../utility');
const inquirer = require('inquirer');

module.exports = async args => {
  const kanbn = typeof kanbnModule === 'function' ? kanbnModule() : kanbnModule;

  try {
    // Make sure kanbn has been initialised
    if (!(await kanbn.initialised())) {
      utility.error('Kanbn has not been initialised in this folder\nTry running: {b}kanbn init{b}');
      return;
    }

    // Get name, description and optionally select tasks via interactive mode
    let name, description;
    if (args.interactive) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Sprint name:',
          validate: input => input.length > 0 || 'Sprint name cannot be empty'
        },
        {
          type: 'input',
          name: 'description',
          message: 'Sprint description:'
        }
      ]);
      name = answers.name;
      description = answers.description;
    } else {
      name = args.name;
      description = args.description;
    }

    // Create the sprint
    const sprint = await kanbn.sprint(name, description, new Date());

    // Also create a column for this sprint
    const index = await kanbn.getIndex();
    if (!index.columns) {
      index.columns = {};
    }
    index.columns[sprint.name] = [];
    await kanbn.saveIndex(index);

    console.log(`Created sprint "${sprint.name}"`);
  } catch (error) {
    utility.error(error.message);
  }
};
