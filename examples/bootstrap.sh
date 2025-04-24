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
    printf "${YELLOW}%s [%s]:${NC} " "$prompt" "$default"
  else
    printf "${YELLOW}%s:${NC} " "$prompt"
  fi

  # Use read -r to preserve backslashes
  read -r input

  if [ -z "$input" ] && [ -n "$default" ]; then
    input="$default"
  fi

  # Return just the input, not the prompt
  echo "$input"
}

# Function to check if kanbn is installed
check_kanbn_installed() {
  if ! command -v kanbn &> /dev/null; then
    print_error "Kanbn is not installed or not in your PATH"
    print_info "Please install Kanbn first with:"
    print_command "npm install -g @tosin2013/kanbn"
    echo ""
    print_info "Or if you prefer to install it locally:"
    print_command "npm install @tosin2013/kanbn"
    exit 1
  else
    print_success "Kanbn is installed ($(kanbn version | grep -o 'v[0-9.]*'))"
  fi
}

# Function to check if we're in a git repository
check_git_repo() {
  if ! git rev-parse --is-inside-work-tree &> /dev/null; then
    print_warning "Not inside a git repository"
    print_info "Kanbn works best with git repositories, but can be used without git."
    echo -e "${YELLOW}Would you like to initialize git in this directory? (y/n) [n]:${NC} "
    read init_git

    if [ "$init_git" = "y" ] || [ "$init_git" = "Y" ]; then
      print_info "Initializing git repository..."
      git init
      print_success "Git repository initialized"
    else
      print_info "Continuing without git..."
    fi
  else
    print_success "Inside a git repository"
    # Show repository information
    REPO_NAME=$(basename -s .git $(git config --get remote.origin.url 2>/dev/null || echo "$(basename $(pwd))"))
    print_info "Repository: $REPO_NAME"
  fi
}

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check if we're in the examples directory or in a user project
if [[ "$SCRIPT_DIR" == *"/examples" ]]; then
  # We're running from the examples directory
  REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
  IN_EXAMPLES=true
else
  # We're running from somewhere else
  REPO_DIR="$(pwd)"
  IN_EXAMPLES=false
fi

# Welcome message
print_header "Kanbn Project Bootstrap"
print_info "This script will help you set up a new Kanbn project board with AI assistance."
print_info "Requirements:"
echo "- Kanbn installed (will be checked)"
echo "- Git repository (optional, will be checked)"
echo "- OpenRouter API key (required, will be prompted if not found)"
echo ""

# Check if kanbn is installed
check_kanbn_installed

# Check if we're in a git repository
check_git_repo

# Check if kanbn is already initialized
if [ -d ".kanbn" ]; then
  print_warning "Kanbn is already initialized in this directory"
  echo -e "${YELLOW}Would you like to reinitialize it? (y/n) [n]:${NC} "
  read reinit

  if [ "$reinit" != "y" ] && [ "$reinit" != "Y" ]; then
    print_info "Exiting without changes."
    exit 0
  fi

  print_info "Reinitializing Kanbn..."
fi

# Check for .env file
if [ ! -f ".env" ]; then
  print_header "Environment Configuration Required"
  print_warning ".env file not found"
  print_info "The bootstrap script requires a .env file with your OpenRouter API key."
  print_info "You can get a free API key at: https://openrouter.ai/"
  echo ""

  print_info "Would you like to create a .env file now? (y/n) [y]:"
  read create_env

  if [ "$create_env" != "n" ] && [ "$create_env" != "N" ]; then
    print_header "Creating .env File"
    print_info "Please enter your OpenRouter API key:"
    echo -e "${YELLOW}API Key:${NC} "
    read api_key_input

    if [ -z "$api_key_input" ]; then
      print_error "No API key provided. Cannot continue without an API key."
      print_info "Please get an API key from https://openrouter.ai/ and run this script again."
      exit 1
    else
      # Create .env file
      echo "# OpenRouter API key for Kanbn" > .env
      echo "OPENROUTER_API_KEY=$api_key_input" >> .env
      echo "OPENROUTER_MODEL=google/gemma-3-4b-it:free" >> .env
      print_success ".env file created successfully"
    fi
  else
    print_error "Cannot continue without a .env file."
    print_info "Please create a .env file with your OpenRouter API key and run this script again."
    print_info "Example .env file:"
    echo "# OpenRouter API key for Kanbn"
    echo "OPENROUTER_API_KEY=your-api-key"
    echo "OPENROUTER_MODEL=google/gemma-3-4b-it:free"
    exit 1
  fi
fi

# Load environment variables from .env file
print_info "Loading environment variables from .env file"
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
done < ".env"

# Check if OpenRouter API key is set
if [ -z "$OPENROUTER_API_KEY" ]; then
  print_header "OpenRouter API Key Not Set"
  print_error "OPENROUTER_API_KEY environment variable is not set."
  print_info "This is unexpected since we already checked for the .env file."
  print_info "Please check your .env file and make sure it contains a valid OpenRouter API key."
  print_info "Example .env file:"
  echo "# OpenRouter API key for Kanbn"
  echo "OPENROUTER_API_KEY=your-api-key"
  echo "OPENROUTER_MODEL=google/gemma-3-4b-it:free"
  exit 1
else
  print_success "OpenRouter API key is set"

  # Verify the API key works
  print_info "Verifying OpenRouter API key..."

  # Create a temporary file to store the API response
  API_RESPONSE_FILE=$(mktemp)

  # Test the API key with a simple request and save the response
  echo -e "🌐 Sending test request to OpenRouter API..."
  curl -s -X POST \
    -H "Authorization: Bearer $OPENROUTER_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"model":"google/gemma-3-4b-it:free","messages":[{"role":"user","content":"Hello"}]}' \
    https://openrouter.ai/api/v1/chat/completions > "$API_RESPONSE_FILE"

  # Check if the response contains expected fields
  if grep -q "choices" "$API_RESPONSE_FILE"; then
    print_success "OpenRouter API key is valid!"

    # Extract and validate the model name
    MODEL_NAME=$(grep -o '"model":"[^"]*"' "$API_RESPONSE_FILE" | head -1 | cut -d '"' -f 4)
    echo -e "📊 Model used: ${CYAN}$MODEL_NAME${NC}"

    # Clean up temporary file
    rm -f "$API_RESPONSE_FILE"
  else
    print_warning "API key verification failed. Response:"
    cat "$API_RESPONSE_FILE"
    echo ""
    print_error "Cannot continue with an invalid API key."
    print_info "Please check your OpenRouter API key and try again."

    # Clean up temporary file
    rm -f "$API_RESPONSE_FILE"
    exit 1
  fi

  # Check if OPENROUTER_MODEL is set, otherwise use default
  if [ -z "$OPENROUTER_MODEL" ]; then
    export OPENROUTER_MODEL="google/gemma-3-4b-it:free"
    print_info "Using default model: ${CYAN}$OPENROUTER_MODEL${NC}"
  else
    print_info "Using model: ${CYAN}$OPENROUTER_MODEL${NC}"
  fi
fi

# Project setup
print_header "Project Setup"
print_info "Let's set up your Kanbn project board."
echo ""

# Get project name
DEFAULT_PROJECT_NAME=$(basename $(pwd))
print_info "Please enter a name for your project:"
project_name=$(get_input "Project name" "$DEFAULT_PROJECT_NAME")

# Project types menu
print_header "Select a Project Type"
print_info "Please select the type of project you want to create:"
print_option "1" "Web Application"
print_option "2" "Mobile App"
print_option "3" "Data Science Project"
print_option "4" "DevOps Project"
print_option "5" "API Development"
print_option "6" "Game Development"
print_option "7" "Custom Project"
print_option "8" "Documentation (GitHub Pages)"
print_option "q" "Quit"
echo ""

# Get user selection
user_input=$(get_input "Enter your choice" "1")
selection=$(echo "$user_input" | grep -o '[0-9q]$' || echo "$user_input")

if [ "$selection" = "q" ]; then
  print_info "Exiting without creating a project."
  exit 0
fi

# Function to get additional context from the user
get_additional_context() {
  local project_type="$1"
  local additional_context=""

  print_info "Would you like to provide additional context for your $project_type project? (y/n) [y]:"
  read provide_context

  if [ "$provide_context" != "n" ] && [ "$provide_context" != "N" ]; then
    print_info "Please provide any specific requirements, features, or context for your project:"
    print_info "(This will help the AI generate more relevant tasks and columns)"
    echo ""
    additional_context=$(get_input "Additional context" "")
    echo "$additional_context"
    return 0
  else
    echo ""
    return 1
  fi
}

# Function to run kanbn init with model parameter if specified
run_init() {
  local name="$1"
  local message="$2"
  local model="$3"

  # Create a temporary file to capture the output
  local output_file=$(mktemp)

  if [ -n "$model" ]; then
    print_command "kanbn init --ai --name \"$name\" --message \"$message\" --model \"$model\""
    # Run the command and capture the output
    kanbn init --ai --name "$name" --message "$message" --model "$model" > "$output_file" 2>&1
  else
    print_command "kanbn init --ai --name \"$name\" --message \"$message\""
    # Run the command and capture the output
    kanbn init --ai --name "$name" --message "$message" > "$output_file" 2>&1
  fi

  # Filter out the "Falling back to test mode response" message and display the output
  cat "$output_file" | grep -v "Falling back to test mode response" | grep -v "OpenRouter API call completed successfully"

  # Clean up the temporary file
  rm -f "$output_file"
}

# Get custom model if user wants to specify one
print_info "Would you like to use a specific AI model for generating tasks? (y/n) [n]:"
read use_custom_model

if [ "$use_custom_model" = "y" ] || [ "$use_custom_model" = "Y" ]; then
  print_header "Select AI Model"
  print_info "Please select one of the following AI models:"
  print_info "Available models (free options don't require payment):"
  print_option "1" "google/gemma-3-4b-it:free (Default, Free)"
  print_option "2" "anthropic/claude-3-haiku-20240307 (Faster, Paid)"
  print_option "3" "anthropic/claude-3-sonnet-20240229 (Better quality, Paid)"
  print_option "4" "meta-llama/llama-3-8b-instruct (Free)"
  print_option "5" "Custom model"
  echo ""

  model_selection=$(get_input "Enter your choice" "1")

  case $model_selection in
    1)
       CUSTOM_MODEL="google/gemma-3-4b-it:free"
       print_success "Using model: $CUSTOM_MODEL"
       ;;
    2)
       CUSTOM_MODEL="anthropic/claude-3-haiku-20240307"
       print_success "Using model: $CUSTOM_MODEL"
       ;;
    3)
       CUSTOM_MODEL="anthropic/claude-3-sonnet-20240229"
       print_success "Using model: $CUSTOM_MODEL"
       ;;
    4)
       CUSTOM_MODEL="meta-llama/llama-3-8b-instruct"
       print_success "Using model: $CUSTOM_MODEL"
       ;;
    5)
       CUSTOM_MODEL=$(get_input "Enter custom model identifier" "")
       if [ -n "$CUSTOM_MODEL" ]; then
         print_success "Using model: $CUSTOM_MODEL"
       else
         print_warning "No custom model specified. Using default."
         CUSTOM_MODEL=""
       fi
       ;;
    *)
       print_warning "Invalid selection. Using default model."
       CUSTOM_MODEL=""
       ;;
  esac
else
  CUSTOM_MODEL=""
fi

# Initialize project based on selection
print_header "Initializing Project"

case $selection in
  1)
    print_info "Initializing Web Application Project: $project_name"
    base_prompt="Create a web application with user authentication, database integration, and responsive UI"

    # Get additional context if the user wants to provide it
    additional_context=$(get_additional_context "Web Application")

    if [ -n "$additional_context" ]; then
      prompt="$base_prompt. Additional context: $additional_context"
    else
      prompt="$base_prompt"
    fi

    print_info "Running AI initialization..."
    run_init "$project_name" "$prompt" "$CUSTOM_MODEL"
    ;;
  2)
    print_info "Initializing Mobile App Project: $project_name"
    base_prompt="Create a mobile app with user profiles, push notifications, and offline support"

    # Get additional context if the user wants to provide it
    additional_context=$(get_additional_context "Mobile App")

    if [ -n "$additional_context" ]; then
      prompt="$base_prompt. Additional context: $additional_context"
    else
      prompt="$base_prompt"
    fi

    print_info "Running AI initialization..."
    run_init "$project_name" "$prompt" "$CUSTOM_MODEL"
    ;;
  3)
    print_info "Initializing Data Science Project: $project_name"
    base_prompt="Create a data science project with data collection, preprocessing, model training, and evaluation phases"

    # Get additional context if the user wants to provide it
    additional_context=$(get_additional_context "Data Science")

    if [ -n "$additional_context" ]; then
      prompt="$base_prompt. Additional context: $additional_context"
    else
      prompt="$base_prompt"
    fi

    print_info "Running AI initialization..."
    run_init "$project_name" "$prompt" "$CUSTOM_MODEL"
    ;;
  4)
    print_info "Initializing DevOps Project: $project_name"
    base_prompt="Create a DevOps project with CI/CD pipeline setup, infrastructure as code, and monitoring"

    # Get additional context if the user wants to provide it
    additional_context=$(get_additional_context "DevOps")

    if [ -n "$additional_context" ]; then
      prompt="$base_prompt. Additional context: $additional_context"
    else
      prompt="$base_prompt"
    fi

    print_info "Running AI initialization..."
    run_init "$project_name" "$prompt" "$CUSTOM_MODEL"
    ;;
  5)
    print_info "Initializing API Development Project: $project_name"
    base_prompt="Create an API development project with endpoint design, authentication, documentation, and testing"

    # Get additional context if the user wants to provide it
    additional_context=$(get_additional_context "API Development")

    if [ -n "$additional_context" ]; then
      prompt="$base_prompt. Additional context: $additional_context"
    else
      prompt="$base_prompt"
    fi

    print_info "Running AI initialization..."
    run_init "$project_name" "$prompt" "$CUSTOM_MODEL"
    ;;
  6)
    print_info "Initializing Game Development Project: $project_name"
    base_prompt="Create a game development project with game design, asset creation, programming, and testing phases"

    # Get additional context if the user wants to provide it
    additional_context=$(get_additional_context "Game Development")

    if [ -n "$additional_context" ]; then
      prompt="$base_prompt. Additional context: $additional_context"
    else
      prompt="$base_prompt"
    fi

    print_info "Running AI initialization..."
    run_init "$project_name" "$prompt" "$CUSTOM_MODEL"
    ;;
  7)
    print_info "Initializing Custom Project: $project_name"
    print_info "For a custom project, please provide a detailed description of what you want to build."
    print_info "This will help the AI generate appropriate tasks and columns for your project."
    echo ""
    project_description=$(get_input "Enter project description" "A custom project with specific requirements")
    print_info "Running AI initialization..."
    run_init "$project_name" "$project_description" "$CUSTOM_MODEL"
    ;;
  8)
    print_info "Initializing Documentation Project with GitHub Pages: $project_name"

    # Check if this is a git repository
    if ! git rev-parse --is-inside-work-tree &> /dev/null; then
      print_error "This is not a git repository. GitHub Pages documentation requires a git repository."
      print_info "Please initialize git first with: git init"
      exit 1
    fi

    # Get repository information
    repo_name=$(basename -s .git $(git config --get remote.origin.url 2>/dev/null || echo "$(basename $(pwd))"))

    print_info "Repository: $repo_name"
    print_info "This will create tasks for documenting your project using GitHub Pages."

    # Get additional context about the repository
    print_info "Please provide information about your repository:"
    repo_description=$(get_input "Repository description" "A project that needs documentation")

    # Ask about existing documentation
    print_info "Does your repository already have any documentation? (y/n) [n]:"
    read has_docs

    if [ "$has_docs" = "y" ] || [ "$has_docs" = "Y" ]; then
      docs_location=$(get_input "Where is your existing documentation located?" "docs/")
      prompt="Create a documentation project using GitHub Pages for the repository '$repo_name'. Repository description: $repo_description. The repository already has documentation in '$docs_location'. Create tasks for improving and expanding the documentation, setting up GitHub Pages, and maintaining documentation."
    else
      prompt="Create a documentation project using GitHub Pages for the repository '$repo_name'. Repository description: $repo_description. The repository does not have any documentation yet. Create tasks for creating documentation from scratch, setting up GitHub Pages, and maintaining documentation."
    fi

    print_info "Running AI initialization..."
    run_init "$project_name" "$prompt" "$CUSTOM_MODEL"
    ;;
  *)
    print_error "Invalid selection. Exiting."
    exit 1
    ;;
esac

# Show the board
print_header "Project Board"
print_command "kanbn board"
kanbn board

# Ask if user wants to chat with the project assistant
print_header "Project Assistant"
print_info "Would you like to chat with the project assistant? (y/n) [y]:"
read chat_with_assistant

if [ "$chat_with_assistant" != "n" ] && [ "$chat_with_assistant" != "N" ]; then
  print_info "Starting chat with the project assistant..."
  print_command "kanbn chat --message 'What are the next steps for this project?'"
  kanbn chat --message "What are the next steps for this project?"
fi

# Show next steps
print_header "Next Steps"
print_success "Your Kanbn project has been successfully initialized!"
print_info "You can now:"
echo "1. View your board with: kanbn board"
echo "2. Add more tasks with: kanbn add 'Task name'"
echo "3. Move tasks between columns with: kanbn move task-id 'Column Name'"
echo "4. Chat with the project assistant with: kanbn chat"
echo "5. Decompose tasks into subtasks with: kanbn decompose --task task-id"
echo ""

print_header "AI Features Overview"
print_info "Kanbn includes several AI-powered features:"
echo "1. AI-Powered Initialization (kanbn init --ai)"
echo "   - Creates a project board with appropriate columns"
echo "   - Generates initial tasks based on project description"
echo "   - Customizable with --message, --model, and other flags"
echo ""
echo "2. Project Assistant Chat (kanbn chat)"
echo "   - Provides guidance and answers questions about your project"
echo "   - Maintains context between sessions with memory persistence"
echo "   - Can be used with --message flag for non-interactive mode"
echo ""
echo "3. Task Decomposition (kanbn decompose)"
echo "   - Breaks down complex tasks into smaller, actionable subtasks"
echo "   - Creates parent-child relationships between tasks"
echo "   - Can add references to subtasks with --with-refs flag"
echo ""
echo "4. AI-Powered Task Creation (kanbn chat --create-task)"
echo "   - Creates tasks based on natural language descriptions"
echo "   - Automatically assigns appropriate metadata"
echo ""

# Git integration
if git rev-parse --is-inside-work-tree &> /dev/null; then
  print_header "Git Integration"
  print_info "Would you like to commit your Kanbn board to git? (y/n) [y]:"
  read commit_to_git

  if [ "$commit_to_git" != "n" ] && [ "$commit_to_git" != "N" ]; then
    print_info "Adding Kanbn files to git..."
    git add .kanbn
    print_info "Committing Kanbn files..."
    git commit -m "Initialize Kanbn project board"
    print_success "Kanbn files committed to git"
  else
    print_info "You can commit your Kanbn files later with:"
    print_command "git add .kanbn"
    print_command "git commit -m \"Initialize Kanbn project board\""
  fi
fi

print_header "Documentation"
print_info "For more information on using Kanbn, visit:"
echo "https://decision-crafters.github.io/kanbn/"
echo ""

echo -e "${GREEN}Thank you for using Kanbn!${NC}"
