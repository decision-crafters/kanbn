# Jest Migration Guide

## Infrastructure Ready
- Custom helpers in `test/jest-helpers.js`
- Custom matchers registered via `expect.extend`
- Proof of concept tests in `test/jest-infrastructure.test.js`

## Next Steps
1. Convert existing QUnit tests to Jest using the helpers.
2. Replace `QUnit.module` with `describe` blocks and `QUnit.test` with `test`.
3. Swap assertions (e.g., `assert.equal` -> `expect(...).toBe(...)`).
4. Remove QUnit from dependencies once all tests are migrated.

This file outlines the standard patterns for migrating the remaining test files.
