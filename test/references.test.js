const QUnit = require('qunit');
const parseTask = require('../src/parse-task');
const fs = require('fs');
const path = require('path');
const os = require('os');

QUnit.module('References feature tests', {
  beforeEach: function() {
    this.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kanbn-test-'));
    this.taskPath = path.join(this.tempDir, 'task.md');
  },
  afterEach: function() {
    try {
      fs.unlinkSync(this.taskPath);
      fs.rmdirSync(this.tempDir);
    } catch (error) {
      // Ignore errors during cleanup
    }
  }
});

QUnit.test('should parse references from markdown', function(assert) {
  const markdown = `---
created: 2023-05-01T12:00:00.000Z
updated: 2023-05-01T12:00:00.000Z
references:
  - https://example.com/reference1
  - https://github.com/decision-crafters/kanbn/issues/123
---

# Test Task

Task description

## References

- https://example.com/reference1
- https://github.com/decision-crafters/kanbn/issues/123

## Comments

- author: User
  date: 2023-05-01T12:00:00.000Z
  This is a comment
`;

  fs.writeFileSync(this.taskPath, markdown);
  const task = parseTask.md2json(markdown);
  
  assert.ok(task.metadata.references, 'References array exists in metadata');
  assert.equal(task.metadata.references.length, 2, 'References array has correct length');
  assert.equal(task.metadata.references[0], 'https://example.com/reference1', 'First reference is correct');
  assert.equal(task.metadata.references[1], 'https://github.com/decision-crafters/kanbn/issues/123', 'Second reference is correct');
});

QUnit.test('should convert task with references to markdown', function(assert) {
  const task = {
    name: 'Test Task',
    description: 'Task description',
    metadata: {
      created: new Date('2023-05-01T12:00:00.000Z'),
      updated: new Date('2023-05-01T12:00:00.000Z'),
      references: [
        'https://example.com/reference1',
        'https://github.com/decision-crafters/kanbn/issues/123'
      ]
    }
  };
  
  const markdown = parseTask.json2md(task);
  
  assert.ok(markdown.includes('references:'), 'Markdown includes references field');
  assert.ok(markdown.includes('- https://example.com/reference1'), 'Markdown includes first reference');
  assert.ok(markdown.includes('- https://github.com/decision-crafters/kanbn/issues/123'), 'Markdown includes second reference');
  assert.ok(markdown.includes('## References'), 'Markdown includes References section');
});

QUnit.test('should validate references in metadata', function(assert) {
  const validMetadata = {
    references: [
      'https://example.com/reference1',
      'https://github.com/decision-crafters/kanbn/issues/123'
    ]
  };
  
  const invalidMetadata = {
    references: 'not an array'
  };
  
  assert.throws(
    function() {
      parseTask.validateMetadataFromJSON(invalidMetadata);
    },
    /references/,
    'Throws error for invalid references format'
  );
  
  assert.ok(parseTask.validateMetadataFromJSON(validMetadata), 'Validates correct references format');
});

QUnit.test('should handle empty references array', function(assert) {
  const task = {
    name: 'Test Task',
    description: 'Task description',
    metadata: {
      created: new Date('2023-05-01T12:00:00.000Z'),
      updated: new Date('2023-05-01T12:00:00.000Z'),
      references: []
    }
  };
  
  const markdown = parseTask.json2md(task);
  
  assert.ok(markdown.includes('references:'), 'Markdown includes references field');
  assert.ok(!markdown.includes('## References'), 'Markdown does not include References section for empty array');
});
