const { version } = require('../../package.json');

module.exports = _args => {
  console.log(`v${version}`);
};
