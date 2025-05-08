#!/bin/bash

# Kanbn Validation Bootstrap Script

set -e # Exit immediately if a command exits with a non-zero status.

ECHO_PREFIX="[bootstrap_validate]"

echo "$ECHO_PREFIX Starting validation checks..."

# Ensure Kanbn CLI is available (now expecting it to be globally available due to `sudo npm install -g .`)
if ! command -v kanbn &> /dev/null
then
    echo "$ECHO_PREFIX kanbn command could not be found. Make sure it is installed and in your PATH."
    echo "$ECHO_PREFIX This script now expects kanbn to be globally available."
    exit 1
fi
echo "$ECHO_PREFIX Found kanbn CLI: $(kanbn version)"

# Validate Kanbn board (if one is initialized in the project root)
if [ -d "../.kanbn" ]; then
    echo "$ECHO_PREFIX Validating Kanbn board in ../.kanbn..."
    # kanbn command is now expected to be in PATH
    if (cd ../ && kanbn validate); then
        echo "$ECHO_PREFIX Kanbn board validation successful."
    else
        echo "$ECHO_PREFIX Kanbn board validation FAILED. Please check errors above."
        # exit 1 # Decide if this should be a fatal error for the script
    fi
else
    echo "$ECHO_PREFIX ../.kanbn directory not found. Skipping Kanbn board validation. Run 'kanbn init' in project root to create a board."
fi

# Placeholder for Linting (run in project root)
echo "$ECHO_PREFIX Checking for linting tools (e.g., ESLint) in project root..."
# Example: Assuming eslint is a dev dependency and configured in ../package.json
if [ -f ../node_modules/.bin/eslint ]; then
    echo "$ECHO_PREFIX Running ESLint (npm run lint --prefix ../)..."
    if npm run --prefix ../ lint; then # Assuming a "lint" script in ../package.json
        echo "$ECHO_PREFIX Linting completed successfully."
    else
        echo "$ECHO_PREFIX Linting issues found. Please check errors above."
        # exit 1 # Decide if this should be a fatal error
    fi
elif command -v eslint &> /dev/null; then
    echo "$ECHO_PREFIX ESLint found globally. Project-specific linting (in ../package.json) is preferred."
else
    echo "$ECHO_PREFIX ESLint not found (checked ../node_modules/.bin/eslint and global). Skipping linting."
fi

# Placeholder for Unit Tests (run in project root)
echo "$ECHO_PREFIX Checking for test runner in project root..."
# Example: Assuming a test script in ../package.json
if grep -q '\"test\":' ../package.json; then
    echo "$ECHO_PREFIX Running unit tests (npm --prefix ../ test)..."
    if npm --prefix ../ test; then
        echo "$ECHO_PREFIX Unit tests passed."
    else
        echo "$ECHO_PREFIX Unit tests FAILED. Please check errors above."
        # exit 1 # Decide if this should be a fatal error
    fi
else
    echo "$ECHO_PREFIX 'npm test' script not found in ../package.json. Skipping unit tests."
fi

# Check for API Key presence (example in project root .env)
if [ -f ../.env ]; then
    echo "$ECHO_PREFIX Checking for OPENROUTER_API_KEY in ../.env..."
    if grep -q "^OPENROUTER_API_KEY=your_api_key_here" ../.env || grep -q "^OPENROUTER_API_KEY=$''" ../.env || ! grep -q "^OPENROUTER_API_KEY=" ../.env ; then
        echo "$ECHO_PREFIX WARNING: OPENROUTER_API_KEY seems to be missing or using the default placeholder in ../.env. AI features might not work."
    else
        echo "$ECHO_PREFIX OPENROUTER_API_KEY seems to be set in ../.env."
    fi
else
    echo "$ECHO_PREFIX ../.env file not found. Skipping API key check. AI features might not work without it."
fi


echo "$ECHO_PREFIX Validation checks completed."

exit 0
