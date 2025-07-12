require('./jest.matchers');

// Jest setup for real filesystem testing
// Individual tests handle their own fixture cleanup
// No global mock-fs restoration needed

// Set test environment
process.env.KANBN_ENV = 'test';

// Import custom Jest matchers
require('./jest-helpers');
