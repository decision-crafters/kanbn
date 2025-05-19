/**
 * Example Jest test file to verify Jest setup
 */

describe('Jest Setup', () => {
  test('Jest is configured correctly', () => {
    expect(true).toBe(true);
  });

  test('Environment variables are set correctly', () => {
    expect(process.env.KANBN_ENV).toBe('test');
  });
});