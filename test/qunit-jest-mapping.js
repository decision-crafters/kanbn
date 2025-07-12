// QUnit to Jest assertion mapping utilities
// This file provides utilities to help migrate QUnit assertions to Jest equivalents

const assertionMappings = {
  // Basic assertions
  'assert.ok': 'expect().toBeTruthy()',
  'assert.notOk': 'expect().toBeFalsy()',
  'assert.equal': 'expect().toBe()',
  'assert.notEqual': 'expect().not.toBe()',
  'assert.strictEqual': 'expect().toBe()',
  'assert.notStrictEqual': 'expect().not.toBe()',
  'assert.deepEqual': 'expect().toEqual()',
  'assert.notDeepEqual': 'expect().not.toEqual()',
  
  // Custom assertions
  'assert.throws': 'expect().toThrow()',
  'assert.throwsAsync': 'expect().toThrowAsync()',
  'assert.contains': 'expect().toContain()',
  
  // Promise assertions
  'assert.rejects': 'expect().rejects.toThrow()',
  'assert.resolves': 'expect().resolves.toBe()'
};

/**
 * Convert QUnit assertion to Jest equivalent
 * @param {string} qunitAssertion - The QUnit assertion pattern
 * @param {string} actual - The actual value being tested
 * @param {string} expected - The expected value
 * @param {string} message - Optional assertion message
 * @returns {string} Jest equivalent assertion
 */
function convertAssertion(qunitAssertion, actual, expected, message) {
  const mapping = assertionMappings[qunitAssertion];
  if (!mapping) {
    throw new Error(`No mapping found for QUnit assertion: ${qunitAssertion}`);
  }
  
  let jestAssertion;
  
  switch (qunitAssertion) {
    case 'assert.ok':
      jestAssertion = `expect(${actual}).toBeTruthy()`;
      break;
    case 'assert.notOk':
      jestAssertion = `expect(${actual}).toBeFalsy()`;
      break;
    case 'assert.equal':
    case 'assert.strictEqual':
      jestAssertion = `expect(${actual}).toBe(${expected})`;
      break;
    case 'assert.notEqual':
    case 'assert.notStrictEqual':
      jestAssertion = `expect(${actual}).not.toBe(${expected})`;
      break;
    case 'assert.deepEqual':
      jestAssertion = `expect(${actual}).toEqual(${expected})`;
      break;
    case 'assert.notDeepEqual':
      jestAssertion = `expect(${actual}).not.toEqual(${expected})`;
      break;
    case 'assert.throws':
      jestAssertion = `expect(${actual}).toThrow(${expected || ''})`;
      break;
    case 'assert.throwsAsync':
      jestAssertion = `await expect(${actual}).toThrowAsync(${expected || ''})`;
      break;
    case 'assert.contains':
      jestAssertion = `expect(${actual}).toContain(${expected})`;
      break;
    default:
      jestAssertion = mapping.replace('()', `(${actual})`);
      if (expected) {
        jestAssertion = jestAssertion.replace('()', `(${expected})`);
      }
  }
  
  return jestAssertion;
}

/**
 * Convert QUnit test structure to Jest
 * @param {string} qunitCode - QUnit test code
 * @returns {string} Jest equivalent code
 */
function convertTestStructure(qunitCode) {
  let jestCode = qunitCode;
  
  // Convert QUnit.module to describe
  jestCode = jestCode.replace(/QUnit\.module\(['"](.*?)['"]\s*,\s*{/g, "describe('$1', () => {");
  jestCode = jestCode.replace(/QUnit\.module\(['"](.*?)['"]\s*,\s*function\s*\(\s*\)\s*{/g, "describe('$1', () => {");
  
  // Convert QUnit.test to test
  jestCode = jestCode.replace(/QUnit\.test\(['"](.*?)['"]\s*,\s*async\s+function\s*\(\s*assert\s*\)\s*{/g, "test('$1', async () => {");
  jestCode = jestCode.replace(/QUnit\.test\(['"](.*?)['"]\s*,\s*function\s*\(\s*assert\s*\)\s*{/g, "test('$1', () => {");
  
  // Convert hooks
  jestCode = jestCode.replace(/before\s*:\s*function\s*\(\s*\)\s*{/g, 'beforeAll(() => {');
  jestCode = jestCode.replace(/beforeEach\s*:\s*function\s*\(\s*\)\s*{/g, 'beforeEach(() => {');
  jestCode = jestCode.replace(/afterEach\s*:\s*function\s*\(\s*\)\s*{/g, 'afterEach(() => {');
  jestCode = jestCode.replace(/after\s*:\s*function\s*\(\s*\)\s*{/g, 'afterAll(() => {');
  
  return jestCode;
}

/**
 * Get Jest imports needed for a converted test file
 * @returns {string} Import statements
 */
function getJestImports() {
  return `const { createTestEnvironment } = require('./migration-utils');
require('./jest-helpers');
`;
}

/**
 * Convert QUnit custom assertion imports
 * @param {string} code - Code containing QUnit imports
 * @returns {string} Code with Jest imports
 */
function convertImports(code) {
  let convertedCode = code;
  
  // Remove QUnit custom assertion imports
  convertedCode = convertedCode.replace(/require\(['"]\.\.\/qunit-throws-async['"]\);?\n?/g, '');
  convertedCode = convertedCode.replace(/require\(['"]\.\.\/qunit-contains['"]\);?\n?/g, '');
  
  // Add Jest helpers import if not present
  if (!convertedCode.includes('./jest-helpers')) {
    convertedCode = `require('./jest-helpers');\n${convertedCode}`;
  }
  
  return convertedCode;
}

module.exports = {
  assertionMappings,
  convertAssertion,
  convertTestStructure,
  getJestImports,
  convertImports
};