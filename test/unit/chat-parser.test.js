const QUnit = require('qunit');
const chatParser = require('../../src/lib/chat-parser');

QUnit.module('Chat Parser tests');

QUnit.test('should parse create task commands', function(assert) {
  const tests = [
    {
      input: 'create task "Test Task"',
      expect: { intent: 'createTask', params: ['create', 'task', null, 'Test Task'] }
    },
    {
      input: 'add task called "Bug Fix"',
      expect: { intent: 'createTask', params: ['add', 'task', ' called', 'Bug Fix'] }
    },
    {
      input: 'create issue "Performance Problem"',
      expect: { intent: 'createTask', params: ['create', 'issue', null, 'Performance Problem'] }
    }
  ];

  tests.forEach(test => {
    const result = chatParser.parseMessage(test.input);
    assert.strictEqual(result.intent, test.expect.intent, `Intent should match for "${test.input}"`);
    assert.deepEqual(result.params, test.expect.params, `Params should match for "${test.input}"`);
  });
});

QUnit.test('should parse add subtask commands', function(assert) {
  const tests = [
    {
      input: 'add subtask "Write tests" to "Main Task"',
      expect: { intent: 'addSubtask', params: ['Write tests', 'Main Task'] }
    },
    {
      input: 'add subtask "Fix bug" to Main Task',
      expect: { intent: 'addSubtask', params: ['Fix bug', 'Main Task'] }
    }
  ];

  tests.forEach(test => {
    const result = chatParser.parseMessage(test.input);
    assert.strictEqual(result.intent, test.expect.intent, `Intent should match for "${test.input}"`);
    assert.deepEqual(result.params, test.expect.params, `Params should match for "${test.input}"`);
  });
});

QUnit.test('should parse move task commands', function(assert) {
  const tests = [
    {
      input: 'move "Test Task" to In Progress',
      expect: { intent: 'moveTask', params: ['Test Task', 'In Progress'] }
    },
    {
      input: 'move Bug Fix to Done',
      expect: { intent: 'moveTask', params: ['Bug Fix', 'Done'] }
    }
  ];

  tests.forEach(test => {
    const result = chatParser.parseMessage(test.input);
    assert.strictEqual(result.intent, test.expect.intent, `Intent should match for "${test.input}"`);
    assert.deepEqual(result.params, test.expect.params, `Params should match for "${test.input}"`);
  });
});

QUnit.test('should parse comment commands', function(assert) {
  const tests = [
    {
      input: 'comment "Looking good" on "Test Task"',
      expect: { intent: 'comment', params: [null, 'Looking good', 'on', 'Test Task'] }
    },
    {
      input: 'add comment "Need review" to Bug Fix',
      expect: { intent: 'comment', params: ['add', 'Need review', 'to', 'Bug Fix'] }
    }
  ];

  tests.forEach(test => {
    const result = chatParser.parseMessage(test.input);
    assert.strictEqual(result.intent, test.expect.intent, `Intent should match for "${test.input}"`);
    assert.deepEqual(result.params, test.expect.params, `Params should match for "${test.input}"`);
  });
});

QUnit.test('should parse complete task commands', function(assert) {
  const tests = [
    {
      input: 'complete "Test Task"',
      expect: { intent: 'complete', params: ['Test Task'] }
    },
    {
      input: 'finish "Bug Fix"',
      expect: { intent: 'complete', params: ['Bug Fix'] }
    },
    {
      input: 'mark done "Performance Issue"',
      expect: { intent: 'complete', params: ['Performance Issue'] }
    }
  ];

  tests.forEach(test => {
    const result = chatParser.parseMessage(test.input);
    assert.strictEqual(result.intent, test.expect.intent, `Intent should match for "${test.input}"`);
    assert.deepEqual(result.params, test.expect.params, `Params should match for "${test.input}"`);
  });
});

QUnit.test('should parse status commands', function(assert) {
  const tests = [
    {
      input: 'status',
      expect: { intent: 'status', params: [null, 'status'] }
    },
    {
      input: 'show progress',
      expect: { intent: 'status', params: ['show ', 'progress'] }
    },
    {
      input: 'show board',
      expect: { intent: 'status', params: ['show ', 'board'] }
    }
  ];

  tests.forEach(test => {
    const result = chatParser.parseMessage(test.input);
    assert.strictEqual(result.intent, test.expect.intent, `Intent should match for "${test.input}"`);
    assert.deepEqual(result.params, test.expect.params, `Params should match for "${test.input}"`);
  });
});

QUnit.test('should fallback to chat intent for unrecognized commands', function(assert) {
  const tests = [
    {
      input: 'hello there',
      expect: { intent: 'chat', params: ['hello there'] }
    },
    {
      input: 'what is the project status?',
      expect: { intent: 'chat', params: ['what is the project status?'] }
    }
  ];

  tests.forEach(test => {
    const result = chatParser.parseMessage(test.input);
    assert.strictEqual(result.intent, test.expect.intent, `Intent should match for "${test.input}"`);
    assert.deepEqual(result.params, test.expect.params, `Params should match for "${test.input}"`);
  });
});
