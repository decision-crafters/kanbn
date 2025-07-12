/**
 * Global Jest teardown - runs once after all tests
 *
 * This file supports the filesystem testing practices outlined in ADR-0012
 * It handles cleanup operations for both real and virtual filesystem tests
 */

const fs = require('fs-extra');

module.exports = async () => {
  // Clean up the global test directory
  if (global.__KANBN_TEST_ROOT_DIR__) {
    try {
      await fs.remove(global.__KANBN_TEST_ROOT_DIR__);
      console.log(`Cleaned up global test directory at ${global.__KANBN_TEST_ROOT_DIR__}`);
    } catch (err) {
      console.warn(`Warning: Failed to clean up test directory: ${err.message}`);
    }
    
    // Clear the global reference
    delete global.__KANBN_TEST_ROOT_DIR__;
  }
};
