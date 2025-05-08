#!/usr/bin/env node

/**
 * Script to migrate QUnit tests to Jest format
 * 
 * This script automates the conversion of QUnit test files to Jest format.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const TEST_UNIT_DIR = path.join(__dirname, '..', 'test', 'unit');

// Helper functions
function findTestFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`Error: Directory does not exist: ${dir}`);
    return [];
  }
  
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  return files.reduce((testFiles, file) => {
    const filePath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      return [...testFiles, ...findTestFiles(filePath)];
    } else if (file.name.endsWith('.test.js')) {
      return [...testFiles, filePath];
    }
    
    return testFiles;
  }, []);
}

function migrateTestFile(filePath) {
  console.log(`Migrating: ${filePath}`);
  
  try {
    // Read the file content
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Extract the module name
    const moduleMatch = content.match(/QUnit\.module\(['"](.*?)['"]/);
    const moduleName = moduleMatch ? moduleMatch[1] : path.basename(filePath, '.test.js');
    
    // Replace QUnit.module with Jest describe
    content = content.replace(
      /QUnit\.module\(['"](.+?)['"](?:,\s*\{([\s\S]*?)\})?\);/,
      (match, name, hooks) => {
        let result = `describe('${name}', () => {`;
        
        // Handle hooks if present
        if (hooks) {
          // Extract beforeEach and afterEach
          const beforeEachMatch = hooks.match(/beforeEach\(\)\s*\{([\s\S]*?)\}/);
          const afterEachMatch = hooks.match(/afterEach\(\)\s*\{([\s\S]*?)\}/);
          const beforeMatch = hooks.match(/before\(\)\s*\{([\s\S]*?)\}/);
          const afterMatch = hooks.match(/after\(\)\s*\{([\s\S]*?)\}/);
          
          // Add beforeAll if present
          if (beforeMatch) {
            result += `\n  beforeAll(() => {${beforeMatch[1]}\n  });`;
          }
          
          // Add beforeEach if present
          if (beforeEachMatch) {
            result += `\n  beforeEach(() => {${beforeEachMatch[1]}\n  });`;
          }
          
          // Add afterEach if present
          if (afterEachMatch) {
            result += `\n  afterEach(() => {${afterEachMatch[1]}\n  });`;
          }
          
          // Add afterAll if present
          if (afterMatch) {
            result += `\n  afterAll(() => {${afterMatch[1]}\n  });`;
          }
        }
        
        return result;
      }
    );
    
    // Replace QUnit.test with Jest test
    content = content.replace(
      /QUnit\.test\(['"](.+?)['"](?:,\s*)?([\s\S]*?)\);\s*(?=QUnit\.test|$)/g,
      (match, name, testFn) => {
        // Check if the test function is async
        const isAsync = testFn.includes('async');
        
        // Replace assert.throwsAsync with expect().toThrowAsync
        testFn = testFn.replace(
          /assert\.throwsAsync\(\s*([\s\S]*?),\s*([\s\S]*?)\)/g,
          'await expect($1).toThrowAsync($2)'
        );
        
        // Replace assert.equal with expect().toEqual
        testFn = testFn.replace(
          /assert\.equal\(([^,]+),\s*([^,)]+)(?:,\s*['"]([^'"]+)['"])?\)/g,
          'expect($1).toEqual($2)'
        );
        
        // Replace assert.strictEqual with expect().toEqual
        testFn = testFn.replace(
          /assert\.strictEqual\(([^,]+),\s*([^,)]+)(?:,\s*['"]([^'"]+)['"])?\)/g,
          'expect($1).toEqual($2)'
        );
        
        // Replace assert.notEqual with expect().not.toEqual
        testFn = testFn.replace(
          /assert\.notEqual\(([^,]+),\s*([^,)]+)(?:,\s*['"]([^'"]+)['"])?\)/g,
          'expect($1).not.toEqual($2)'
        );
        
        // Replace assert.deepEqual with expect().toEqual
        testFn = testFn.replace(
          /assert\.deepEqual\(([^,]+),\s*([^,)]+)(?:,\s*['"]([^'"]+)['"])?\)/g,
          'expect($1).toEqual($2)'
        );
        
        // Replace assert.ok with expect().toBeTruthy
        testFn = testFn.replace(
          /assert\.ok\(([^,)]+)(?:,\s*['"]([^'"]+)['"])?\)/g,
          'expect($1).toBeTruthy()'
        );
        
        // Replace assert.contains with expect().toContainMatch
        testFn = testFn.replace(
          /assert\.contains\(([^,]+),\s*([^,)]+)(?:,\s*['"]([^'"]+)['"])?\)/g,
          'expect($1).toContainMatch($2)'
        );
        
        // Replace assert parameter with empty parameter
        testFn = testFn.replace(/^\s*async\s+assert\s+=>/g, 'async () =>');
        testFn = testFn.replace(/^\s*assert\s+=>/g, '() =>');
        
        return `  test('${name}', ${testFn});\n\n`;
      }
    );
    
    // Add closing bracket for describe block
    if (!content.endsWith('});')) {
      content += '});\\';
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, content);
    console.log(`  ✓ Successfully migrated: ${filePath}`);
    
    return true;
  } catch (error) {
    console.error(`  ✗ Error migrating ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
function main() {
  console.log('Migrating QUnit tests to Jest format...');
  
  // Find all test files
  const testFiles = findTestFiles(TEST_UNIT_DIR);
  console.log(`Found ${testFiles.length} test files to migrate.`);
  
  // Migrate each test file
  let successCount = 0;
  let failCount = 0;
  
  for (const testFile of testFiles) {
    const success = migrateTestFile(testFile);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log('\nMigration complete!');
  console.log(`  ✓ Successfully migrated: ${successCount} files`);
  console.log(`  ✗ Failed to migrate: ${failCount} files`);
}

// Run the script
main();