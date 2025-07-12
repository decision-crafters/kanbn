module.exports = {
  // Test environment configuration
  testEnvironment: 'node',
  
  // Match all test files in unit and integration directories
  testMatch: [
    // Match all Jest test files
    '**/test/**/*.test.js',
    // Include legacy QUnit tests that might still exist during migration
    '**/test/integration/*.jest.test.js'
  ],
  
  // Test setup and teardown
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.js'],
  globalSetup: '<rootDir>/test/jest.global-setup.js',   // Optional global setup
  globalTeardown: '<rootDir>/test/jest.global-teardown.js',  // Optional global teardown
  
  // Increase timeout for filesystem operations
  testTimeout: 10000, // 10 seconds timeout for filesystem tests
  
  // Coverage reporting
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!**/node_modules/**',
    '!**/test/**'
  ],
  
  // Migration helpers
  projects: [
    {
      displayName: 'jest',
      testMatch: ['**/test/**/*.test.js']
    },
    {
      displayName: 'qunit',
      testMatch: ['**/test/**/*.qunit.js'],
      // QUnit specific configuration would go here
    }
  ],
  
  // Cache configuration for faster tests
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Verbose output for debugging
  verbose: true
};

