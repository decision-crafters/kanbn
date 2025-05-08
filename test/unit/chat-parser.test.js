const QUnit = require('qunit');
const chatParser = require('../../src/lib/chat-parser');

describe('Chat Parser tests', () => {

  test('should parse create task commands', function(assert) {
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

  test('should parse add subtask commands', function(assert) {
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

  test('should parse move task commands', function(assert) {
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

  test('should parse comment commands', function(assert) {
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

  test('should parse complete task commands', function(assert) {
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

  test('should parse status commands', function(assert) {
  const tests = [
    {
      input: 'status',
      expect: { intent: 'status', params: [] }
    },
    {
      input: 'show status',
      expect: { intent: 'status', params: ['show'] }
    },
    {
      input: 'progress',
      expect: { intent: 'status', params: [] }
    }
  ];

  tests.forEach(test => {
    const result = chatParser.parseMessage(test.input);
    assert.strictEqual(result.intent, test.expect.intent, `Intent should match for "${test.input}"`);
    assert.deepEqual(result.params, test.expect.params, `Params should match for "${test.input}"`);
  });
});

  test('should parse list tasks in column commands', function(assert) {
  const tests = [
    {
      input: 'what tasks are in Backlog',
      expect: { intent: 'listTasksInColumn', params: ['what', ' tasks', ' are', undefined, 'Backlog'] }
    },
    {
      input: 'show tasks in the To Do',
      expect: { intent: 'listTasksInColumn', params: ['show', ' tasks', undefined, ' the ', 'To Do'] }
    },
    {
      input: 'list items in "In Progress"',
      expect: { intent: 'listTasksInColumn', params: ['list', ' items', undefined, undefined, 'In Progress'] }
    },
    {
      input: 'which tasks in Done',
      expect: { intent: 'listTasksInColumn', params: ['which', ' tasks', undefined, undefined, 'Done'] }
    }
  ];

  tests.forEach(test => {
    const result = chatParser.parseMessage(test.input);
    assert.strictEqual(result.intent, test.expect.intent, `Intent should match for "${test.input}"`);
    assert.deepEqual(result.params, test.expect.params, `Params should match for "${test.input}"`);
  });
});

  test('should parse delete task commands', function(assert) {
  const tests = [
    {
      input: 'delete task "Test Task"',
      expect: { intent: 'deleteTask', params: ['delete', 'Test Task'] }
    },
    {
      input: 'remove task Bug Fix',
      expect: { intent: 'deleteTask', params: ['remove', 'Bug Fix'] }
    }
  ];

  tests.forEach(test => {
    const result = chatParser.parseMessage(test.input);
    assert.strictEqual(result.intent, test.expect.intent, `Intent should match for "${test.input}"`);
    assert.deepEqual(result.params, test.expect.params, `Params should match for "${test.input}"`);
  });
});

  test('should parse search tasks commands', function(assert) {
  const tests = [
    {
      input: 'search for tasks with "bug"',
      expect: { intent: 'searchTasks', params: ['search', 'for', undefined, 'bug'] }
    },
    {
      input: 'find tasks containing performance',
      expect: { intent: 'searchTasks', params: ['find', undefined, 'containing', 'performance'] }
    },
    {
      input: 'search tasks about "login"',
      expect: { intent: 'searchTasks', params: ['search', undefined, 'about', 'login'] }
    }
  ];

  tests.forEach(test => {
    const result = chatParser.parseMessage(test.input);
    assert.strictEqual(result.intent, test.expect.intent, `Intent should match for "${test.input}"`);
    assert.deepEqual(result.params, test.expect.params, `Params should match for "${test.input}"`);
  });
});

  test('should parse list tasks by tag commands', function(assert) {
  const tests = [
    {
      input: 'list tasks with tag "bug"',
      expect: { intent: 'listTasksByTag', params: ['list', 'tasks', undefined, 'tag', 'bug'] }
    },
    {
      input: 'show tasks with tag important',
      expect: { intent: 'listTasksByTag', params: ['show', 'tasks', undefined, 'tag', 'important'] }
    },
    {
      input: 'which tasks have tag "frontend"',
      expect: { intent: 'listTasksByTag', params: ['which', 'tasks', 'have', 'tag', 'frontend'] }
    }
  ];

  tests.forEach(test => {
    const result = chatParser.parseMessage(test.input);
    assert.strictEqual(result.intent, test.expect.intent, `Intent should match for "${test.input}"`);
    assert.deepEqual(result.params, test.expect.params, `Params should match for "${test.input}"`);
  });
});

  test('should parse list tasks by assignee commands', function(assert) {
  const tests = [
    {
      input: 'list tasks assigned to "John"',
      expect: { intent: 'listTasksByAssignee', params: ['list', undefined, 'assigned', 'to', 'John'] }
    },
    {
      input: 'show tasks for Sarah',
      expect: { intent: 'listTasksByAssignee', params: ['show', undefined, undefined, 'for', 'Sarah'] }
    },
    {
      input: 'what tasks are assigned to "David"',
      expect: { intent: 'listTasksByAssignee', params: ['what', undefined, 'are assigned', 'to', 'David'] }
    }
  ];

  tests.forEach(test => {
    const result = chatParser.parseMessage(test.input);
    assert.strictEqual(result.intent, test.expect.intent, `Intent should match for "${test.input}"`);
    assert.deepEqual(result.params, test.expect.params, `Params should match for "${test.input}"`);
  });
});

  test('should parse show task details commands', function(assert) {
  const tests = [
    {
      input: 'show details for "Test Task"',
      expect: { intent: 'showTaskDetails', params: ['show', 'details', 'for', 'Test Task'] }
    },
    {
      input: 'view task Bug Fix',
      expect: { intent: 'showTaskDetails', params: ['view', 'task', undefined, 'Bug Fix'] }
    },
    {
      input: 'tell me about "Performance Issue"',
      expect: { intent: 'showTaskDetails', params: ['tell', 'me about', undefined, 'Performance Issue'] }
    }
  ];

  tests.forEach(test => {
    const result = chatParser.parseMessage(test.input);
    assert.strictEqual(result.intent, test.expect.intent, `Intent should match for "${test.input}"`);
    assert.deepEqual(result.params, test.expect.params, `Params should match for "${test.input}"`);
  });
});

  test('should parse show task stats commands', function(assert) {
  const tests = [
    {
      input: 'show statistics for Backlog',
      expect: { intent: 'showTaskStats', params: ['show', 'statistics', 'for', 'Backlog'] }
    },
    {
      input: 'get stats for "In Progress"',
      expect: { intent: 'showTaskStats', params: ['get', 'stats', 'for', 'In Progress'] }
    },
    {
      input: 'task metrics for Done column',
      expect: { intent: 'showTaskStats', params: ['task', 'metrics', 'for', 'Done'] }
    }
  ];

  tests.forEach(test => {
    const result = chatParser.parseMessage(test.input);
    assert.strictEqual(result.intent, test.expect.intent, `Intent should match for "${test.input}"`);
    assert.deepEqual(result.params, test.expect.params, `Params should match for "${test.input}"`);
  });
});

  test('should parse add tag commands', function(assert) {
  const tests = [
    {
      input: 'add tag "bug" to task "Login Fix"',
      expect: { intent: 'addTaskTag', params: ['add', 'tag', 'Login Fix', 'to', 'bug'] }
    },
    {
      input: 'tag task "Database Update" with important',
      expect: { intent: 'addTaskTag', params: ['tag', 'task', 'Database Update', 'with', 'important'] }
    }
  ];

  tests.forEach(test => {
    const result = chatParser.parseMessage(test.input);
    assert.strictEqual(result.intent, test.expect.intent, `Intent should match for "${test.input}"`);
    assert.deepEqual(result.params, test.expect.params, `Params should match for "${test.input}"`);
  });
});

  test('should parse remove tag commands', function(assert) {
  const tests = [
    {
      input: 'remove tag bug from task "Login Fix"',
      expect: { intent: 'removeTaskTag', params: ['remove', 'bug', 'from', 'Login Fix'] }
    },
    {
      input: 'delete tag "urgent" from "Database Update"',
      expect: { intent: 'removeTaskTag', params: ['delete', 'urgent', 'from', 'Database Update'] }
    }
  ];

  tests.forEach(test => {
    const result = chatParser.parseMessage(test.input);
    assert.strictEqual(result.intent, test.expect.intent, `Intent should match for "${test.input}"`);
    assert.deepEqual(result.params, test.expect.params, `Params should match for "${test.input}"`);
  });
});

  test('should parse assign task commands', function(assert) {
  const tests = [
    {
      input: 'assign task "Login Fix" to John',
      expect: { intent: 'assignTask', params: ['assign', 'Login Fix', 'to', 'John'] }
    },
    {
      input: 'assign "Database Update" to "Sarah Smith"',
      expect: { intent: 'assignTask', params: ['assign', 'Database Update', 'to', 'Sarah Smith'] }
    }
  ];

  tests.forEach(test => {
    const result = chatParser.parseMessage(test.input);
    assert.strictEqual(result.intent, test.expect.intent, `Intent should match for "${test.input}"`);
    assert.deepEqual(result.params, test.expect.params, `Params should match for "${test.input}"`);
  });
});

  test('should parse unassign task commands', function(assert) {
  const tests = [
    {
      input: 'unassign task "Login Fix" from John',
      expect: { intent: 'unassignTask', params: ['unassign', 'Login Fix', 'from', 'John'] }
    },
    {
      input: 'remove "Sarah Smith" from task "Database Update"',
      expect: { intent: 'unassignTask', params: ['remove', 'Database Update', 'from', 'Sarah Smith'] }
    }
  ];

  tests.forEach(test => {
    const result = chatParser.parseMessage(test.input);
    assert.strictEqual(result.intent, test.expect.intent, `Intent should match for "${test.input}"`);
    assert.deepEqual(result.params, test.expect.params, `Params should match for "${test.input}"`);
  });
});

  test('should parse update task description commands', function(assert) {
  const tests = [
    {
      input: 'update description of "Login Fix" to "Fix login form validation"',
      expect: { intent: 'updateTaskDescription', params: ['update', 'Login Fix', 'to', 'Fix login form validation'] }
    },
    {
      input: 'change description for Database Update to "Add support for new data types"',
      expect: { intent: 'updateTaskDescription', params: ['change', 'Database Update', 'to', 'Add support for new data types'] }
    }
  ];

  tests.forEach(test => {
    const result = chatParser.parseMessage(test.input);
    assert.strictEqual(result.intent, test.expect.intent, `Intent should match for "${test.input}"`);
    assert.deepEqual(result.params, test.expect.params, `Params should match for "${test.input}"`);
  });
});

  test('should fallback to chat intent for unrecognized commands', function(assert) {
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

});\