#!/bin/bash

# Script to create GitHub issues for QUnit to Jest migration - Integration Tests

set -e

# Array of integration test files
integration_files=(
    "add-controller.test.js"
    "archive-controller.test.js"
    "board-controller.test.js"
    "burndown-controller-real.test.js"
    "burndown-controller.test.js"
    "chat-board-state.test.js"
    "chat-controller.test.js"
    "chat-domain-events.test.js"
    "chat-event-integration.test.js"
    "chat-infrastructure.test.js"
    "chat-workflow.test.js"
    "comment-controller.test.js"
    "decompose-controller.test.js"
    "edit-controller.test.js"
    "find-controller.test.js"
    "help-controller.test.js"
    "init-controller.test.js"
    "move-controller.test.js"
    "remove-all-controller.test.js"
    "remove-controller.test.js"
    "rename-controller.test.js"
    "restore-controller.test.js"
    "sort-controller.test.js"
    "sprint-controller.test.js"
    "status-controller.test.js"
    "task-controller.test.js"
    "validate-controller.test.js"
    "version-controller.test.js"
)

echo "Creating GitHub issues for ${#integration_files[@]} integration test files..."

# Counter for created issues
created_count=0

for file in "${integration_files[@]}"; do
    echo "Creating issue for: $file"
    
    # Create temporary body file
    cat > temp_body.md << EOF
Test File to Migrate
File Path: test/integration/$file

Migration Required: Convert QUnit syntax to Jest

Current QUnit Patterns to Convert:
- QUnit.module() to describe()
- QUnit.test() to test()
- assert.ok() to expect().toBeTruthy()
- assert.equal() to expect().toBe()
- assert.deepEqual() to expect().toEqual()
- Setup/teardown hooks to beforeEach/afterEach

Integration Test Considerations:
- Review controller mocking patterns
- Verify file system operations work with Jest
- Check async/await patterns in controller tests
- Ensure proper cleanup of test artifacts

Acceptance Criteria:
- All QUnit syntax converted to Jest
- Test file runs successfully with npm test
- All original test cases pass
- No console errors or warnings
- Follows Jest best practices
EOF
    
    # Create the GitHub issue
    if gh issue create \
        --title "QUnit to Jest Migration: Migrate test/integration/$file" \
        --body-file temp_body.md; then
        echo "✓ Created issue for $file"
        ((created_count++))
    else
        echo "✗ Failed to create issue for $file"
    fi
    
    # Clean up temp file
    rm -f temp_body.md
    
    # Small delay to avoid rate limiting
    sleep 1
done

echo "\nCompleted: Created $created_count out of ${#integration_files[@]} issues for integration tests."