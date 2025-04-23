#!/bin/bash
set -e

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

# Function to print a command
print_command() {
  echo -e "${CYAN}$ $1${NC}"
}

# Function to print info
print_info() {
  echo -e "${BOLD}$1${NC}"
}

# Function to print error
print_error() {
  echo -e "${RED}$1${NC}"
}

# Function to get user input with a prompt
get_input() {
  local prompt="$1"
  local default="$2"
  local input
  
  if [ -n "$default" ]; then
    echo -e "${YELLOW}$prompt [${default}]:${NC} "
  else
    echo -e "${YELLOW}$prompt:${NC} "
  fi
  
  read input
  
  if [ -z "$input" ] && [ -n "$default" ]; then
    echo "$default"
  else
    echo "$input"
  fi
}

# Check if git is installed
if ! command -v git &> /dev/null; then
  print_error "Git is not installed. Please install git and try again."
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
  echo -e "${GREEN}✅ OpenRouter API key is set.${NC}"
fi

print_header "Kanbn GitHub Repository Initialization"
print_info "This script demonstrates how to use Kanbn with an existing GitHub repository."
echo ""

# Get repository URL
repo_url=$(get_input "Enter GitHub repository URL" "https://github.com/jlowin/fastmcp.git")

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"
echo -e "${GREEN}Created temporary directory: $TEMP_DIR${NC}"

# Clone the repository
print_header "Cloning Repository"
print_command "git clone $repo_url ."
git clone "$repo_url" .

# Check if clone was successful
if [ $? -ne 0 ]; then
  print_error "Failed to clone repository. Please check the URL and try again."
  exit 1
fi

print_info "Repository cloned successfully!"

# Get repository information
repo_name=$(basename -s .git "$repo_url")
repo_description=$(git config --get remote.origin.url)

# Initialize Kanbn
print_header "Initializing Kanbn"
print_info "Now we'll initialize Kanbn in this repository."
echo ""

# Get custom message
custom_message=$(get_input "Enter a custom message for AI initialization" "Create a task board for this repository with appropriate columns and initial tasks")

# Run initialization
print_command "kanbn init --ai --name \"$repo_name\" --message \"$custom_message\""
kanbn init --ai --name "$repo_name" --message "$custom_message"

# Show the board
print_header "Project Board"
print_command "kanbn board"
kanbn board

# Show next steps
print_header "Next Steps"
print_info "Your project has been initialized in: $TEMP_DIR"
print_info "You can now:"
echo "1. Add more tasks with: kanbn add 'Task name'"
echo "2. Move tasks between columns with: kanbn move task-id 'Column Name'"
echo "3. Chat with the project assistant with: kanbn chat"
echo ""
print_info "If you want to commit the Kanbn board to the repository:"
print_command "git add .kanbn/"
print_command "git commit -m \"Add Kanbn board\""
print_command "git push"
echo ""
print_info "To clean up this demo, you can delete the temporary directory:"
print_command "rm -rf $TEMP_DIR"

echo -e "${GREEN}Thank you for trying Kanbn with GitHub repositories!${NC}"
