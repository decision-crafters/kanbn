/**
 * Test for the ContextSerializer class
 */

'use strict';

const QUnit = require('qunit');
const ContextSerializer = require('../../src/lib/context-serializer');

const { test } = QUnit;

describe('ContextSerializer', () => {

  test('createContextObject', (assert) => {
  // Test with minimal project context
  const minimalContext = ContextSerializer.createContextObject(
    { name: 'Test Project' }
  );
  
  expect(minimalContext.version).toEqual('1.0');
  expect(minimalContext.timestamp > 0).toBeTruthy();
  expect(minimalContext.project.name).toEqual('Test Project');
  expect(minimalContext.project.tasks).toEqual([]);
  
  // Test with more complex project context
  const complexContext = ContextSerializer.createContextObject(
    { 
      name: 'Complex Project',
      description: 'A test project',
      columns: ['Backlog', 'In Progress', 'Done'],
      tasks: [{ id: 'task-1', name: 'Test Task' }]
    },
    {
      conversations: [{ role: 'user', content: 'Hello' }],
      metadata: { lastUpdated: Date.now() }
    }
  );
  
  expect(complexContext.project.name).toEqual('Complex Project');
  expect(complexContext.project.description).toEqual('A test project');
  assert.deepEqual(complexContext.project.columns, ['Backlog', 'In Progress', 'Done'], 'Complex context has correct columns');
  expect(complexContext.project.tasks.length).toEqual(1);
  expect(complexContext.memory.conversations.length).toEqual(1);
});

  test('serialize and deserialize', (assert) => {
  // Create a test context with all major components
  const originalContext = ContextSerializer.createContextObject(
    { 
      name: 'Test Project',
      description: 'A test project',
      columns: ['Backlog', 'In Progress', 'Done'],
      tasks: [
        { id: 'task-1', name: 'Task 1', description: 'First task' },
        { id: 'task-2', name: 'Task 2', description: 'Second task' }
      ]
    },
    {
      conversations: [
        { role: 'user', content: 'What tasks do we have?' },
        { role: 'assistant', content: 'You have two tasks: Task 1 and Task 2' }
      ],
      metadata: { lastUpdated: 12345 }
    },
    { 
      interactive: true,
      customOption: 'test value'
    }
  );
  
  // Serialize and then deserialize
  const serialized = ContextSerializer.serialize(originalContext);
  expect(serialized).toBeTruthy();
  expect(serialized.length > 50).toBeTruthy();
  
  const deserialized = ContextSerializer.deserialize(serialized);
  expect(deserialized).toBeTruthy();
  
  // Verify key properties survived the round trip
  expect(deserialized.version).toEqual(originalContext.version);
  expect(deserialized.project.name).toEqual(originalContext.project.name);
  expect(deserialized.project.tasks.length).toEqual(originalContext.project.tasks.length);
  expect(deserialized.memory.conversations.length).toEqual(originalContext.memory.conversations.length);
  expect(deserialized.options.interactive).toEqual(originalContext.options.interactive);
  
  // Check metadata was added
  expect(deserialized._meta).toBeTruthy();
  expect(deserialized._meta.serializedAt).toBeTruthy();
  expect(deserialized._meta.deserializedAt).toBeTruthy();
});

  test('validate', (assert) => {
  // Valid context should pass validation
  const validContext = ContextSerializer.createContextObject({ name: 'Test' });
  const validResult = ContextSerializer.validate(validContext);
  expect(validResult.valid).toBeTruthy();
  expect(validResult.errors.length).toEqual(0);
  
  // Invalid contexts should fail validation
  const noVersion = { timestamp: Date.now(), project: { name: 'Test' } };
  assert.notOk(ContextSerializer.validate(noVersion).valid, 'Context without version fails validation');
  
  const noTimestamp = { version: '1.0', project: { name: 'Test' } };
  assert.notOk(ContextSerializer.validate(noTimestamp).valid, 'Context without timestamp fails validation');
  
  const nullContext = null;
  assert.notOk(ContextSerializer.validate(nullContext).valid, 'Null context fails validation');
  
  const badProjectTasks = { 
    version: '1.0', 
    timestamp: Date.now(),
    project: { 
      name: 'Test',
      tasks: 'not an array' 
    } 
  };
  assert.notOk(ContextSerializer.validate(badProjectTasks).valid, 'Context with non-array tasks fails validation');
});

});\