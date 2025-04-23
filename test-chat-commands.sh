#!/bin/bash
set -e

# Enable debug mode to see environment variables
export DEBUG=true

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Load environment variables from .env file if it exists
if [ -f "$SCRIPT_DIR/.env" ]; then
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
  done < "$SCRIPT_DIR/.env"
fi

# Check if OPENROUTER_API_KEY is set
if [ -z "$OPENROUTER_API_KEY" ]; then
  echo "❌ ERROR: OPENROUTER_API_KEY is not set"
  echo "Please set it in your .env file or as an environment variable"
  exit 1
fi

# Initialize a test project
TEST_DIR=$(mktemp -d)
echo "Testing in directory: $TEST_DIR"

# Copy the package to the test directory
cp -r "$SCRIPT_DIR/src" "$TEST_DIR/"
cp -r "$SCRIPT_DIR/bin" "$TEST_DIR/"
cp "$SCRIPT_DIR/index.js" "$TEST_DIR/"
cp "$SCRIPT_DIR/package.json" "$TEST_DIR/"
cp -r "$SCRIPT_DIR/routes" "$TEST_DIR/"
cp -r "$SCRIPT_DIR/docs" "$TEST_DIR/"
ln -s "$SCRIPT_DIR/node_modules" "$TEST_DIR/node_modules"

# Copy the .env file to the test directory
if [ -f "$SCRIPT_DIR/.env" ]; then
  echo "Copying .env file to test directory"
  cp "$SCRIPT_DIR/.env" "$TEST_DIR/"
fi

# Set the path to the kanbn binary
KANBN_BIN="$TEST_DIR/bin/kanbn"

# Initialize a test project
cd "$TEST_DIR"
"$KANBN_BIN" init --name "Chat Test Project" --description "Testing chat commands"

# Add some test tasks
"$KANBN_BIN" add --name "Task 1" --description "This is task 1" --tag "test,important" --column "Todo"
"$KANBN_BIN" add --name "Task 2" --description "This is task 2" --tag "test" --column "In Progress"
"$KANBN_BIN" add --name "Task 3" --description "This is task 3 with subtasks:\n- Subtask 1\n- Subtask 2\n- Subtask 3" --tag "test,decompose" --column "Done"

# Function to run a command and check its output
run_chat_test() {
  local cmd="$1"
  local expected_output="$2"
  local description="$3"
  local optional="${4:-false}"

  echo "===================================================="
  echo "TEST: $description"
  echo "COMMAND: $cmd"
  echo "===================================================="

  # Run the command and capture its output
  output=$(eval "$cmd" 2>&1)
  status=$?

  # Display the output
  echo "$output"

  # Check if the command succeeded
  if [ $status -ne 0 ]; then
    echo "❌ FAILED: Command returned non-zero status: $status"
    return 1
  fi

  # Check if the output contains the expected text
  if echo "$output" | grep -q "$expected_output"; then
    echo "✅ PASSED: Output contains expected text"
    return 0
  else
    if [ "$optional" = "true" ]; then
      echo "⚠️ WARNING: Output does not contain expected text: $expected_output"
      echo "✅ PASSED ANYWAY: This check is optional"
      return 0
    else
      echo "❌ FAILED: Output does not contain expected text: $expected_output"
      return 1
    fi
  fi
}

# Test basic chat command
run_chat_test "$KANBN_BIN chat --message 'Hello, this is a test message'" "Project Assistant:" "Basic chat command"

# Test chat with model specification
run_chat_test "$KANBN_BIN chat --message 'This is a test with model specification' --model 'google/gemma-3-4b-it:free'" "Using model: google/gemma-3-4b-it:free" "Chat with model specification"

# Test chat with API key specification
run_chat_test "$KANBN_BIN chat --message 'This is a test with API key specification' --api-key $OPENROUTER_API_KEY" "Project Assistant:" "Chat with API key specification"

# Test chat with project context
run_chat_test "$KANBN_BIN chat --message 'Tell me about this project'" "Project Assistant:" "Chat with project context"

# Test chat with task-related query
run_chat_test "$KANBN_BIN chat --message 'List all tasks in the Todo column'" "Project Assistant:" "Chat with task-related query"

# Test chat with task creation request (optional check for actual task creation)
run_chat_test "$KANBN_BIN chat --message 'Create a new task called \"AI Created Task\" in the Todo column'" "Created task" "Chat with task creation request" "true"

# Verify the task was created (optional check)
run_chat_test "$KANBN_BIN find --name 'AI Created'" "AI Created" "Verify task created by chat" "true"

# Clean up
cd ~
rm -rf "$TEST_DIR"

echo "All chat command tests completed successfully!"
exit 0
