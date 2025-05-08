const QUnit = require('qunit');
const ChatContext = require('../../src/lib/chat-context');

describe('Chat Context tests', () => {

  test('should initialize with default values', function(assert) {
  const context = new ChatContext();
  expect(context.lastTaskId).toEqual(null);
  expect(context.taskNameMap.size).toEqual(0);
  assert.true(context.columnNames.has('Backlog'), 'should have default Backlog column');
  expect(context.columnNames.size).toEqual(1);
});

  test('should track last task and task names', function(assert) {
  this.context.setLastTask('task-1', 'Test Task');
  
  expect(this.context.lastTaskId).toEqual('task-1');
  expect(this.context.taskNameMap.get('test task')).toEqual('task-1');
});

  test('should handle task references', function(assert) {
  this.context.setLastTask('task-1', 'Test Task');
  
  assert.strictEqual(
    this.context.resolveTaskReference('it'),
    'task-1',
    'should resolve "it" to last task'
  );
  
  assert.strictEqual(
    this.context.resolveTaskReference('that task'),
    'task-1',
    'should resolve "that task" to last task'
  );
  
  assert.strictEqual(
    this.context.resolveTaskReference('this task'),
    'task-1',
    'should resolve "this task" to last task'
  );
  
  assert.strictEqual(
    this.context.resolveTaskReference('Test Task'),
    'task-1',
    'should resolve task by name'
  );
  
  assert.strictEqual(
    this.context.resolveTaskReference('unknown task'),
    null,
    'should return null for unknown task'
  );
});

  test('should manage column names from index', function(assert) {
  const testIndex = {
    columns: {
      'Backlog': [],
      'In Progress': [],
      'Done': []
    }
  };
  
  this.context.setColumns(testIndex);
  
  assert.true(this.context.isValidColumn('Backlog'), 'should recognize Backlog column');
  assert.true(this.context.isValidColumn('In Progress'), 'should recognize In Progress column');
  assert.true(this.context.isValidColumn('Done'), 'should recognize Done column');
  assert.false(this.context.isValidColumn('Unknown'), 'should reject unknown column');
});

  test('should handle null or empty columns in index', function(assert) {
  // Test null columns
  this.context.setColumns({ columns: null });
  assert.true(this.context.isValidColumn('Backlog'), 'should have default Backlog with null columns');
  
  // Test empty columns object
  this.context.setColumns({ columns: {} });
  assert.true(this.context.isValidColumn('Backlog'), 'should have default Backlog with empty columns');
});

  test('should clear context', function(assert) {
  // Set up some context
  this.context.setLastTask('task-1', 'Test Task');
  this.context.setColumns({
    columns: {
      'Backlog': [],
      'In Progress': []
    }
  });
  
  // Clear the context
  this.context.clear();
  
  expect(this.context.lastTaskId).toEqual(null);
  expect(this.context.taskNameMap.size).toEqual(0);
  assert.true(this.context.columnNames.has('Backlog'), 'should reset to default Backlog column');
  expect(this.context.columnNames.size).toEqual(1);
});

});\