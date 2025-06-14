const stripAnsi = require('strip-ansi');

expect.extend({
  async toThrowAsync(received, expected) {
    try {
      await received();
    } catch (error) {
      if (expected instanceof RegExp) {
        const pass = expected.test(error.message);
        return {
          pass,
          message: () => `expected error message to${pass ? ' not' : ''} match ${expected}`
        };
      }
      if (typeof expected === 'string') {
        const pass = error.message === expected;
        return {
          pass,
          message: () => `expected error message to${pass ? ' not' : ''} be "${expected}"`
        };
      }
      return { pass: true, message: () => 'function threw as expected' };
    }
    return { pass: false, message: () => 'function did not throw' };
  },

  toContainText(receivedArray, expected) {
    const regex = typeof expected === 'string' ? new RegExp(expected) : expected;
    const actual = receivedArray.map(item => stripAnsi(item));
    const pass = actual.some(item => regex.test(item));
    return {
      pass,
      message: () => `expected array to${pass ? ' not' : ''} contain text matching ${regex}`
    };
  }
});
