#!/usr/bin/env node

/**
 * Simplified test runner that delegates to Jest.
 * Supports optional unit/integration selection and HTML report generation.
 */
const { spawnSync } = require('child_process');
const path = require('path');

// Load environment variables from .env
try {
  require('dotenv').config();
} catch (err) {
  console.error('Error loading .env file:', err.message);
}

const args = process.argv.slice(2);
const runUnitOnly = args.includes('--unit');
const runIntegrationOnly = args.includes('--integration');
const generateReport = args.includes('--report');
const reportPath = args.includes('--report-path')
  ? args[args.indexOf('--report-path') + 1]
  : path.join(__dirname, '..', 'test-report.html');

const jestArgs = [];
if (runUnitOnly) {
  jestArgs.push('test/unit');
} else if (runIntegrationOnly) {
  jestArgs.push('test/integration');
}

if (generateReport) {
  process.env.JEST_HTML_REPORTER_OUTPUT_PATH = reportPath;
  jestArgs.push('--reporters=default', '--reporters=jest-html-reporter');
}

const result = spawnSync(
  path.join('node_modules', '.bin', 'jest'),
  jestArgs,
  { stdio: 'inherit', env: { ...process.env, KANBN_ENV: 'test' } }
);

process.exit(result.status);
