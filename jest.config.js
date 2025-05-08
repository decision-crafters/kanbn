// jest.config.js
module.exports = {
  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // The test environment that will be used for testing
  testEnvironment: 'node',

  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/test/**/*.test.js',
    '**/test/**/*.spec.js',
  ],

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    'src/**/*.js', // Adjust this to match your source file structure
    '!src/main.js', // Example: Exclude main.js if it's just an entry point
    // Add other exclusions as necessary, e.g., '!src/config/**'
  ],

  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: [
    'text',
    'lcov',
    'clover',
  ],

  // We can specify 'c8' if installed, otherwise Jest uses its default (v8 or babel)
  // coverageProvider: 'c8',
};
