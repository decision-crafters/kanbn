#!/bin/bash
set -e

# Test repository epic integration
echo "=== Testing Repository Epic Integration ==="

# Create test directory
TEST_DIR=$(mktemp -d)
echo "Created test directory: $TEST_DIR"
cd "$TEST_DIR"

# Clone the example repository
REPO_URL="https://github.com/tosin2013/presenter.git"
echo "Cloning example repository: $REPO_URL"
git clone "$REPO_URL" presenter
cd presenter

# Initialize Kanbn in the repository
echo "Initializing Kanbn..."
kanbn init --name "Presenter Enhancement Project" --description "Adding new features to the Presenter CLI tool"

# Create and decompose the enhancement epic
echo "Creating enhancement epic..."
node /app/test-epic-repo.js

# Verify the results
echo "Verifying results..."
kanbn board

echo "Repository epic integration test completed successfully"
