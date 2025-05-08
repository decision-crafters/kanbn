#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

# Enable debug mode to see environment variables
export DEBUG=true

# Load environment variables from .env file if it exists
if [ -f "$REPO_DIR/.env" ]; then
  echo "📂 Loading environment variables from .env file"
  # Use a safer way to load environment variables
  while IFS='=' read -r key value; do
    # Skip comments and empty lines
    if [[ ! $key =~ ^# && -n $key ]]; then
      # Remove leading/trailing whitespace and quotes
      value=$(echo $value | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/")
      # Export the variable
      export $key="$value"

      # For OPENROUTER_API_KEY, show a prefix for verification
      if [ "$key" = "OPENROUTER_API_KEY" ]; then
        KEY_PREFIX="${value:0:5}..."
        echo "  ✅ Loaded: $key = $KEY_PREFIX (${#value} chars)"
      else
        echo "  ✅ Loaded: $key = $value"
      fi
    fi
  done < "$REPO_DIR/.env"
fi

USE_BUILT_PACKAGE=false
for arg in "$@"; do
  if [ "$arg" == "--use-built-package" ]; then
    USE_BUILT_PACKAGE=true
  fi
done

FAILED=0
TOTAL=0
PASSED=0

run_command() {
  local cmd="$1"
  local expected_status="${2:-0}"
  local description="${3:-Running command}"
  local output_file="${4:-/dev/stdout}"

  echo "===================================================="
  echo "COMMAND: $cmd"
  echo "DESCRIPTION: $description"
  echo "===================================================="

  # Run the command and capture its output
  local output
  output=$(eval "$cmd" 2>&1)
  local status=$?

  # Display the output to the console
  echo "$output"

  # Also save the output to the specified file if not stdout
  if [ "$output_file" != "/dev/stdout" ]; then
    echo "$output" > "$output_file"
  fi

  TOTAL=$((TOTAL + 1))

  if [ $status -eq $expected_status ]; then
    echo -e "\033[0;32mPASSED\033[0m"
    PASSED=$((PASSED + 1))
  else
    echo -e "\033[0;31mFAILED\033[0m (Expected status: $expected_status, Got: $status)"
    FAILED=$((FAILED + 1))

    echo "Test failed, exiting immediately"
    echo "===================================================="
    echo "TEST SUMMARY"
    echo "===================================================="
    echo "Total tests: $TOTAL"
    echo "Passed: $PASSED"
    echo "Failed: $FAILED"
    echo "===================================================="
    exit 1
  fi

  echo ""
  echo ""

  return $status
}

if [ "$USE_BUILT_PACKAGE" = true ]; then
  echo "Using built package for testing"

  cd "$REPO_DIR"

  PACKAGE_TGZ=$(find "$REPO_DIR" -name "*kanbn*.tgz" | sort -r | head -n 1)
  if [ -z "$PACKAGE_TGZ" ]; then
    echo "No built package found. Building package..."
    npm pack
    PACKAGE_TGZ=$(find "$REPO_DIR" -name "*kanbn*.tgz" | sort -r | head -n 1)

    echo "Available package files:"
    find "$REPO_DIR" -name "*.tgz" -type f
  fi

  if [ -z "$PACKAGE_TGZ" ]; then
    echo "ERROR: Could not find package file after npm pack"
    exit 1
  fi

  echo "Installing package: $PACKAGE_TGZ"
  npm install -g "$PACKAGE_TGZ"

  TEST_DIR=$(mktemp -d)
  echo "Testing in directory: $TEST_DIR"

  # Copy the .env file to the test directory if it exists
  if [ -f "$REPO_DIR/.env" ]; then
    echo "Copying .env file to test directory"
    cp "$REPO_DIR/.env" "$TEST_DIR/"
  fi

  cd "$TEST_DIR"

  export OPENROUTER_API_KEY="${OPENROUTER_API_KEY}"

  KANBN_BIN="kanbn"
else
  echo "Using source files for testing"

  TEST_DIR=$(mktemp -d)
  echo "Testing in directory: $TEST_DIR"

  export OPENROUTER_API_KEY="${OPENROUTER_API_KEY}"

  cp -r "$REPO_DIR/../src" "$TEST_DIR/"
  cp -r "$REPO_DIR/../bin" "$TEST_DIR/"
  chmod +x "$TEST_DIR/bin/kanbn"
  cp "$REPO_DIR/../index.js" "$TEST_DIR/"
  cp "$REPO_DIR/../package.json" "$TEST_DIR/"
  cp -r "$REPO_DIR/../routes" "$TEST_DIR/"
  cp -r "$REPO_DIR/../docs" "$TEST_DIR/"
  ln -s "$REPO_DIR/../node_modules" "$TEST_DIR/node_modules"

  cd "$TEST_DIR"
  KANBN_BIN="$TEST_DIR/bin/kanbn"
  if [ ! -f "$KANBN_BIN" ]; then
    echo "Kanbn binary not found at $KANBN_BIN, using node directly"
    KANBN_BIN="node $TEST_DIR/index.js"
  fi

  # Copy the .env file to the test directory if it exists
  if [ -f "$REPO_DIR/.env" ]; then
    echo "Copying .env file to test directory"
    cp "$REPO_DIR/.env" "$TEST_DIR/"
  fi

  cd "$TEST_DIR"

  KANBN_BIN="$TEST_DIR/bin/kanbn"
  if [ ! -f "$KANBN_BIN" ]; then
    echo "Kanbn binary not found at $KANBN_BIN, using node directly"
    KANBN_BIN="node $TEST_DIR/index.js"
  fi
fi

# Set test environment variable to use mock responses
export KANBN_ENV="test"

# Test AI-powered initialization
run_command "$KANBN_BIN init --ai --name 'AI Test Project' --description 'Testing AI-powered initialization'" 0 "Initialize a new kanbn board with AI"

# Skip board check since we're only testing AI initialization

# Check if the memory file was created
if [ -f "$TEST_DIR/.kanbn/chat-memory.json" ]; then
  echo "✅ Memory file was created"
  cat "$TEST_DIR/.kanbn/chat-memory.json"
else
  echo "❌ Memory file was not created"
  FAILED=$((FAILED + 1))
fi

# Test chat with memory
run_command "$KANBN_BIN chat --message 'What is the project about?'" 0 "Chat with memory"

# Check if the memory file was updated
if [ -f "$TEST_DIR/.kanbn/chat-memory.json" ]; then
  echo "✅ Memory file exists"
  cat "$TEST_DIR/.kanbn/chat-memory.json"
else
  echo "❌ Memory file does not exist"
  FAILED=$((FAILED + 1))
fi

# Clean up
cd ~
echo "Test completed. Temporary directory: $TEST_DIR"

echo "===================================================="
echo "TEST SUMMARY"
echo "===================================================="
echo "Total tests: $TOTAL"
echo "Passed: $PASSED"
echo "Failed: $FAILED"

if [ $FAILED -gt 0 ]; then
  echo "Some tests failed!"
  exit 1
else
  echo "All tests passed!"
  exit 0
fi
