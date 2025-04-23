#!/bin/bash
set -e

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

# Function to print a menu option
print_option() {
  echo -e "${YELLOW}$1)${NC} $2"
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

# Main menu
print_header "Kanbn AI Initialization Examples"
print_info "This script demonstrates how to use Kanbn's AI initialization for different project types."
echo ""

# Project types menu
print_header "Select a Project Type"
print_option "1" "Web Application"
print_option "2" "Mobile App"
print_option "3" "Data Science Project"
print_option "4" "DevOps Project"
print_option "5" "Custom Project"
print_option "q" "Quit"
echo ""

# Get user selection
selection=$(get_input "Enter your choice" "1")

if [ "$selection" = "q" ]; then
  echo -e "${GREEN}Goodbye!${NC}"
  exit 0
fi

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"
echo -e "${GREEN}Created temporary directory: $TEMP_DIR${NC}"

# Initialize project based on selection
case $selection in
  1)
    print_header "Initializing Web Application Project"
    project_name=$(get_input "Enter project name" "My Web App")
    print_info "Running AI initialization for a web application..."
    print_command "kanbn init --ai --name \"$project_name\" --message \"Create a web application with user authentication, database integration, and responsive UI\""
    kanbn init --ai --name "$project_name" --message "Create a web application with user authentication, database integration, and responsive UI"
    ;;
  2)
    print_header "Initializing Mobile App Project"
    project_name=$(get_input "Enter project name" "My Mobile App")
    print_info "Running AI initialization for a mobile app..."
    print_command "kanbn init --ai --name \"$project_name\" --message \"Create a mobile app with user profiles, push notifications, and offline support\""
    kanbn init --ai --name "$project_name" --message "Create a mobile app with user profiles, push notifications, and offline support"
    ;;
  3)
    print_header "Initializing Data Science Project"
    project_name=$(get_input "Enter project name" "Data Analysis Project")
    print_info "Running AI initialization for a data science project..."
    print_command "kanbn init --ai --name \"$project_name\" --message \"Create a data science project with data collection, preprocessing, model training, and evaluation phases\""
    kanbn init --ai --name "$project_name" --message "Create a data science project with data collection, preprocessing, model training, and evaluation phases"
    ;;
  4)
    print_header "Initializing DevOps Project"
    project_name=$(get_input "Enter project name" "CI/CD Pipeline")
    print_info "Running AI initialization for a DevOps project..."
    print_command "kanbn init --ai --name \"$project_name\" --message \"Create a DevOps project with CI/CD pipeline setup, infrastructure as code, and monitoring\""
    kanbn init --ai --name "$project_name" --message "Create a DevOps project with CI/CD pipeline setup, infrastructure as code, and monitoring"
    ;;
  5)
    print_header "Initializing Custom Project"
    project_name=$(get_input "Enter project name" "Custom Project")
    project_description=$(get_input "Enter project description" "A custom project with specific requirements")
    print_info "Running AI initialization for your custom project..."
    print_command "kanbn init --ai --name \"$project_name\" --message \"$project_description\""
    kanbn init --ai --name "$project_name" --message "$project_description"
    ;;
  *)
    echo -e "${YELLOW}Invalid selection. Exiting.${NC}"
    exit 1
    ;;
esac

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
print_info "To clean up this demo, you can delete the temporary directory:"
print_command "rm -rf $TEMP_DIR"

echo -e "${GREEN}Thank you for trying Kanbn's AI initialization!${NC}"
