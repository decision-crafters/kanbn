/**
 * Global Jest setup - runs once before all tests
 *
 * This file supports the filesystem testing practices outlined in ADR-0012
 * It handles one-time setup operations for both real and virtual filesystem tests
 */

const os = require('os');
const fs = require('fs-extra');
const path = require('path');

module.exports = async () => {
  // Create root temp directory for all tests
  const testRootDir = path.join(os.tmpdir(), 'kanbn-tests');
  
  // Ensure clean slate by removing any leftover test directories
  if (fs.existsSync(testRootDir)) {
    await fs.remove(testRootDir);
  }
  
  // Create fresh test root directory
  await fs.ensureDir(testRootDir);
  
  // Store the directory path in the global namespace
  global.__KANBN_TEST_ROOT_DIR__ = testRootDir;
  
  // Set test environment variable
  process.env.KANBN_ENV = 'test';
  
  console.log(`Global test directory created at ${testRootDir}`);
};
