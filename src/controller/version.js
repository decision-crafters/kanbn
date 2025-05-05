const { version } = require('../../package.json');

module.exports = (_args, _argv, _id) => {
  console.log(`v${version}`);
};
