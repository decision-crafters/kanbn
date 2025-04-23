#!/bin/bash
set -e

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Function to print a section header
print_header() {
  echo -e "\n${BLUE}==================================================${NC}"
  echo -e "${BLUE}   $1   ${NC}"
  echo -e "${BLUE}==================================================${NC}\n"
}

# Function to print a step
print_step() {
  echo -e "${YELLOW}📌 $1${NC}"
}

# Function to print a command
print_command() {
  echo -e "${CYAN}$ $1${NC}"
}

# Function to print success
print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

# Function to print info
print_info() {
  echo -e "${BOLD}$1${NC}"
}

# Function to wait for user input
wait_for_input() {
  echo -e "\n${YELLOW}Press Enter to continue...${NC}"
  read
}

# Function to run a command
run_command() {
  print_command "$1"
  echo ""
  eval "$1"
  echo ""
}

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check if kanbn is installed
if ! command_exists kanbn; then
  print_header "Kanbn not found"
  echo -e "${RED}Error: kanbn command not found.${NC}"
  echo -e "Please install kanbn first:"
  print_command "npm install -g kanbn"
  exit 1
fi

# Check if OpenRouter API key is set
if [ -z "$OPENROUTER_API_KEY" ]; then
  print_header "OpenRouter API Key Not Set"
  echo -e "${YELLOW}Warning: OPENROUTER_API_KEY environment variable is not set.${NC}"
  echo -e "For the full AI experience, set your OpenRouter API key:"
  print_command "export OPENROUTER_API_KEY=your-api-key"
  echo -e "For this demo, we'll continue in test mode."
  export KANBN_ENV="test"
else
  print_success "OpenRouter API key is set."
fi

# Create a temporary directory for the demo
DEMO_DIR=$(mktemp -d)
print_header "Kanbn Interactive Demo"
print_info "This demo will show you how to use Kanbn with AI initialization."
print_info "Demo directory: $DEMO_DIR"

# Scenario 1: New Project
print_header "Scenario 1: New Project Initialization"
print_step "Creating a new project directory"
NEW_PROJECT_DIR="$DEMO_DIR/my-new-project"
run_command "mkdir -p $NEW_PROJECT_DIR"
run_command "cd $NEW_PROJECT_DIR"

print_step "Initializing a new project with AI"
print_info "You can initialize a new project with AI using the following command:"
print_command "kanbn init --ai --name 'My New Project' --message 'Create a web application with user authentication'"

print_info "Let's run it:"
wait_for_input
run_command "kanbn init --ai --name 'My New Project' --message 'Create a web application with user authentication'"

print_step "Viewing the board"
wait_for_input
run_command "kanbn board"

print_step "Chatting with the project assistant"
print_info "You can chat with your project assistant using:"
print_command "kanbn chat"
print_info "Try asking: 'What are the next steps for this project?'"

print_success "New project initialization complete!"

# Scenario 2: Existing Repository
print_header "Scenario 2: Existing Repository"
print_step "Cloning an example repository"
EXISTING_REPO_DIR="$DEMO_DIR/existing-repo"
run_command "mkdir -p $EXISTING_REPO_DIR"
run_command "cd $EXISTING_REPO_DIR"

print_info "For this demo, we'll create a simple repository structure."
run_command "mkdir -p src docs tests"
run_command "touch src/main.py src/utils.py"
run_command "touch docs/README.md"
run_command "touch tests/test_main.py"
run_command "git init"
run_command "git add ."
run_command "git config --global user.email 'demo@example.com'"
run_command "git config --global user.name 'Demo User'"
run_command "git commit -m 'Initial commit'"

print_step "Initializing Kanbn in an existing repository"
print_info "You can initialize Kanbn in an existing repository with:"
print_command "kanbn init --ai --name 'Existing Project' --message 'Create a task board for this Python project'"

print_info "Let's run it:"
wait_for_input
run_command "kanbn init --ai --name 'Existing Project' --message 'Create a task board for this Python project'"

print_step "Viewing the board"
wait_for_input
run_command "kanbn board"

print_success "Existing repository initialization complete!"

# Scenario 3: Adding Tasks
print_header "Scenario 3: Working with Tasks"
print_step "Adding a new task"
print_info "You can add a new task with:"
print_command "kanbn add 'Implement login functionality' --description 'Create a secure login system with password hashing'"

wait_for_input
run_command "kanbn add 'Implement login functionality' --description 'Create a secure login system with password hashing'"

print_step "Moving a task to In Progress"
print_info "You can move a task to a different column with:"
print_command "kanbn move implement-login-functionality 'In Progress'"

wait_for_input
run_command "kanbn move implement-login-functionality 'In Progress'"

print_step "Viewing the board again"
wait_for_input
run_command "kanbn board"

print_success "Task management complete!"

# Scenario 4: Using AI Chat
print_header "Scenario 4: Using AI Chat"
print_step "Chatting with the project assistant"
print_info "You can chat with your project assistant using:"
print_command "kanbn chat --message 'What should I work on next?'"

print_info "Let's try it:"
wait_for_input
run_command "kanbn chat --message 'What should I work on next?'"

print_success "AI chat complete!"

# Cleanup
print_header "Demo Complete"
print_info "This demo has shown you how to:"
echo "1. Initialize a new project with AI"
echo "2. Initialize Kanbn in an existing repository"
echo "3. Add and manage tasks"
echo "4. Use the AI chat feature"

print_info "Demo files are in: $DEMO_DIR"
print_info "You can remove them with:"
print_command "rm -rf $DEMO_DIR"

print_info "For more information, visit: https://github.com/basementuniverse/kanbn"
print_success "Thank you for trying Kanbn!"
