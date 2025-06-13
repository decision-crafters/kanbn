const path = require('path');
const fs = require('fs');

const toolsDir = path.join(__dirname, 'tools');
const files = fs.readdirSync(toolsDir).filter(f => f.endsWith('.json'));

module.exports = files.reduce((acc, file) => {
  const name = path.basename(file, '.json');
  acc[name] = require(path.join(toolsDir, file));
  return acc;
}, {});
