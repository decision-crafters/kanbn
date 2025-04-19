set -e

TEST_DIR=$(mktemp -d)
cd $TEST_DIR
echo "Testing in directory: $TEST_DIR"

export OPENROUTER_API_KEY="${OPENROUTER_API_KEY}"

run_command() {
  echo "===================================================="
  echo "COMMAND: $1"
  echo "===================================================="
  eval "$1"
  echo ""
  echo ""
}

run_command "node ~/repos/kanbn/index.js init --name 'Test Project' --description 'Testing all commands'"

run_command "node ~/repos/kanbn/index.js help"

run_command "node ~/repos/kanbn/index.js version"

run_command "node ~/repos/kanbn/index.js add --name 'Task 1' --description 'This is task 1' --tag 'test,important' --column 'Todo'"
run_command "node ~/repos/kanbn/index.js add --name 'Task 2' --description 'This is task 2' --tag 'test' --column 'Todo'"
run_command "node ~/repos/kanbn/index.js add --name 'Task 3' --description 'This is task 3 with subtasks:\n- Subtask 1\n- Subtask 2\n- Subtask 3' --tag 'test,decompose' --column 'Todo'"

run_command "node ~/repos/kanbn/index.js board"

run_command "node ~/repos/kanbn/index.js task task-1"

run_command "node ~/repos/kanbn/index.js edit --task task-1 --description 'Updated description for task 1'"

run_command "node ~/repos/kanbn/index.js rename --task task-1 --name 'Renamed Task 1'"

run_command "node ~/repos/kanbn/index.js move --task task-2 --column 'In Progress'"

run_command "node ~/repos/kanbn/index.js comment --task task-3 --text 'This is a comment on task 3'"

run_command "node ~/repos/kanbn/index.js find --tag test"

run_command "node ~/repos/kanbn/index.js status"

run_command "node ~/repos/kanbn/index.js sort --column 'Todo' --by name"

run_command "node ~/repos/kanbn/index.js validate"

run_command "node ~/repos/kanbn/index.js decompose --task task-3"

run_command "node ~/repos/kanbn/index.js board"

run_command "node ~/repos/kanbn/index.js task task-3"

run_command "node ~/repos/kanbn/index.js status"

run_command "node ~/repos/kanbn/index.js find --tag ai-interaction"

run_command "node ~/repos/kanbn/index.js archive --task renamed-task-1"

run_command "node ~/repos/kanbn/index.js board --show-archived"

run_command "node ~/repos/kanbn/index.js restore --task renamed-task-1"

cd ~
echo "Test completed. Temporary directory: $TEST_DIR"
