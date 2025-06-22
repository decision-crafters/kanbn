const fs = require('fs');

console.log('CWD:', process.cwd());
console.log('Files in CWD:', fs.readdirSync('.').filter(f => f.startsWith('.')));

if (fs.existsSync('.kanbn')) {
  console.log('.kanbn contents:', fs.readdirSync('.kanbn'));
  if (fs.existsSync('.kanbn/index.md')) {
    console.log('index.md exists');
  } else {
    console.log('index.md does not exist');
  }
} else {
  console.log('.kanbn directory does not exist');
}