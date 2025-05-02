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
echo -e "${BLUE}   Testing Kanbn AI Initialization Scenarios      ${NC}"
echo -e "${BLUE}==================================================${NC}"

# Get the repository directory
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

# Load environment variables from .env file if it exists
if [ -f "$REPO_DIR/.env" ]; then
  echo -e "${YELLOW}📂 Loading environment variables from .env file${NC}"
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
        echo -e "  ${GREEN}✅ Loaded: $key = $KEY_PREFIX (${#value} chars)${NC}"
      else
        echo -e "  ${GREEN}✅ Loaded: $key = $value${NC}"
      fi
    fi
  done < "$REPO_DIR/.env"
fi

# Check if OpenRouter API key or Ollama is available
if [ -z "$OPENROUTER_API_KEY" ] && [ "$USE_OLLAMA" != "true" ]; then
  echo -e "${YELLOW}⚠️ Neither OpenRouter API key nor Ollama is set. Using test mode.${NC}"
  export KANBN_ENV="test"
else
  if [ -n "$OPENROUTER_API_KEY" ]; then
    echo -e "${GREEN}✅ OpenRouter API key is set. Using real API calls.${NC}"
    export KANBN_ENV="development"
  elif [ "$USE_OLLAMA" = "true" ]; then
    echo -e "${GREEN}✅ Ollama is enabled. Using real API calls.${NC}"
    export KANBN_ENV="development"
  fi
fi

# Create a test directory
TEST_DIR=$(mktemp -d)
echo -e "${YELLOW}📁 Testing in directory: $TEST_DIR${NC}"

# Copy necessary files
cp -r "$REPO_DIR/src" "$TEST_DIR/"
cp -r "$REPO_DIR/bin" "$TEST_DIR/"
cp "$REPO_DIR/index.js" "$TEST_DIR/"
cp "$REPO_DIR/package.json" "$TEST_DIR/"
cp -r "$REPO_DIR/routes" "$TEST_DIR/"
cp -r "$REPO_DIR/docs" "$TEST_DIR/"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd "$TEST_DIR"
npm install mkdirp node-fetch axios inquirer inquirer-recursive

# Link node_modules for other dependencies
ln -s "$REPO_DIR/node_modules" "$TEST_DIR/node_modules_repo"

# Go back to test directory
cd "$TEST_DIR"

# Copy the .env file to the test directory if it exists
if [ -f "$REPO_DIR/.env" ]; then
  echo -e "${YELLOW}📋 Copying .env file to test directory${NC}"
  cp "$REPO_DIR/.env" "$TEST_DIR/"
fi

# Set up the kanbn binary
KANBN_BIN="$TEST_DIR/bin/kanbn"
if [ ! -f "$KANBN_BIN" ]; then
  echo -e "${YELLOW}Kanbn binary not found at $KANBN_BIN, using node directly${NC}"
  KANBN_BIN="node $TEST_DIR/index.js"
fi

# Function to run a command and check its output
run_test() {
  local cmd="$1"
  local description="$2"
  local expected_pattern="$3"
  local output_file="$TEST_DIR/output.txt"

  echo -e "${BLUE}==================================================${NC}"
  echo -e "${BLUE}TEST: $description${NC}"
  echo -e "${BLUE}COMMAND: $cmd${NC}"
  echo -e "${BLUE}==================================================${NC}"

  # Run the command and capture its output
  eval "$cmd" > "$output_file" 2>&1
  local status=$?

  # Display the output
  cat "$output_file"

  # Check if the command succeeded
  if [ $status -ne 0 ]; then
    echo -e "${RED}❌ FAILED: Command returned non-zero status: $status${NC}"
    return 1
  fi

  # Check if the output matches the expected pattern
  if [ -n "$expected_pattern" ]; then
    if grep -q "$expected_pattern" "$output_file"; then
      echo -e "${GREEN}✅ PASSED: Output contains expected pattern: $expected_pattern${NC}"
    else
      echo -e "${RED}❌ FAILED: Output does not contain expected pattern: $expected_pattern${NC}"
      return 1
    fi
  fi

  echo -e "${GREEN}✅ PASSED: $description${NC}"
  return 0
}

# Function to check if a file exists and optionally contains a pattern
check_file() {
  local file_path="$1"
  local description="$2"
  local pattern="$3"

  echo -e "${BLUE}==================================================${NC}"
  echo -e "${BLUE}TEST: $description${NC}"
  echo -e "${BLUE}FILE: $file_path${NC}"
  if [ -n "$pattern" ]; then
    echo -e "${BLUE}PATTERN: $pattern${NC}"
  fi
  echo -e "${BLUE}==================================================${NC}"

  if [ ! -f "$file_path" ]; then
    echo -e "${RED}❌ FAILED: File does not exist: $file_path${NC}"
    return 1
  fi

  echo -e "${GREEN}✅ PASSED: File exists: $file_path${NC}"
  cat "$file_path"

  # If a pattern is provided, check if the file contains it
  if [ -n "$pattern" ]; then
    if grep -q "$pattern" "$file_path"; then
      echo -e "${GREEN}✅ PASSED: File contains pattern: $pattern${NC}"
      return 0
    else
      echo -e "${RED}❌ FAILED: File does not contain pattern: $pattern${NC}"
      return 1
    fi
  fi

  return 0
}

# Track test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Run a test and track the result
run_tracked_test() {
  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  if "$@"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo -e "${RED}❌ Test failed: $1${NC}"
  fi

  echo ""
}

# Create a new directory for testing new project initialization
NEW_PROJECT_DIR="$TEST_DIR/new-project"
mkdir -p "$NEW_PROJECT_DIR"
cd "$NEW_PROJECT_DIR"

echo -e "${YELLOW}🚀 Testing AI initialization on a new project...${NC}"

# Test 1: Initialize a new project with AI
# Use KANBN_ENV=test to ensure we use test mode and provide all parameters to avoid interactive prompts
run_tracked_test run_test "KANBN_ENV=test $KANBN_BIN init --ai --name 'New Test Project' --description 'A mobile app development project with user authentication and push notifications' --message 'Create a mobile app development project with user authentication and push notifications' --column 'Backlog' --column 'To Do' --column 'In Progress' --column 'Done'" "Initialize a new project with AI" "Initialization Complete"

# Test 2: Check if the .kanbn directory was created
run_tracked_test check_file "$NEW_PROJECT_DIR/.kanbn/index.md" "Check if index.md file was created"

# Test 3: Check if the chat-memory.json file was created
run_tracked_test check_file "$NEW_PROJECT_DIR/.kanbn/chat-memory.json" "Check if chat-memory.json file was created"

# Test 4: Check if the board has columns by checking the index.md file directly
run_tracked_test check_file "$NEW_PROJECT_DIR/.kanbn/index.md" "Check if the board has columns" "## Backlog"

# Now, let's test initialization on an existing project
echo -e "${YELLOW}🚀 Testing AI initialization on an existing project...${NC}"

# Create a directory for the existing project
EXISTING_PROJECT_DIR="$TEST_DIR/existing-project"
mkdir -p "$EXISTING_PROJECT_DIR"
cd "$EXISTING_PROJECT_DIR"

# Clone the example project
echo -e "${YELLOW}📥 Cloning example project: FastMCP...${NC}"
git clone https://github.com/jlowin/fastmcp.git .

# Test 5: Initialize the existing project with AI
# Use KANBN_ENV=test to ensure we use test mode and provide all parameters to avoid interactive prompts
run_tracked_test run_test "KANBN_ENV=test $KANBN_BIN init --ai --name 'FastMCP Project' --description 'A Python FastAPI project with microservices architecture' --message 'Create a task board for this Python FastAPI project with microservices architecture' --column 'Backlog' --column 'To Do' --column 'In Progress' --column 'Done'" "Initialize existing project with AI" "Initialization Complete"

# Test 6: Check if the .kanbn directory was created
run_tracked_test check_file "$EXISTING_PROJECT_DIR/.kanbn/index.md" "Check if index.md file was created in existing project"

# Test 7: Check if the chat-memory.json file was created
run_tracked_test check_file "$EXISTING_PROJECT_DIR/.kanbn/chat-memory.json" "Check if chat-memory.json file was created in existing project"

# Test 8: Check if the board has columns by checking the index.md file directly
run_tracked_test check_file "$EXISTING_PROJECT_DIR/.kanbn/index.md" "Check if the board has columns in existing project" "## Backlog"

# Test 9: Test reinitializing an existing Kanbn board
echo -e "${YELLOW}🚀 Testing reinitialization of an existing Kanbn board...${NC}"
# Use KANBN_ENV=test to ensure we use test mode and provide all parameters to avoid interactive prompts
run_tracked_test run_test "KANBN_ENV=test $KANBN_BIN init --ai --name 'Updated FastMCP Project' --description 'An updated Python FastAPI project focusing on API testing and documentation' --message 'Update this board to focus on API testing and documentation' --column 'Backlog' --column 'To Do' --column 'In Progress' --column 'Testing' --column 'Documentation' --column 'Done'" "Reinitialize existing Kanbn board" "Reinitialised"

# Print test summary
echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}                 TEST SUMMARY                     ${NC}"
echo -e "${BLUE}==================================================${NC}"
echo -e "${YELLOW}Total tests: $TOTAL_TESTS${NC}"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo -e "${BLUE}==================================================${NC}"

# Clean up
cd ~
echo -e "${YELLOW}Test completed. Temporary directory: $TEST_DIR${NC}"

# Return appropriate exit code
if [ $FAILED_TESTS -gt 0 ]; then
  echo -e "${RED}❌ Some tests failed!${NC}"
  exit 1
else
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
fi
