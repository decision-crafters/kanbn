const kanbnFactory = require('../../src/main');
const mockDate = require('mockdate');

describe('simple status test', () => {
  beforeEach(() => {
    mockDate.set('02 Jan 2000 00:00:00 GMT');
  });

  afterEach(() => {
    mockDate.reset();
  });

  test('should be able to create kanbn instance', () => {
    const kanbn = kanbnFactory('/tmp/test');
    expect(kanbn).toBeDefined();
    expect(typeof kanbn.status).toBe('function');
  });
});