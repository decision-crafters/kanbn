const path = require('path');
const fs = require('fs');

const toolsDir = path.join(__dirname, 'tools');

// Check if tools directory exists
if (!fs.existsSync(toolsDir)) {
  console.warn(`Warning: tools directory not found at ${toolsDir}`);
  module.exports = { tools: {} };
} else {
  try {
    const files = fs.readdirSync(toolsDir).filter(f => f.endsWith('.json'));
    
    const tools = files.reduce((acc, file) => {
      const name = path.basename(file, '.json');
      try {
        acc[name] = require(path.join(toolsDir, file));
      } catch (error) {
        console.error(`Error loading tool definition from ${file}:`, error.message);
      }
      return acc;
    }, {});

    module.exports = { tools };
  } catch (error) {
    console.error(`Error reading tools directory ${toolsDir}:`, error.message);
    module.exports = { tools: {} };
  }
}
