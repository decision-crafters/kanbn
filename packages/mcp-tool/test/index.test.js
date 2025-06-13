const QUnit = require('qunit');
const tools = require('..');

QUnit.module('@kanbn/mcp-tool');

QUnit.test('exports at least one tool definition', assert => {
  const keys = Object.keys(tools);
  assert.ok(keys.length > 0, 'has at least one tool');
  const sample = tools[keys[0]];
  assert.equal(typeof sample.name, 'string', 'tool has name');
  assert.equal(typeof sample.inputSchema, 'object', 'tool has inputSchema');
  assert.equal(typeof sample.outputSchema, 'object', 'tool has outputSchema');
});
