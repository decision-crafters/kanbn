const context = require('./context');

const assert = {
  equal: (actual, expected) => expect(actual).toBe(expected),
  strictEqual: (actual, expected) => expect(actual).toBe(expected),
  notEqual: (actual, expected) => expect(actual).not.toBe(expected),
  deepEqual: (actual, expected) => expect(actual).toEqual(expected),
  ok: (value, message) => expect(value).toBeTruthy()
};

const assertFirst = new Set([
  'kanbnFolderExists',
  'tasksFolderExists',
  'archiveFolderExists',
  'indexExists',
  'indexHasName',
  'indexHasDescription',
  'indexHasColumns',
  'indexHasOptions',
  'indexHasTask',
  'taskFileExists',
  'archivedTaskFileExists',
  'taskHasName',
  'taskHasDescription',
  'taskHasMetadata',
  'taskHasSubTasks',
  'taskHasRelations',
  'taskHasPositionInColumn',
  'taskHasComments'
]);

const wrapped = {};
for (const [name, fn] of Object.entries(context)) {
  if (typeof fn === 'function') {
    wrapped[name] = (...args) => {
      if (assertFirst.has(name)) {
        return fn(assert, ...args);
      }
      return fn(...args);
    };
  } else {
    wrapped[name] = fn;
  }
}

module.exports = wrapped;
