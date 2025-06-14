# QUnit to Jest Migration Issue

This document tracks the ongoing effort to migrate all QUnit based tests to Jest.

## Phase 1 Priority Files
- `test/unit/main.test.js`
- `test/unit/create.test.js`
- `test/unit/move.test.js`
- `test/unit/task-utils.test.js`
- `test/unit/file-utils.test.js`
- `test/unit/initialise.test.js`
- `test/unit/rename.test.js`

Each file should be migrated independently so that debugging and reviews remain focused. Once a file is converted and verified under Jest, open a pull request referencing this document and the related issue.

See `JEST_MIGRATION_GUIDE.md` for general migration tips.
