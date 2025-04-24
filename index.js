const minimist = require('minimist');
const path = require('path');
const utility = require('./src/utility');

module.exports = async () => {
  // Try to load .env from current working directory first, then fallback to package root
  const dotenvResult = require('dotenv').config() || require('dotenv').config({ path: path.join(__dirname, '.env') });

  // Debug logging for dotenv
  if (process.env.DEBUG === 'true') {
    console.log('DEBUG: dotenv result:', dotenvResult.error ? `Error: ${dotenvResult.error.message}` : 'Success');
    console.log('DEBUG: dotenv parsed:', dotenvResult.parsed ? Object.keys(dotenvResult.parsed).join(', ') : 'No parsed values');
  }

  // Log environment variables for debugging (only in test/debug mode)
  if (process.env.KANBN_ENV === 'test' || process.env.DEBUG === 'true') {
    console.log('Environment variables loaded:');
    if (process.env.OPENROUTER_API_KEY) {
      const keyPrefix = process.env.OPENROUTER_API_KEY.substring(0, 5);
      console.log(`OPENROUTER_API_KEY: ${keyPrefix}... (${process.env.OPENROUTER_API_KEY.length} chars)`);
    } else {
      console.log('OPENROUTER_API_KEY: not set');
    }
    if (process.env.OPENROUTER_MODEL) {
      console.log(`OPENROUTER_MODEL: ${process.env.OPENROUTER_MODEL}`);
    }
  }

  // Parse command line arguments to check for API key
  const rawArgs = minimist(process.argv.slice(2));
  if (rawArgs['api-key'] && !process.env.OPENROUTER_API_KEY) {
    // Set the API key from command line arguments
    process.env.OPENROUTER_API_KEY = rawArgs['api-key'];

    if (process.env.DEBUG === 'true') {
      console.log('DEBUG: Setting OPENROUTER_API_KEY from command line arguments');
      const keyPrefix = process.env.OPENROUTER_API_KEY.substring(0, 5);
      console.log(`DEBUG: OPENROUTER_API_KEY now set to: ${keyPrefix}... (${process.env.OPENROUTER_API_KEY.length} chars)`);
    }
  }

  // Get the command
  const command = process.argv[2] || '';

  // Load route configs and get the current route
  const routes = require('auto-load')(path.join(__dirname, 'routes')), route = {};
  const found = Object.entries(routes).find(([id, route]) => route.commands.indexOf(command) !== -1);

  // Make sure we have a valid route
  if (found === undefined) {
    utility.error(`"${command}" is not a valid command`);
    return;
  }
  ({ 0: route.id, 1: route.config } = found);

  // Check for help argument and override route if present
  const args = minimist(process.argv.slice(2), {
    boolean: ['help'],
    alias: { help: ['h'] }
  });
  if (route.id === 'help' || args.help) {
    const helpCommand = (c => args._.filter(arg => c.indexOf(arg) !== -1).pop() || 'help')(
      [...Object.values(routes).map(r => r.commands)].flat()
    );
    route.id = Object.keys(routes).find(k => routes[k].commands.indexOf(helpCommand) !== -1);
    route.config = routes.help;
  }

  // Parse arguments again using route-specific options and pass to the relevant controller
  await require(route.config.controller)(
    minimist(
      process.argv.slice(2),
      route.config.args
    ),
    process.argv,
    route.id
  );
};
