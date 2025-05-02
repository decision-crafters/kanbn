#!/bin/bash

# Test script for repository context integration
# This script tests whether the AI has proper context of the repository content

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Function to print a header
print_header() {
  echo -e "\n${BLUE}==================================================${NC}"
  echo -e "${BLUE}   $1   ${NC}"
  echo -e "${BLUE}==================================================${NC}\n"
}

# Function to print info
print_info() {
  echo -e "${BOLD}$1${NC}"
}

# Function to print success
print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warning
print_warning() {
  echo -e "${YELLOW}⚠️ $1${NC}"
}

# Function to print error
print_error() {
  echo -e "${RED}❌ $1${NC}"
}

# Create a temporary directory
print_header "Setting Up Test Environment"
TEST_DIR=$(mktemp -d)
print_info "Created temporary directory: $TEST_DIR"
cd "$TEST_DIR" || exit 1
print_success "Changed to temporary directory"

# Clone a repository with clear structure and content
print_header "Cloning Test Repository"
git clone https://github.com/tosin2013/codex.git .
print_success "Cloned repository"

# Check for Ollama connectivity and set up environment variables
print_header "Checking Ollama Connectivity"
OLLAMA_HOST=${OLLAMA_HOST:-"http://localhost:11434"}
print_info "Using Ollama at: $OLLAMA_HOST"

# Try multiple Ollama host options if the default doesn't work
if ! curl -s "$OLLAMA_HOST/api/tags" >/dev/null 2>&1; then
  print_warning "Ollama not reachable at $OLLAMA_HOST - trying alternative hosts"

  # Try host.docker.internal
  if curl -s "http://host.docker.internal:11434/api/tags" >/dev/null 2>&1; then
    print_success "Ollama is reachable at http://host.docker.internal:11434"
    OLLAMA_HOST="http://host.docker.internal:11434"
    export OLLAMA_HOST="http://host.docker.internal:11434"
  # Try localhost
  elif curl -s "http://localhost:11434/api/tags" >/dev/null 2>&1; then
    print_success "Ollama is reachable at http://localhost:11434"
    OLLAMA_HOST="http://localhost:11434"
    export OLLAMA_HOST="http://localhost:11434"
  # Try 127.0.0.1
  elif curl -s "http://127.0.0.1:11434/api/tags" >/dev/null 2>&1; then
    print_success "Ollama is reachable at http://127.0.0.1:11434"
    OLLAMA_HOST="http://127.0.0.1:11434"
    export OLLAMA_HOST="http://127.0.0.1:11434"
  else
    print_warning "Ollama not reachable at any standard host - tests will use fallback embedding method"
    # Set USE_MOCK=true to use mock responses instead of failing
    export USE_MOCK=true
    export USE_OLLAMA=false
  fi
fi

# If Ollama is reachable, check for models
if curl -s "$OLLAMA_HOST/api/tags" >/dev/null 2>&1; then
  print_success "Ollama is reachable at $OLLAMA_HOST"
  export USE_OLLAMA=true
else
  print_warning "Ollama not reachable at any standard host - tests will use fallback embedding method"
  # Set USE_MOCK=true to use mock responses instead of failing
  export USE_MOCK=true
  export USE_OLLAMA=false
fi

# Initialize Kanbn
print_header "Initializing Kanbn"
kanbn init --name "Codex Project" --message "A repository for the Codex project"
print_success "Initialized Kanbn"

# Add some tasks
print_header "Adding Tasks"
kanbn add --name "Improve documentation" --description "Enhance the project documentation with more examples and usage instructions" --column "Backlog" --tags "documentation"
kanbn add --name "Implement new features" --description "Add new features based on user feedback and project roadmap" --column "Backlog" --tags "feature"
kanbn add --name "Fix known issues" --description "Address and resolve known bugs and issues in the codebase" --column "Backlog" --tags "bug"
print_success "Added tasks"

# Add repository content as integrations
print_header "Adding Repository Content as Integrations"

# Add README.md as integration
if [ -f "README.md" ]; then
  kanbn integrations --add --name readme --content "$(cat README.md)"
  print_success "Added README.md as integration"
fi

# Add repository structure as integration
repo_structure=$(find . -type f -not -path "*/\.*" | sort | head -n 50)
kanbn integrations --add --name "repo-structure" --content "$repo_structure"
print_success "Added repository structure as integration"

# Add key Python files as integrations
for file in $(find . -name "*.py" -type f | grep -v "__pycache__" | head -n 3); do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    integration_name="code-${filename}"
    kanbn integrations --add --name "$integration_name" --content "$(cat "$file")"
    print_success "Added source code file $filename as integration"
  fi
done

# List integrations
print_header "Listing Integrations"
kanbn integrations --list

# Test repository context awareness
print_header "Testing Repository Context Awareness"

# Test 1: Basic question about the repository
print_info "Test 1: Basic question about the repository"
echo -e "${CYAN}$ kanbn chat --with-integrations --message \"What is this project about?\"${NC}"
echo -e "${YELLOW}Response:${NC}"
kanbn chat --with-integrations --message "What is this project about?"
echo ""

# Test 2: Question about specific files in the repository
print_info "Test 2: Question about specific files in the repository"
echo -e "${CYAN}$ kanbn chat --with-integrations --message \"What files are in this repository?\"${NC}"
echo -e "${YELLOW}Response:${NC}"
kanbn chat --with-integrations --message "What files are in this repository?"
echo ""

# Test 3: Question about specific code in the repository
print_info "Test 3: Question about specific code in the repository"
echo -e "${CYAN}$ kanbn chat --with-integrations --message \"What Python files are in this repository and what do they do?\"${NC}"
echo -e "${YELLOW}Response:${NC}"
kanbn chat --with-integrations --message "What Python files are in this repository and what do they do?"
echo ""

# Test 4: Question about README content
print_info "Test 4: Question about README content"
echo -e "${CYAN}$ kanbn chat --with-integrations --message \"What does the README.md file contain?\"${NC}"
echo -e "${YELLOW}Response:${NC}"
kanbn chat --with-integrations --message "What does the README.md file contain?"
echo ""

# Clean up
print_header "Cleaning Up"
cd - > /dev/null || exit 1
rm -rf "$TEST_DIR"
print_success "Removed test directory"

print_header "Test Completed"
print_info "If the responses show awareness of the repository content, the repository context integration is working correctly."
print_info "If the responses are generic or don't reference the repository content, there may be an issue with the repository context integration."
