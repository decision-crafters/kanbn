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

  cp -r "$REPO_DIR/src" "$TEST_DIR/"
  cp -r "$REPO_DIR/bin" "$TEST_DIR/"
  cp "$REPO_DIR/index.js" "$TEST_DIR/"
  cp "$REPO_DIR/package.json" "$TEST_DIR/"
  cp -r "$REPO_DIR/routes" "$TEST_DIR/"
  cp -r "$REPO_DIR/docs" "$TEST_DIR/"
  ln -s "$REPO_DIR/node_modules" "$TEST_DIR/node_modules"

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

run_command "$KANBN_BIN init --name 'Test Project' --description 'Testing all commands'" 0 "Initialize a new kanbn board"

run_command "$KANBN_BIN help" 0 "Show help menu"
run_command "$KANBN_BIN version" 0 "Show version information"

run_command "$KANBN_BIN add --name 'Task 1' --description 'This is task 1' --tag 'test,important' --column 'Todo'" 0 "Add a task with tags"
run_command "$KANBN_BIN add --name 'Task 2' --description 'This is task 2' --tag 'test' --column 'Todo'" 0 "Add another task"
run_command "$KANBN_BIN add --name 'Task 3' --description 'This is task 3 with subtasks:\n- Subtask 1\n- Subtask 2\n- Subtask 3' --tag 'test,decompose' --column 'Todo'" 0 "Add a task with subtasks"

run_command "$KANBN_BIN board" 0 "Show the kanbn board"

run_command "$KANBN_BIN task task-1" 0 "Show a specific task"

run_command "$KANBN_BIN edit task-1 --description 'Updated description for task 1'" 0 "Edit a task's description"

run_command "$KANBN_BIN rename task-1 --name 'Renamed Task 1'" 0 "Rename a task"

run_command "$KANBN_BIN move task-2 --column 'In Progress'" 0 "Move a task to another column"

run_command "$KANBN_BIN comment task-3 --text 'This is a comment on task 3'" 0 "Add a comment to a task"

run_command "$KANBN_BIN find --tag test" 0 "Find tasks by tag"

run_command "$KANBN_BIN status" 0 "Get project and task statistics"

run_command "$KANBN_BIN sort 'Todo' --name" 0 "Sort a column by name"

run_command "$KANBN_BIN validate" 0 "Validate index and task files"

# These tests are now handled in the AI-specific event communication section below
# We'll skip them here to avoid duplication and potential issues
echo "AI tests will be run in the event communication section if API key is valid"

run_command "$KANBN_BIN board" 0 "Show the updated kanbn board"

run_command "$KANBN_BIN task task-3" 0 "Show the task after changes"

run_command "$KANBN_BIN status" 0 "Get updated project statistics"

run_command "$KANBN_BIN archive renamed-task-1" 0 "Archive a task"

run_command "$KANBN_BIN board --show-archived" 0 "Show board with archived tasks"

run_command "$KANBN_BIN restore renamed-task-1" 0 "Restore a task from archive"

# Test single task removal
run_command "$KANBN_BIN remove task-2 --force" 0 "Remove a single task"

# Test sprint functionality
run_command "$KANBN_BIN sprint --name 'Sprint 1' --description 'First sprint'" 0 "Create first sprint"
run_command "$KANBN_BIN sprint --name 'Sprint 2' --description 'Second sprint'" 0 "Create second sprint"
run_command "$KANBN_BIN move task-3 --column 'Sprint 1'" 0 "Move task to sprint"

# Test burndown chart with multiple sprints
run_command "$KANBN_BIN burndown --sprint 'Sprint 1,Sprint 2' --json" 0 "Show multi-sprint burndown"
run_command "$KANBN_BIN burndown" 0 "Show overall burndown chart"

# Test command aliases
run_command "$KANBN_BIN a --name 'Alias Task' --description 'Testing command alias' --column 'Todo'" 0 "Add task using 'a' alias"
run_command "$KANBN_BIN mv alias-task --column 'Sprint 1'" 0 "Move task using 'mv' alias"
run_command "$KANBN_BIN b" 0 "Show board using 'b' alias"
run_command "$KANBN_BIN f --name 'Alias'" 0 "Find task using 'f' alias"
run_command "$KANBN_BIN s" 0 "Show status using 's' alias"

# Test add command special modes
run_command "$KANBN_BIN add --name 'Progress Task' --description 'Task with progress' --column 'Todo' --progress 50" 0 "Add task with progress"
run_command "$KANBN_BIN add --name 'Assigned Task' --description 'Task with assignment' --column 'Todo' --assigned 'user1'" 0 "Add task with assignment"
run_command "$KANBN_BIN add --name 'Workload Task' --description 'Task with workload' --column 'Todo' --workload 5" 0 "Add task with custom workload"
run_command "$KANBN_BIN add --name 'References Task' --description 'Task with references' --column 'Todo' --refs 'https://example.com/reference1' --refs 'https://github.com/decision-crafters/kanbn/issues/123'" 0 "Add task with references"

# Test status command flags
run_command "$KANBN_BIN status --quiet" 0 "Show status in quiet mode"
run_command "$KANBN_BIN status --json" 0 "Show status in JSON format"
run_command "$KANBN_BIN status --sprint 'Sprint 1'" 0 "Show status filtered by sprint"
run_command "$KANBN_BIN status --untracked" 0 "Show status with untracked files"

# Test status with date filters
run_command "$KANBN_BIN add --name 'Due Task' --description 'Task with due date' --column 'Todo' --due 'tomorrow'" 0 "Add task with due date"
run_command "$KANBN_BIN status --due" 0 "Show status with due tasks"
run_command "$KANBN_BIN status --date 'today'" 0 "Show status filtered by date"

# Test board command flags
run_command "$KANBN_BIN board --json" 0 "Show board in JSON format"
run_command "$KANBN_BIN board --columns 'Sprint 1,Todo'" 0 "Show board with custom columns"
run_command "$KANBN_BIN board --show-completed" 0 "Show board with completed tasks"
run_command "$KANBN_BIN board --show-progress" 0 "Show board with progress bars"

# Test find command output modes and filters
run_command "$KANBN_BIN find --name 'Task' --quiet" 0 "Find tasks by name in quiet mode"
run_command "$KANBN_BIN find --name 'Task' --json" 0 "Find tasks by name in JSON format"
run_command "$KANBN_BIN find --column 'Sprint 1'" 0 "Find tasks by column"
run_command "$KANBN_BIN find --assigned 'user1'" 0 "Find tasks by assignment"
run_command "$KANBN_BIN find --description 'progress'" 0 "Find tasks by description"
run_command "$KANBN_BIN find --due 'tomorrow'" 0 "Find tasks by due date"
run_command "$KANBN_BIN find --created 'today'" 0 "Find tasks by creation date"
run_command "$KANBN_BIN find --workload 5" 0 "Find tasks by workload"
run_command "$KANBN_BIN find --metadata 'references' 'example.com'" 0 "Find tasks by reference URL"

# Test edit with multiple options
run_command "$KANBN_BIN edit progress-task --workload 3 --progress 75 --description 'Updated progress task'" 0 "Edit task with multiple options"
run_command "$KANBN_BIN edit due-task --due 'next week' --tag 'important'" 0 "Edit task due date and tags"

# Test references functionality
run_command "$KANBN_BIN task references-task" 0 "View task with references"
run_command "$KANBN_BIN edit references-task --add-ref 'https://example.com/added-reference'" 0 "Add a reference to a task"
run_command "$KANBN_BIN edit references-task --remove-ref 'https://example.com/reference1'" 0 "Remove a reference from a task"
run_command "$KANBN_BIN edit references-task --refs 'https://example.com/new-reference'" 0 "Replace all references in a task"

# Test event communication
# First, test events that don't require the OpenRouter API

# Test that moving a task triggers events and updates the index
run_command "$KANBN_BIN add --name 'Event Test Task' --description 'Testing event communication' --column 'Todo'" 0 "Add task for event testing"
run_command "$KANBN_BIN move event-test-task --column 'In Progress'" 0 "Move task (triggers events)"
run_command "$KANBN_BIN find --column 'In Progress' --name 'Event Test'" 0 "Verify task moved by event"

# Test that editing a task triggers events and updates the task
run_command "$KANBN_BIN edit event-test-task --tag 'event-test'" 0 "Edit task (triggers events)"
run_command "$KANBN_BIN find --tag event-test" 0 "Verify tag added by event"

# Test that commenting triggers events and updates the task
run_command "$KANBN_BIN comment event-test-task --text 'Comment added via event test'" 0 "Add comment (triggers events)"
run_command "$KANBN_BIN task event-test-task" 0 "Verify comment added by event"

# Test AI-specific event communication if OpenRouter API key is available
echo "\n\n🔍 Checking for OpenRouter API key..."

# Use the centralized script to check the OpenRouter API key
if "$REPO_DIR/scripts/check-openrouter-key.sh" > /dev/null 2>&1; then
  echo "✅ OpenRouter API key is valid! Proceeding with AI tests."

  # Create a temporary file to store chat responses
  CHAT_RESPONSE_FILE=$(mktemp)

  # Test that chat creates an AI interaction task (which emits events)
  echo "\n📝 Testing chat with event emission..."
  run_command "$KANBN_BIN chat --message 'Test event communication'" 0 "Chat with event emission" > "$CHAT_RESPONSE_FILE"

  # Validate the chat response
  if grep -q "Project Assistant:" "$CHAT_RESPONSE_FILE"; then
    echo "✅ Chat response contains 'Project Assistant:' prefix."
  else
    echo "❌ Chat response does not contain 'Project Assistant:' prefix."
    cat "$CHAT_RESPONSE_FILE"
  fi

  # Test that we can find the AI interaction task (verifying the event had its effect)
  echo "\n🔍 Verifying AI interaction task was created..."
  run_command "$KANBN_BIN find --tag ai-interaction --created 'today'" 0 "Find task created by event"

  # Test streaming response with default model
  echo "\n🌊 Testing streaming response with default model..."
  run_command "$KANBN_BIN chat --message 'Give a very brief response to test streaming'" 0 "Chat with streaming response (default model)" > "$CHAT_RESPONSE_FILE"

  # Validate the streaming response
  if grep -q "Using model:" "$CHAT_RESPONSE_FILE"; then
    echo "✅ Streaming response shows model information."
    MODEL_INFO=$(grep "Using model:" "$CHAT_RESPONSE_FILE")
    echo "  $MODEL_INFO"
  else
    echo "❌ Streaming response does not show model information."
  fi

  # Test with specific model if supported
  echo "\n🤖 Testing with specific model..."
  run_command "$KANBN_BIN chat --message 'Give a very brief response' --model 'google/gemma-3-4b-it:free'" 0 "Chat with specific model" > "$CHAT_RESPONSE_FILE"

  # Validate the model-specific response
  if grep -q "google/gemma-3-4b-it:free" "$CHAT_RESPONSE_FILE"; then
    echo "✅ Response shows correct model (google/gemma-3-4b-it:free)."
  else
    echo "❌ Response does not show the specified model."
    grep "Using model:" "$CHAT_RESPONSE_FILE" || echo "No model information found."
  fi

  # Test with API key specified in command line
  echo "\n🔑 Testing with API key specified in command line..."
  run_command "$KANBN_BIN chat --message 'Give a very brief response' --api-key $OPENROUTER_API_KEY" 0 "Chat with API key in command line" > "$CHAT_RESPONSE_FILE"

  # Validate the API key response
  if grep -q "Project Assistant:" "$CHAT_RESPONSE_FILE"; then
    echo "✅ API key response contains 'Project Assistant:' prefix."
  else
    echo "❌ API key response does not contain 'Project Assistant:' prefix."
    cat "$CHAT_RESPONSE_FILE"
  fi

  # Clean up temporary file
  rm -f "$CHAT_RESPONSE_FILE"

  # Run comprehensive chat command tests
  echo "\n💬 Running comprehensive chat command tests..."
  if "$REPO_DIR/test-chat-commands.sh" > /dev/null; then
    echo "✅ Comprehensive chat command tests passed."
  else
    echo "❌ Comprehensive chat command tests failed."
    exit 1
  fi

  # Test decompose command
  echo "\n🧩 Testing decompose command..."
  run_command "$KANBN_BIN decompose --task task-3 --with-refs" 0 "Decompose task with references"

  # Verify that subtasks were created
  echo "\n🔍 Verifying subtasks were created..."
  run_command "$KANBN_BIN find --description 'Subtask'" 0 "Find subtasks created by decompose"

  # Verify that the parent-child relationship was established
  echo "\n🔍 Verifying parent-child relationship..."
  run_command "$KANBN_BIN task task-3" 0 "Check parent task for child relations"
else
  echo "⚠️ OpenRouter API key is invalid or not found. Skipping AI tests."
  echo "Please set OPENROUTER_API_KEY in your .env file or as an environment variable."
  echo "Current environment variables:"
  env | grep -i openrouter || echo "No OpenRouter-related environment variables found."
fi

# Test task view with different options
run_command "$KANBN_BIN task progress-task --json" 0 "View task in JSON format"
run_command "$KANBN_BIN task due-task --quiet" 0 "View task in quiet mode"

# Test sort with different options
run_command "$KANBN_BIN sort 'Todo' --created" 0 "Sort column by creation date"
run_command "$KANBN_BIN sort 'Todo' --due" 0 "Sort column by due date"
run_command "$KANBN_BIN sort 'Todo' --workload" 0 "Sort column by workload"

# Test comment with different options
run_command "$KANBN_BIN comment due-task --text 'This is a comment with author' --author 'Test User'" 0 "Add comment with custom author"

REMOVE_TEST_DIR=$(mktemp -d)
cd $REMOVE_TEST_DIR
run_command "$KANBN_BIN init --name 'Remove Test'" 0 "Initialize a board for removal test"
run_command "$KANBN_BIN remove-all --force" 0 "Remove the kanbn board and all tasks"

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
