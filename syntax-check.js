const fs = require('fs');

try {
  const content = fs.readFileSync('./test/unit/status.test.js', 'utf8');
  // Try to parse as JavaScript
  new Function(content);
  console.log('Syntax OK');
} catch (error) {
  console.error('Syntax Error:', error.message);
  console.error('Line:', error.lineNumber || 'unknown');
}