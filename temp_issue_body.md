**Test File to Migrate**
File Path: `test/integration/add-controller.test.js`

**Current QUnit Patterns Found**
- [ ] `QUnit.module()` usage
- [ ] `QUnit.test()` usage
- [ ] `assert.ok()` assertions
- [ ] `assert.equal()` assertions
- [ ] `assert.notEqual()` assertions
- [ ] `assert.deepEqual()` assertions
- [ ] `assert.throws()` assertions
- [ ] Setup/teardown hooks
- [ ] Async test patterns

**Required Jest Conversions**
- [ ] Convert `QUnit.module('name', function() { ... })` to `describe('name', () => { ... })`
- [ ] Convert `QUnit.test('name', function(assert) { ... })` to `test('name', () => { ... })`
- [ ] Convert `assert.ok(value)` to `expect(value).toBeTruthy()`
- [ ] Convert `assert.equal(actual, expected)` to `expect(actual).toBe(expected)`
- [ ] Convert `assert.notEqual(actual, expected)` to `expect(actual).not.toBe(expected)`
- [ ] Convert `assert.deepEqual(actual, expected)` to `expect(actual).toEqual(expected)`
- [ ] Convert `assert.throws(fn)` to `expect(fn).toThrow()`
- [ ] Convert setup/teardown to `beforeEach`/`afterEach` hooks
- [ ] Update async patterns to use Jest async/await or Promise patterns

**Integration Test Specific Considerations**
- [ ] Review controller mocking patterns
- [ ] Verify file system operations work with Jest
- [ ] Check async/await patterns in controller tests
- [ ] Ensure proper cleanup of test artifacts

**Migration Guidelines**
1. **Preserve Test Logic**: Ensure all original test logic and coverage is maintained
2. **Remove QUnit Dependencies**: Remove any `require` statements for QUnit
3. **Update Assertions**: Convert all QUnit assertions to Jest equivalents
4. **Handle Async Tests**: Update async test patterns to Jest standards
5. **Maintain File Structure**: Keep the same test organization and naming

**Acceptance Criteria**
- [ ] Test file runs successfully with `npm test`
- [ ] All QUnit syntax has been converted to Jest
- [ ] No QUnit dependencies remain in the file
- [ ] All original test cases pass with Jest
- [ ] Test coverage is maintained or improved
- [ ] No console errors or warnings during test execution
- [ ] File follows Jest best practices and project conventions

**References**
- [Jest Migration Guide](../JEST_MIGRATION_GUIDE.md)
- [QUnit to Jest Migration Template](../.github/ISSUE_TEMPLATE/qunit_to_jest_migration.md)