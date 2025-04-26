#!/usr/bin/env node

/**
 * Centralized test runner for Kanbn
 * 
 * This script handles all test execution, providing consistent output and 
 * configurable test filtering with command line arguments.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env file
try {
  const dotenv = require('dotenv');
  const result = dotenv.config();
  console.log('DEBUG: dotenv result:', result.parsed ? 'Success' : 'Failed');
  if (result.parsed) {
    console.log('DEBUG: dotenv parsed:', Object.keys(result.parsed).join(', '));
    console.log('Environment variables loaded:');
    if (result.parsed.OPENROUTER_API_KEY) {
      // Mask most of the API key for security
      const keyLength = result.parsed.OPENROUTER_API_KEY.length;
      const maskedKey = result.parsed.OPENROUTER_API_KEY.substring(0, 5) + '...' + ' (' + keyLength + ' chars)';
      console.log('OPENROUTER_API_KEY:', maskedKey);
    }
    if (result.parsed.OPENROUTER_MODEL) {
      console.log('OPENROUTER_MODEL:', result.parsed.OPENROUTER_MODEL);
    }
  }
} catch (error) {
  console.error('Error loading .env file:', error.message);
}

// Configuration
const TEST_ENV = 'test';
const TEST_DIRS = {
  unit: path.join(__dirname, '..', 'test', 'unit'),
  integration: path.join(__dirname, '..', 'test', 'integration'),
  root: path.join(__dirname, '..', 'test')
};

// Parse command line arguments
const args = process.argv.slice(2);
const runUnitOnly = args.includes('--unit');
const runIntegrationOnly = args.includes('--integration');
const generateReport = args.includes('--report');
const reportPath = args.includes('--report-path') 
  ? args[args.indexOf('--report-path') + 1] 
  : path.join(__dirname, '..', 'test-report.html');

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

function runTests(testFiles) {
  if (testFiles.length === 0) {
    console.log('No test files found');
    return { success: true, output: 'No test files found' };
  }

  console.log(`Running ${testFiles.length} test files...`);
  
  // Create a temporary test runner file
  const tempRunnerFile = path.join(__dirname, 'temp-test-runner.js');
  const testFilePaths = testFiles.map(file => `'${file}'`).join(',\n  ');
  
  const runnerContent = `
// Temporary QUnit test runner
const QUnit = require('qunit');

// Make QUnit available globally so test files can access it
global.QUnit = QUnit;

// Configure QUnit
QUnit.config.testTimeout = 60000; // 60 second timeout per test

// Load dotenv in the test runner too
try {
  const dotenv = require('dotenv');
  const result = dotenv.config();
  console.log('DEBUG: dotenv result:', result.parsed ? 'Success' : 'Failed');
  console.log('DEBUG: dotenv parsed:', Object.keys(result.parsed).join(', '));
  console.log('Environment variables loaded:');
  if (process.env.OPENROUTER_API_KEY) {
    // Mask most of the API key for security
    const keyLength = process.env.OPENROUTER_API_KEY.length;
    const maskedKey = process.env.OPENROUTER_API_KEY.substring(0, 5) + '...' + ' (' + keyLength + ' chars)';
    console.log('OPENROUTER_API_KEY:', maskedKey);
  }
  if (process.env.OPENROUTER_MODEL) {
    console.log('OPENROUTER_MODEL:', process.env.OPENROUTER_MODEL);
  }
} catch (error) {
  console.error('Error loading .env file:', error.message);
}

// Load test files manually
const testFiles = [
  ${testFilePaths}
];

console.log('Loading test files...');
testFiles.forEach(function(testFile) {
  try {
    require(testFile);
  } catch (error) {
    console.error('Error loading test file ' + testFile + ':', error);
  }
});

// Run QUnit
QUnit.start();
`;

  fs.writeFileSync(tempRunnerFile, runnerContent);
  
  try {
    // Run the temporary test runner
    // Ensure API key from .env is passed to the test process
    const env = { 
      ...process.env, 
      KANBN_ENV: TEST_ENV,
      // Copy over the API key explicitly if it exists in .env
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || ''
    };
    const result = spawnSync('node', [tempRunnerFile], {
      env,
      stdio: 'pipe',
      encoding: 'utf8'
    });
    
    const output = result.stdout + (result.stderr || '');
    
    return { 
      success: result.status === 0, 
      output 
    };
  } finally {
    // Clean up the temporary file
    if (fs.existsSync(tempRunnerFile)) {
      fs.unlinkSync(tempRunnerFile);
    }
  }
}

function generateHtmlReport(testOutput, outputPath) {
  // Simple HTML template for test results
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kanbn Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    h1, h2 { color: #333; }
    pre { 
      background-color: #f5f5f5; 
      padding: 15px; 
      border-radius: 5px; 
      white-space: pre-wrap;
      overflow-wrap: break-word;
    }
    .summary { margin-bottom: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 5px; }
    .timestamp { color: #777; font-size: 0.9em; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>Kanbn Test Report</h1>
  
  <div class="summary">
    <h2>Summary</h2>
    <div>Report generated at: ${new Date().toLocaleString()}</div>
  </div>
  
  <h2>Test Output</h2>
  <pre>${testOutput}</pre>
  
  <div class="timestamp">Generated by run-tests.js</div>
</body>
</html>
  `;
  
  fs.writeFileSync(outputPath, htmlTemplate);
  console.log(`HTML report generated at: ${outputPath}`);
}

// Main execution
function main() {
  let testFiles = [];
  
  if (runUnitOnly) {
    console.log('Running unit tests only');
    testFiles = findTestFiles(TEST_DIRS.unit);
  } else if (runIntegrationOnly) {
    console.log('Running integration tests only');
    testFiles = findTestFiles(TEST_DIRS.integration);
  } else {
    console.log('Running all tests');
    testFiles = [
      ...findTestFiles(TEST_DIRS.root)
    ];
  }
  
  const testResult = runTests(testFiles);
  
  // Display test results
  console.log(testResult.output);
  
  // Generate HTML report if requested
  if (generateReport) {
    generateHtmlReport(testResult.output, reportPath);
  }
  
  // Exit with appropriate code
  process.exit(testResult.success ? 0 : 1);
}

// Run the script
main();
