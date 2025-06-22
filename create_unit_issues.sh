#!/bin/bash

# Script to create GitHub issues for QUnit to Jest migration - Unit Tests

set -e

# Array of unit test files
unit_files=(
    "add-untracked.test.js"
    "ai-service.test.js"
    "archive.test.js"
    "chat-context.test.js"
    "chat-events.test.js"
    "chat-parser.test.js"
    "comment.test.js"
    "context-serializer.test.js"
    "create.test.js"
    "delete.test.js"
    "event-bus.test.js"
    "file-utils.test.js"
    "filter-utils.test.js"
    "find-untracked.test.js"
    "initialise-custom-config.test.js"
    "initialise.test.js"
    "main.test.js"
    "move.test.js"
    "parse-index-json-to-md.test.js"
    "parse-index-md-to-json.test.js"
    "parse-md.test.js"
    "parse-task-json-to-md.test.js"
    "parse-task-md-to-json.test.js"
    "project-context.test.js"
    "remove-all.test.js"
    "rename.test.js"
    "restore.test.js"
    "search.test.js"
    "sort.test.js"
    "sprint.test.js"
    "status.test.js"
    "task-utils.test.js"
    "update.test.js"
    "utility.test.js"
    "validate.test.js"
)

echo "Creating GitHub issues for ${#unit_files[@]} unit test files..."

# Counter for created issues
created_count=0

for file in "${unit_files[@]}"; do
    echo "Creating issue for: $file"
    
    # Create temporary body file
    cat > temp_unit_body.md << EOF
Test File to Migrate
File Path: test/unit/$file

Migration Required: Convert QUnit syntax to Jest

Current QUnit Patterns to Convert:
- QUnit.module() to describe()
- QUnit.test() to test()
- assert.ok() to expect().toBeTruthy()
- assert.equal() to expect().toBe()
- assert.notEqual() to expect().not.toBe()
- assert.deepEqual() to expect().toEqual()
- assert.throws() to expect().toThrow()
- Setup/teardown hooks to beforeEach/afterEach

Unit Test Specific Considerations:
- Focus on assertion mapping accuracy
- Ensure isolated test execution
- Verify mock and stub patterns work with Jest
- Check for any QUnit-specific test utilities

Acceptance Criteria:
- All QUnit syntax converted to Jest
- Test file runs successfully with npm test
- All original test cases pass
- No console errors or warnings
- Follows Jest best practices
- Maintains test isolation and independence
EOF
    
    # Create the GitHub issue
    if gh issue create \
        --title "QUnit to Jest Migration: Migrate test/unit/$file" \
        --body-file temp_unit_body.md; then
        echo "✓ Created issue for $file"
        ((created_count++))
    else
        echo "✗ Failed to create issue for $file"
    fi
    
    # Clean up temp file
    rm -f temp_unit_body.md
    
    # Small delay to avoid rate limiting
    sleep 1
done

echo "\nCompleted: Created $created_count out of ${#unit_files[@]} issues for unit tests."