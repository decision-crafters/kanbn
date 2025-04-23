#!/bin/bash
set -e

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Enable event tracing
export NODE_OPTIONS="--trace-event-categories node.async_hooks,node.fs.sync,node.perf,node.eventloop,node.events"
export DEBUG="kanbn:events,kanbn:*"

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}   Testing Kanbn Task Prompt Flag                 ${NC}"
echo -e "${BLUE}==================================================${NC}"

# Create a test directory
TEST_DIR=$(mktemp -d)
echo -e "${YELLOW}📁 Testing in directory: $TEST_DIR${NC}"

# Save current directory
CURRENT_DIR=$(pwd)

# Change to test directory
cd "$TEST_DIR"

# Initialize kanbn
echo -e "${YELLOW}Initializing Kanbn...${NC}"
kanbn init --name "Test Project" --column "Backlog" --column "In Progress" --column "Done"

# Create a complex task file
echo -e "${YELLOW}Creating a complex task...${NC}"
mkdir -p .kanbn/tasks

cat > .kanbn/tasks/complex-task.md << 'EOF'
---
created: 2025-04-23T20:50:00.000Z
updated: 2025-04-23T20:50:30.000Z
assigned: Developer
progress: 25
tags:
  - test
  - complex
references:
  - https://example.com/docs
  - https://github.com/example/repo
---

# Complex Task

This is a complex task with multiple components to test the prompt builder functionality.

## Details

This task requires careful planning and execution. It involves multiple steps and coordination with other team members.

## Sub-tasks

- [ ] Research existing solutions
- [x] Create initial design
- [ ] Implement core functionality
- [ ] Write tests
- [ ] Document the implementation

## Relations

- Blocks task-1
- Depends on task-2

## Comments

- author: Developer
  date: 2025-04-23T20:51:00.000Z
  This is going to be challenging but interesting.

- author: Reviewer
  date: 2025-04-23T20:52:00.000Z
  Let me know if you need any help with the implementation.
EOF

# Update the index file
cat > .kanbn/index.md << 'EOF'
---
startedColumns:
  - 'In Progress'
completedColumns:
  - Done
---

# Test Project

A test project for demonstrating the prompt builder functionality

## Backlog

- [complex-task](tasks/complex-task.md)

## In Progress

## Done
EOF

# Test the board
echo -e "${YELLOW}Testing the board...${NC}"
kanbn board

# Test the task command with JSON output
echo -e "${YELLOW}Testing task command with JSON output...${NC}"
kanbn task complex-task --json

# Create a temporary file to store the output with events
EVENT_OUTPUT_FILE=$(mktemp)

# Test the task command with prompt output and capture events
echo -e "${YELLOW}Testing task command with prompt output and event emission...${NC}"
kanbn task complex-task --prompt > "$EVENT_OUTPUT_FILE" 2>&1

# Display the output
cat "$EVENT_OUTPUT_FILE"

# Check for event emission
if grep -q "task:prompt:start" "$EVENT_OUTPUT_FILE" || grep -q "task:prompt:complete" "$EVENT_OUTPUT_FILE"; then
  echo -e "${GREEN}✅ Events were emitted during prompt generation${NC}"

  # Extract and display the events
  echo -e "${BLUE}Events emitted:${NC}"
  grep -E "task:prompt:(start|complete|error)" "$EVENT_OUTPUT_FILE" || true
else
  echo -e "${YELLOW}⚠️ No events were detected. This might be expected if event debugging is not enabled.${NC}"
fi

# Test error handling by creating an invalid task scenario
echo -e "${YELLOW}Testing prompt generation with error handling...${NC}"
INVALID_TASK_OUTPUT=$(mktemp)

# Try to generate a prompt for a non-existent task
echo -e "${YELLOW}Attempting to generate prompt for non-existent task...${NC}"
kanbn task non-existent-task --prompt > "$INVALID_TASK_OUTPUT" 2>&1 || echo -e "${RED}Command failed as expected${NC}"

# Display the output
echo -e "${BLUE}Error output:${NC}"
cat "$INVALID_TASK_OUTPUT"

# Check for error event
if grep -q "task:prompt:error" "$INVALID_TASK_OUTPUT"; then
  echo -e "${GREEN}✅ Error event was emitted for invalid task${NC}"
  grep "task:prompt:error" "$INVALID_TASK_OUTPUT" || true
else
  echo -e "${YELLOW}⚠️ No error event detected. This might be expected if event debugging is not enabled.${NC}"
fi

# Clean up
rm -f "$INVALID_TASK_OUTPUT"

# Clean up temporary file
rm -f "$EVENT_OUTPUT_FILE"

# Return to original directory
cd "$CURRENT_DIR"

echo -e "${GREEN}Test completed. Temporary directory: $TEST_DIR${NC}"
echo -e "${GREEN}You can remove it with: rm -rf $TEST_DIR${NC}"
