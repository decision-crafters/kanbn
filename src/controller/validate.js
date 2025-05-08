const yaml = require('yamljs');
const kanbnModule = require('../main');
const utility = require('../utility');

module.exports = async (args) => {
  const kanbn = kanbnModule();

  // Make sure kanbn has been initialised
  if (!await kanbn.initialised()) {
    utility.error('Kanbn has not been initialised in this folder\nTry running: {b}kanbn init{b}');
    return;
  }

  // Validate kanbn files
  kanbn.validate(args.save)
    .then((result) => {
      if (result.length === 0) {
        console.log('Everything OK');
        // Exit with success code when no errors are found
        if (process.env.KANBN_ENV !== 'test') {
          process.exit(0);
        }
      } else {
      // Use dontExit=true to prevent utility.error from exiting, so we can exit with our own code
        utility.error(
          `${result.length} errors found in task files:\n${(
            args.json
              ? JSON.stringify(result, null, 2)
              : yaml.stringify(result, 4, 2)
          )}`,
          true,
        );
        // Exit with error code when validation errors are found
        if (process.env.KANBN_ENV !== 'test') {
          process.exit(1);
        }
      }
    })
    .catch((error) => {
      utility.error(error);
    });
};
