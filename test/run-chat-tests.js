const QUnit = require('qunit');
const path = require('path');

// Configure QUnit for Node.js environment
QUnit.config.autostart = false;
QUnit.config.testTimeout = 10000;

// Add a logging callback
QUnit.log((details) => {
  if (details.result) {
    console.log('\x1b[32m✓\x1b[0m', details.message || details.name);
  } else {
    console.log('\x1b[31m✗\x1b[0m', details.message);
    if (details.actual !== undefined) {
      console.log('  Expected:', details.expected);
      console.log('  Actual:', details.actual);
    }
    if (details.source) {
      console.log('  Source:', details.source);
    }
  }
});

// Load chat tests
require('./integration/chat-controller.test.js');
require('./integration/chat-domain-events.test.js');
require('./integration/chat-infrastructure.test.js');

// Start QUnit
QUnit.start();
