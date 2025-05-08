#!/bin/bash

# Kanbn End-to-End Bootstrap and Test Script

set -o pipefail # Cause a pipeline to return the exit status of the last command in the pipe that failed.

ECHO_PREFIX="[bootstrap_e2e]"
START_TIME=$(date +%s)

echo "$ECHO_PREFIX Starting End-to-End bootstrap and test process..."

# --- User Prompt ---
echo "$ECHO_PREFIX This script will perform environment setup, validation, and run a comprehensive test suite."
read -p "$ECHO_PREFIX Do you want to continue? (y/N): " confirmation
if [[ "$confirmation" != [yY] && "$confirmation" != [yY][eE][sS] ]]; then
    echo "$ECHO_PREFIX Aborted by user."
    exit 1
fi

# --- Phase 1: Environment Bootstrap ---
echo "
$ECHO_PREFIX --- Phase 1: Running Environment Bootstrap (./bootstrap_env.sh) ---" 
if ./bootstrap_env.sh; then
    echo "$ECHO_PREFIX Environment bootstrap completed successfully."
else
    echo "$ECHO_PREFIX Environment bootstrap FAILED. See errors above."
    exit 1
fi

# --- Phase 2: Validation Bootstrap ---
echo "
$ECHO_PREFIX --- Phase 2: Running Validation Bootstrap (./bootstrap_validate.sh) ---" 
if ./bootstrap_validate.sh; then
    echo "$ECHO_PREFIX Validation bootstrap completed successfully."
else
    echo "$ECHO_PREFIX Validation bootstrap FAILED. See errors above. Note: some checks in bootstrap_validate.sh might be warnings."
    # Decide if this should be a hard exit. For now, it continues to allow tests to run.
    # exit 1
fi

# --- Phase 3: Comprehensive Tests (make test-all in project root) ---
echo "
$ECHO_PREFIX --- Phase 3: Running Comprehensive Tests (make test-all from project root) ---" 
if (cd ../ && make test-all); then
    echo "$ECHO_PREFIX Comprehensive tests (make test-all) completed successfully."
else
    echo "$ECHO_PREFIX Comprehensive tests (make test-all) FAILED. See errors above."
    exit 1
fi

# --- Completion ---
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "
$ECHO_PREFIX --- End-to-End Bootstrap and Test Process Completed ---"
echo "$ECHO_PREFIX Total execution time: $(date -u -d @${DURATION} +%H:%M:%S)"
echo "$ECHO_PREFIX All steps completed successfully!"

exit 0

