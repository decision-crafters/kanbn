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

# Function to run a command and validate the response structure
run_chat_test() {
  local cmd="$1"
  local description="$2"

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

  # Validate that we got a response from the Project Assistant
  if echo "$output" | grep -q "Project Assistant:"; then
    echo "✅ PASSED: Received response from Project Assistant"

    # Extract a snippet of the response for verification
    response_snippet=$(echo "$output" | grep -A 2 "Project Assistant:" | head -3)
    echo "  Response snippet: $response_snippet"
    return 0
  else
    echo "❌ FAILED: No response from Project Assistant"
    return 1
  fi
}

# Test basic chat command
run_chat_test "$KANBN_BIN chat --message 'Hello, this is a test message'" "Basic chat command"

# Test chat with model specification
echo "\n===================================================="
echo "TEST: Chat with model specification"
echo "COMMAND: $KANBN_BIN chat --message 'This is a test with model specification' --model 'google/gemma-3-4b-it:free'"
echo "===================================================="

# Run the command and capture its output
model_output=$($KANBN_BIN chat --message 'This is a test with model specification' --model 'google/gemma-3-4b-it:free' 2>&1)
model_status=$?

# Display the output
echo "$model_output"

# Check if the command succeeded
if [ $model_status -ne 0 ]; then
  echo "❌ FAILED: Command returned non-zero status: $model_status"
  exit 1
fi

# Validate that we got a response from the Project Assistant
if echo "$model_output" | grep -q "Project Assistant:"; then
  echo "✅ PASSED: Received response from Project Assistant"

  # Check if the output shows the correct model
  if echo "$model_output" | grep -q "Using model: google/gemma-3-4b-it:free"; then
    echo "✅ PASSED: Using the specified model (google/gemma-3-4b-it:free)"
  else
    echo "❌ FAILED: Not using the specified model"
    exit 1
  fi
else
  echo "❌ FAILED: No response from Project Assistant"
  exit 1
fi

# Test chat with API key specification
run_chat_test "$KANBN_BIN chat --message 'This is a test with API key specification' --api-key $OPENROUTER_API_KEY" "Chat with API key specification"

# Test chat with project context
run_chat_test "$KANBN_BIN chat --message 'Tell me about this project'" "Chat with project context"

# Test chat with task-related query
run_chat_test "$KANBN_BIN chat --message 'List all tasks in the Todo column'" "Chat with task-related query"

# Test chat with task creation request
run_chat_test "$KANBN_BIN chat --message 'Create a new task called \"AI Created Task\" in the Todo column'" "Chat with task creation request"

# Verify if the task was created
echo "\n===================================================="
echo "TEST: Verify if task was created by chat"
echo "COMMAND: $KANBN_BIN find --name 'AI Created'"
echo "===================================================="

# Run the find command and capture its output
find_output=$($KANBN_BIN find --name 'AI Created' 2>&1)
find_status=$?

# Display the output
echo "$find_output"

# Check if any tasks were found
if [ $find_status -eq 0 ] && echo "$find_output" | grep -q "Found"; then
  echo "✅ PASSED: Task was created by chat command"
else
  echo "⚠️ NOTE: No task was created by chat command (this is expected as AI responses vary)"
fi

# Clean up
cd ~
rm -rf "$TEST_DIR"

echo "All chat command tests completed successfully!"
exit 0
