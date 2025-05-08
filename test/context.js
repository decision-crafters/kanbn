const fs = require('fs');
const path = require('path');
const parseIndex = require('../src/parse-index');
const parseTask = require('../src/parse-task');
const mockStdIn = require('mock-stdin').stdin();

function loadIndex(basePath) {
  return parseIndex.md2json(fs.readFileSync(path.join(basePath, 'index.md'), { encoding: 'utf-8' }));
}

function loadTask(basePath, taskId) {
  return parseTask.md2json(fs.readFileSync(path.join(basePath, 'tasks', `${taskId}.md`), { encoding: 'utf-8' }));
}

module.exports = {

  keys: {
    up: '\x1B\x5B\x41',
    down: '\x1B\x5B\x42',
    enter: '\x0D',
    space: '\x20',
    ctrl_c: '\x03'
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  async sendInput(inputs) {
    for (let input of inputs) {
      mockStdIn.send(input);
      await this.sleep(50);
    }
  },

  kanbnFolderExists(assert, basePath, expected = true) {
    if (assert.ok) {
      // Jest style
      assert.ok(fs.existsSync(basePath) === expected);
      return fs.existsSync(basePath) === expected;
    } else {
      // QUnit style
      assert.equal(fs.existsSync(basePath), expected);
    }
  },

  tasksFolderExists(assert, basePath, expected = true, tasksFolderName = 'tasks') {
    if (assert.ok) {
      // Jest style
      assert.ok(fs.existsSync(path.join(basePath, tasksFolderName)) === expected);
      return fs.existsSync(path.join(basePath, tasksFolderName)) === expected;
    } else {
      // QUnit style
      assert.equal(fs.existsSync(path.join(basePath, tasksFolderName)), expected);
    }
  },

  archiveFolderExists(assert, basePath, expected = true, archiveFolderName = 'archive') {
    if (assert.ok) {
      // Jest style
      assert.ok(fs.existsSync(path.join(basePath, archiveFolderName)) === expected);
      return fs.existsSync(path.join(basePath, archiveFolderName)) === expected;
    } else {
      // QUnit style
      assert.equal(fs.existsSync(path.join(basePath, archiveFolderName)), expected);
    }
  },

  indexExists(assert, basePath, expected = true, indexName = 'index.md') {
    if (assert.ok) {
      // Jest style
      assert.ok(fs.existsSync(path.join(basePath, indexName)) === expected);
      return fs.existsSync(path.join(basePath, indexName)) === expected;
    } else {
      // QUnit style
      assert.equal(fs.existsSync(path.join(basePath, indexName)), expected);
    }
  },

  indexHasName(assert, basePath, name = null) {
    const index = loadIndex(basePath);
    if (assert.ok) {
      // Jest style
      assert.ok('name' in index);
      if (name === null) {
        assert.ok(!!index.name);
      } else {
        expect(index.name).toEqual(name);
      }
      return true;
    } else {
      // QUnit style
      assert.equal('name' in index, true);
      if (name === null) {
        assert.equal(!!index.name, true);
      } else {
        assert.strictEqual(index.name, name);
      }
    }
  },

  indexHasDescription(assert, basePath, description = null) {
    const index = loadIndex(basePath);
    if (assert.ok) {
      // Jest style
      assert.ok('description' in index);
      if (description === null) {
        assert.ok(!!index.description);
      } else {
        expect(index.description).toEqual(description);
      }
      return true;
    } else {
      // QUnit style
      assert.equal('description' in index, true);
      if (description === null) {
        assert.equal(!!index.description, true);
      } else {
        assert.strictEqual(index.description, description);
      }
    }
  },

  indexHasColumns(assert, basePath, columns = null) {
    const index = loadIndex(basePath);
    if (assert.ok) {
      // Jest style
      assert.ok(
        'columns' in index &&
        index.columns !== null &&
        index.columns instanceof Object
      );
      if (columns === null) {
        expect(Object.keys(index.columns).length).toBeGreaterThan(0);
      } else {
        expect(Object.keys(index.columns)).toEqual(columns);
      }
      return true;
    } else {
      // QUnit style
      assert.equal((
        'columns' in index &&
        index.columns !== null &&
        index.columns instanceof Object
      ), true);
      if (columns === null) {
        assert.notEqual(Object.keys(index.columns).length, 0);
      } else {
        assert.deepEqual(Object.keys(index.columns), columns);
      }
    }
  },

  indexHasOptions(assert, basePath, options = null) {
    const index = loadIndex(basePath);
    if (assert.ok) {
      // Jest style
      assert.ok(
        'options' in index &&
        index.options !== null &&
        index.options instanceof Object
      );
      if (options !== null) {
        for (let optionsProperty in options) {
          expect(index.options).toHaveProperty(optionsProperty);
          if (options[optionsProperty] !== null) {
            expect(index.options[optionsProperty]).toEqual(options[optionsProperty]);
          }
        }
      }
      return true;
    } else {
      // QUnit style
      assert.equal((
        'options' in index &&
        index.options !== null &&
        index.options instanceof Object
      ), true);
      if (options !== null) {
        for (let optionsProperty in options) {
          assert.equal(optionsProperty in index.options, true);
          if (options[optionsProperty] !== null) {
            assert.deepEqual(index.options[optionsProperty], options[optionsProperty]);
          }
        }
      }
    }
  },

  indexHasTask(assert, basePath, taskId, columnName = null, expected = true) {
    const index = loadIndex(basePath);
    if (assert.ok) {
      // Jest style
      if (columnName === null) {
        const indexedTasks = Object.keys(index.columns).map(columnName => index.columns[columnName]).flat();
        if (expected) {
          expect(indexedTasks).toContain(taskId);
        } else {
          expect(indexedTasks).not.toContain(taskId);
        }
      } else {
        if (expected) {
          expect(index.columns[columnName]).toContain(taskId);
        } else {
          expect(index.columns[columnName]).not.toContain(taskId);
        }
      }
      return true;
    } else {
      // QUnit style
      if (columnName === null) {
        const indexedTasks = Object.keys(index.columns).map(columnName => index.columns[columnName]).flat();
        assert[expected ? 'notEqual' : 'equal'](indexedTasks.indexOf(taskId), -1);
      } else {
        assert[expected ? 'notEqual' : 'equal'](index.columns[columnName].indexOf(taskId), -1);
      }
    }
  },

  taskFileExists(assert, basePath, taskId, expected = true) {
    if (assert.ok) {
      // Jest style
      assert.ok(fs.existsSync(path.join(basePath, 'tasks', `${taskId}.md`)) === expected);
      return fs.existsSync(path.join(basePath, 'tasks', `${taskId}.md`)) === expected;
    } else {
      // QUnit style
      assert.equal(fs.existsSync(path.join(basePath, 'tasks', `${taskId}.md`)), expected);
    }
  },

  archivedTaskFileExists(assert, basePath, taskId, expected = true) {
    if (assert.ok) {
      // Jest style
      assert.ok(fs.existsSync(path.join(basePath, 'archive', `${taskId}.md`)) === expected);
      return fs.existsSync(path.join(basePath, 'archive', `${taskId}.md`)) === expected;
    } else {
      // QUnit style
      assert.equal(fs.existsSync(path.join(basePath, 'archive', `${taskId}.md`)), expected);
    }
  },

  taskHasName(assert, basePath, taskId, name = null) {
    const task = loadTask(basePath, taskId);
    if (assert.ok) {
      // Jest style
      assert.ok('name' in task);
      if (name === null) {
        assert.ok(!!task.name);
      } else {
        expect(task.name).toEqual(name);
      }
      return true;
    } else {
      // QUnit style
      assert.equal('name' in task, true);
      if (name === null) {
        assert.equal(!!task.name, true);
      } else {
        assert.strictEqual(task.name, name);
      }
    }
  },

  taskHasDescription(assert, basePath, taskId, description = null) {
    const task = loadTask(basePath, taskId);
    if (assert.ok) {
      // Jest style
      assert.ok('description' in task);
      if (description === null) {
        assert.ok(!!task.description);
      } else {
        expect(task.description).toEqual(description);
      }
      return true;
    } else {
      // QUnit style
      assert.equal('description' in task, true);
      if (description === null) {
        assert.equal(!!task.description, true);
      } else {
        assert.strictEqual(task.description, description);
      }
    }
  },

  taskHasMetadata(assert, basePath, taskId, metadata = null) {
    const task = loadTask(basePath, taskId);
    if (assert.ok) {
      // Jest style
      assert.ok(
        'metadata' in task &&
        task.metadata !== null &&
        task.metadata instanceof Object
      );
      if (metadata !== null) {
        for (let metadataProperty in metadata) {
          expect(task.metadata).toHaveProperty(metadataProperty);
          if (metadata[metadataProperty] !== null) {
            expect(task.metadata[metadataProperty]).toEqual(metadata[metadataProperty]);
          }
        }
      }
      return true;
    } else {
      // QUnit style
      assert.equal((
        'metadata' in task &&
        task.metadata !== null &&
        task.metadata instanceof Object
      ), true);
      if (metadata !== null) {
        for (let metadataProperty in metadata) {
          assert.equal(metadataProperty in task.metadata, true);
          if (metadata[metadataProperty] !== null) {
            assert.deepEqual(task.metadata[metadataProperty], metadata[metadataProperty]);
          }
        }
      }
    }
  },

  taskHasSubTasks(assert, basePath, taskId, subTasks = null) {
    const task = loadTask(basePath, taskId);
    if (assert.ok) {
      // Jest style
      assert.ok(
        'subTasks' in task &&
        task.subTasks !== null &&
        Array.isArray(task.subTasks)
      );
      if (subTasks !== null) {
        for (let assertSubTask of subTasks) {
          const found = task.subTasks.some(existingSubTask => (
            existingSubTask.text === assertSubTask.text &&
            existingSubTask.completed === assertSubTask.completed
          ));
          expect(found).toBeTruthy();
        }
      }
      return true;
    } else {
      // QUnit style
      assert.equal((
        'subTasks' in task &&
        task.subTasks !== null &&
        Array.isArray(task.subTasks)
      ), true);
      if (subTasks !== null) {
        for (let assertSubTask of subTasks) {
          assert.notEqual(task.subTasks.findIndex(existingSubTask => (
            existingSubTask.text === assertSubTask.text &&
            existingSubTask.completed === assertSubTask.completed
          )), -1);
        }
      }
    }
  },

  taskHasRelations(assert, basePath, taskId, relations = null) {
    const task = loadTask(basePath, taskId);
    if (assert.ok) {
      // Jest style
      assert.ok(
        'relations' in task &&
        task.relations !== null &&
        Array.isArray(task.relations)
      );
      if (relations !== null) {
        for (let assertRelation of relations) {
          const found = task.relations.some(existingRelation => (
            existingRelation.task === assertRelation.task &&
            existingRelation.type === assertRelation.type
          ));
          expect(found).toBeTruthy();
        }
      }
      return true;
    } else {
      // QUnit style
      assert.equal((
        'relations' in task &&
        task.relations !== null &&
        Array.isArray(task.relations)
      ), true);
      if (relations !== null) {
        for (let assertRelation of relations) {
          assert.notEqual(task.relations.findIndex(existingRelation => (
            existingRelation.task === assertRelation.task &&
            existingRelation.type === assertRelation.type
          )), -1);
        }
      }
    }
  },

  taskHasPositionInColumn(assert, basePath, taskId, columnName, position, expected = true) {
    const index = loadIndex(basePath);
    if (assert.ok) {
      // Jest style
      if (expected) {
        expect(index.columns[columnName].indexOf(taskId)).toBe(position);
      } else {
        expect(index.columns[columnName].indexOf(taskId)).not.toBe(position);
      }
      return true;
    } else {
      // QUnit style
      assert[expected ? 'equal' : 'notEqual'](index.columns[columnName].indexOf(taskId), position);
    }
  },

  taskHasComments(assert, basePath, taskId, comments = null) {
    const task = loadTask(basePath, taskId);
    if (assert.ok) {
      // Jest style
      assert.ok(
        'comments' in task &&
        task.comments !== null &&
        Array.isArray(task.comments)
      );
      if (comments !== null) {
        for (let assertComment of comments) {
          const found = task.comments.some(existingComment => (
            existingComment.text === assertComment.text &&
            existingComment.author === assertComment.author &&
            existingComment.date.toISOString().substr(0, 9) === assertComment.date.toISOString().substr(0, 9)
          ));
          expect(found).toBeTruthy();
        }
      }
      return true;
    } else {
      // QUnit style
      assert.equal((
        'comments' in task &&
        task.comments !== null &&
        Array.isArray(task.comments)
      ), true);
      if (comments !== null) {
        for (let assertComment of comments) {
          assert.notEqual(task.comments.findIndex(existingComment => (
            existingComment.text === assertComment.text &&
            existingComment.author === assertComment.author &&
            existingComment.date.toISOString().substr(0, 9) === assertComment.date.toISOString().substr(0, 9)
          )), -1);
        }
      }
    }
  },
};
