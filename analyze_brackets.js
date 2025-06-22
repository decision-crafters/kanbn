const fs = require('fs');
const content = fs.readFileSync('test/unit/status.test.js', 'utf8');
let openBraces = 0;
let openParens = 0;
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (const char of line) {
    if (char === '{') openBraces++;
    if (char === '}') openBraces--;
    if (char === '(') openParens++;
    if (char === ')') openParens--;
  }
}

console.log(`Open braces: ${openBraces}, Open parens: ${openParens}`);
console.log(`Total lines: ${lines.length}`);