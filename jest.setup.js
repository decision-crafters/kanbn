/**
 * Jest setup file for Kanbn
 * 
 * This file runs before each test file and sets up the test environment.
 */

// Load environment variables from .env file
try {
  const dotenv = require('dotenv');
  const result = dotenv.config();
  console.log('Environment variables loaded from .env file');
} catch (error) {
  console.error('Error loading .env file:', error.message);
}

// Set test environment
process.env.KANBN_ENV = 'test';

// Set up global test utilities if needed
global.testUtils = {
  // Add any test utilities here
};

// Configure Jest timeouts
jest.setTimeout(60000); // 60 second timeout per test