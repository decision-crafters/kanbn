
set -e

TEST_DIR=$(mktemp -d)
cd $TEST_DIR
echo "Testing in directory: $TEST_DIR"

export OPENROUTER_API_KEY="${OPENROUTER_API_KEY}"

FAILED=0
TOTAL=0
PASSED=0

run_command() {
  local cmd="$1"
  local expected_status="${2:-0}"
  local description="${3:-Running command}"
  
  echo "===================================================="
  echo "COMMAND: $cmd"
  echo "DESCRIPTION: $description"
  echo "===================================================="
  
  eval "$cmd"
  local status=$?
  
  TOTAL=$((TOTAL + 1))
  
  if [ $status -eq $expected_status ]; then
    echo -e "\033[0;32mPASSED\033[0m"
    PASSED=$((PASSED + 1))
  else
    echo -e "\033[0;31mFAILED\033[0m (Expected status: $expected_status, Got: $status)"
    FAILED=$((FAILED + 1))
  fi
  
  echo ""
  echo ""
  
  return $status
}

KANBN_BIN="$(cd "$(dirname "$0")" && pwd)/bin/kanbn"

run_command "$KANBN_BIN init --name 'Test Project' --description 'Testing all commands'" 0 "Initialize a new kanbn board"

run_command "$KANBN_BIN help" 0 "Show help menu"
run_command "$KANBN_BIN version" 0 "Show version information"

run_command "$KANBN_BIN add --name 'Task 1' --description 'This is task 1' --tag 'test,important' --column 'Todo'" 0 "Add a task with tags"
run_command "$KANBN_BIN add --name 'Task 2' --description 'This is task 2' --tag 'test' --column 'Todo'" 0 "Add another task"
run_command "$KANBN_BIN add --name 'Task 3' --description 'This is task 3 with subtasks:\n- Subtask 1\n- Subtask 2\n- Subtask 3' --tag 'test,decompose' --column 'Todo'" 0 "Add a task with subtasks"

run_command "$KANBN_BIN board" 0 "Show the kanbn board"

run_command "$KANBN_BIN task task-1" 0 "Show a specific task"

run_command "$KANBN_BIN edit --task task-1 --description 'Updated description for task 1'" 0 "Edit a task's description"

run_command "$KANBN_BIN rename --task task-1 --name 'Renamed Task 1'" 0 "Rename a task"

run_command "$KANBN_BIN move --task task-2 --column 'In Progress'" 0 "Move a task to another column"

run_command "$KANBN_BIN comment --task task-3 --text 'This is a comment on task 3'" 0 "Add a comment to a task"

run_command "$KANBN_BIN find --tag test" 0 "Find tasks by tag"

run_command "$KANBN_BIN status" 0 "Get project and task statistics"

run_command "$KANBN_BIN sort --column 'Todo' --by name" 0 "Sort a column by name"

run_command "$KANBN_BIN validate" 0 "Validate index and task files"

if [ -n "$OPENROUTER_API_KEY" ]; then
  run_command "$KANBN_BIN decompose --task task-3" 0 "Decompose a task using AI"
  run_command "$KANBN_BIN find --tag ai-interaction" 0 "Find AI-generated tasks"
fi

run_command "$KANBN_BIN board" 0 "Show the updated kanbn board"

run_command "$KANBN_BIN task task-3" 0 "Show the task after changes"

run_command "$KANBN_BIN status" 0 "Get updated project statistics"

run_command "$KANBN_BIN archive --task renamed-task-1" 0 "Archive a task"

run_command "$KANBN_BIN board --show-archived" 0 "Show board with archived tasks"

run_command "$KANBN_BIN restore --task renamed-task-1" 0 "Restore a task from archive"

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
