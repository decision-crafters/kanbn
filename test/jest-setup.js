/**
 * Jest setup file for Kanbn
 * 
 * This file provides custom matchers and utilities for Jest tests
 * that are equivalent to the QUnit custom assertions.
 */

const stripAnsi = require('strip-ansi');

// Add custom matchers
expect.extend({
  /**
   * Check if an async function throws an error
   * Equivalent to QUnit's throwsAsync assertion
   */
  async toThrowAsync(received, expected) {
    if (typeof received !== 'function') {
      throw new Error('Received value must be a function');
    }
    
    try {
      await received();
      return {
        pass: false,
        message: () => 'Expected function to throw an error, but it did not'
      };
    } catch (error) {
      const errorMessage = error.message;
      
      if (!expected) {
        return {
          pass: true,
          message: () => `Expected function not to throw, but it threw: ${errorMessage}`
        };
      }
      
      if (expected instanceof RegExp) {
        const pass = expected.test(errorMessage);
        return {
          pass,
          message: () => pass
            ? `Expected error message not to match ${expected}, but it was: ${errorMessage}`
            : `Expected error message to match ${expected}, but it was: ${errorMessage}`
        };
      }
      
      const pass = expected === errorMessage;
      return {
        pass,
        message: () => pass
          ? `Expected error message not to be: ${expected}`
          : `Expected error message to be: ${expected}, but it was: ${errorMessage}`
      };
    }
  },
  
  /**
   * Check if an array contains a matching string
   * Equivalent to QUnit's contains assertion
   */
  toContainMatch(received, expected) {
    if (!Array.isArray(received)) {
      throw new Error('Received value must be an array');
    }
    
    const regex = typeof expected === 'string' ? new RegExp(expected) : expected;
    
    // Strip ANSI escape codes from each line
    const strippedLines = received.map(line => stripAnsi(line));
    
    // Check if any line matches the regex
    const pass = strippedLines.some(line => regex.test(line));
    
    return {
      pass,
      message: () => pass
        ? `Expected array not to contain a match for ${regex}, but it did`
        : `Expected array to contain a match for ${regex}, but it did not. Array contents: \n${strippedLines.join('\n')}`
    };
  }
});

// Set up global environment variables for tests
process.env.KANBN_ENV = process.env.KANBN_ENV || 'test';

// Mock console methods to reduce noise during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Only disable console output if not in verbose mode
if (!process.env.VERBOSE) {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
}

// Restore console methods after tests
afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});