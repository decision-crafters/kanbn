/**
 * Test for the ContextSerializer class
 */

'use strict';

const QUnit = require('qunit');
const ContextSerializer = require('../../src/lib/context-serializer');

QUnit.module('ContextSerializer');

QUnit.test('createContextObject', (assert) => {
  // Test with minimal project context
  const minimalContext = ContextSerializer.createContextObject(
    { name: 'Test Project' }
  );
  
  assert.equal(minimalContext.version, '1.0', 'Context has correct version');
  assert.ok(minimalContext.timestamp > 0, 'Context has valid timestamp');
  assert.equal(minimalContext.project.name, 'Test Project', 'Context has correct project name');
  assert.deepEqual(minimalContext.project.tasks, [], 'Context has empty tasks array');
  
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
  
  assert.equal(complexContext.project.name, 'Complex Project', 'Complex context has correct project name');
  assert.equal(complexContext.project.description, 'A test project', 'Complex context has correct description');
  assert.deepEqual(complexContext.project.columns, ['Backlog', 'In Progress', 'Done'], 'Complex context has correct columns');
  assert.equal(complexContext.project.tasks.length, 1, 'Complex context has correct number of tasks');
  assert.equal(complexContext.memory.conversations.length, 1, 'Complex context has correct number of conversations');
});

QUnit.test('serialize and deserialize', (assert) => {
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
  assert.ok(serialized, 'Serialization produced a result');
  assert.ok(serialized.length > 50, 'Serialized context has reasonable length');
  
  const deserialized = ContextSerializer.deserialize(serialized);
  assert.ok(deserialized, 'Deserialization produced a result');
  
  // Verify key properties survived the round trip
  assert.equal(deserialized.version, originalContext.version, 'Version preserved');
  assert.equal(deserialized.project.name, originalContext.project.name, 'Project name preserved');
  assert.equal(deserialized.project.tasks.length, originalContext.project.tasks.length, 'Task count preserved');
  assert.equal(deserialized.memory.conversations.length, originalContext.memory.conversations.length, 'Conversation count preserved');
  assert.equal(deserialized.options.interactive, originalContext.options.interactive, 'Options preserved');
  
  // Check metadata was added
  assert.ok(deserialized._meta, 'Metadata was added during serialization');
  assert.ok(deserialized._meta.serializedAt, 'Serialization timestamp exists');
  assert.ok(deserialized._meta.deserializedAt, 'Deserialization timestamp exists');
});

QUnit.test('validate', (assert) => {
  // Valid context should pass validation
  const validContext = ContextSerializer.createContextObject({ name: 'Test' });
  const validResult = ContextSerializer.validate(validContext);
  assert.ok(validResult.valid, 'Valid context passes validation');
  assert.equal(validResult.errors.length, 0, 'No errors for valid context');
  
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
