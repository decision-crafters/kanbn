const mockFs = require('mock-fs');
require('./jest.matchers');

afterEach(() => {
  mockFs.restore();
});
