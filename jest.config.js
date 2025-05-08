/**
 * Jest configuration for Kanbn
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test match patterns
  testMatch: [
    '**/test/simple.test.js',
    '**/test/unit/simple-create.test.js'
  ],
  
  // Test timeout (60 seconds)
  testTimeout: 60000,
  
  // Setup files
  setupFilesAfterEnv: ['./test/jest-setup.js'],
  
  // Coverage collection
  collectCoverage: false,
  coverageDirectory: './coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/prompts/**'
  ],
  
  // Reporters
  reporters: [
    'default'
  ],
  
  // Verbose output
  verbose: true
};
