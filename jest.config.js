/**
 * Jest configuration for Kanbn
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test match patterns
  testMatch: [
    '**/test/unit/**/*.test.js',
    '**/test/integration/**/*.test.js',
    '**/test/jest-*.test.js'
  ],
  
  // Coverage configuration
  collectCoverage: false,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!**/node_modules/**'
  ],
  
  // Test timeout
  testTimeout: 60000,
  
  // Reporters
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'Kanbn Test Report',
      outputPath: './test-report.html'
    }]
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    './jest.setup.js'
  ],
  
  // Verbose output
  verbose: true
};
