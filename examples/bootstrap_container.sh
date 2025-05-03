#!/bin/bash
# Container-compatible bootstrap script for Kanbn
# This script is designed to work in container environments like Docker
# and is compatible with RHEL, Ubuntu, and other Linux distributions

# Exit on error, but allow the script to handle failures gracefully
set -o pipefail

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
  # Don't exit automatically to allow for graceful handling
}

# Function to check if kanbn is installed
check_kanbn_installed() {
  if ! command -v kanbn &> /dev/null; then
    print_error "Kanbn is not installed or not in your PATH"
    print_info "Please install Kanbn first with:"
    print_command "npm install -g @tosin2013/kanbn"
    return 1
  else
    print_success "Kanbn is installed ($(kanbn version | grep -o 'v[0-9.]*'))"
    return 0
  fi
}

# Function to check if Ollama is available
check_ollama() {
  # First check if OLLAMA_HOST is set
  if [ -n "$OLLAMA_HOST" ]; then
    print_info "Using Ollama at $OLLAMA_HOST"

    # Check if Ollama is reachable at the specified host
    if curl -s "$OLLAMA_HOST/api/tags" >/dev/null 2>&1; then
      print_success "Ollama is reachable at $OLLAMA_HOST"
      return 0
    else
      print_warning "Ollama is not reachable at $OLLAMA_HOST"
      return 1
    fi
  elif command -v ollama &> /dev/null; then
    print_success "Ollama is installed locally"

    # Check if Ollama is running locally
    if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
      print_success "Ollama is running locally"
      export OLLAMA_HOST="http://localhost:11434"
      return 0
    else
      print_warning "Ollama is installed but not running locally"
      return 1
    fi
  else
    print_warning "Ollama is not installed and OLLAMA_HOST is not set"
    return 1
  fi
}

# Function to setup API configuration
setup_api_key() {
  # Check for .env file
  if [ ! -f ".env" ]; then
    print_header "Environment Configuration"
    print_warning ".env file not found"

    # Check if environment variables are already set
    if [ -n "$OPENROUTER_API_KEY" ]; then
      print_success "Using OPENROUTER_API_KEY from environment"
      # Create .env file with the environment variable
      echo "# OpenRouter API key for Kanbn" > .env
      echo "OPENROUTER_API_KEY=$OPENROUTER_API_KEY" >> .env
      echo "OPENROUTER_MODEL=${OPENROUTER_MODEL:-google/gemma-3-4b-it:free}" >> .env
      print_success ".env file created with OpenRouter configuration"
    elif [ -n "$USE_OLLAMA" ] && [ "$USE_OLLAMA" = "true" ]; then
      if check_ollama; then
        # Get available models
        print_info "Checking available Ollama models..."

        # Use the OLLAMA_HOST if set, otherwise use localhost
        OLLAMA_URL=${OLLAMA_HOST:-http://localhost:11434}

        # Get available models using curl instead of ollama command
        available_models=$(curl -s "$OLLAMA_URL/api/tags" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)

        if [ -z "$available_models" ]; then
          print_warning "No Ollama models found"
          # Use the model specified in OLLAMA_MODEL or default to qwen3
          default_model=${OLLAMA_MODEL:-qwen3}
          print_info "Using default model: $default_model"
        else
          print_success "Available Ollama models:"
          echo "$available_models" | nl

          # Check if the model specified in OLLAMA_MODEL is available
          if [ -n "$OLLAMA_MODEL" ]; then
            if echo "$available_models" | grep -q "$OLLAMA_MODEL"; then
              default_model="$OLLAMA_MODEL"
              print_info "Using specified model: $default_model"
            else
              print_warning "Specified model $OLLAMA_MODEL not found"
              # Check if qwen3 is available
              if echo "$available_models" | grep -q "qwen3"; then
                default_model="qwen3"
                print_info "Using recommended model: $default_model"
              else
                # Use the first available model as default
                default_model=$(echo "$available_models" | head -n 1)
                print_info "Using available model: $default_model"
              fi
            fi
          else
            # No model specified, check if qwen3 is available
            if echo "$available_models" | grep -q "qwen3"; then
              default_model="qwen3"
              print_info "Using recommended model: $default_model"
            else
              # Use the first available model as default
              default_model=$(echo "$available_models" | head -n 1)
              print_info "Using available model: $default_model"
            fi
          fi
        fi

        # Create .env file for Ollama
        echo "# Ollama configuration for Kanbn" > .env
        echo "USE_OLLAMA=true" >> .env
        echo "OLLAMA_URL=$OLLAMA_URL" >> .env
        echo "OLLAMA_MODEL=${default_model}" >> .env
        print_success ".env file created with Ollama configuration"
      else
        print_error "Ollama is not available. Cannot continue without either Ollama or OpenRouter."
        return 1
      fi
    else
      print_error "Neither OPENROUTER_API_KEY nor USE_OLLAMA environment variables are set."
      print_info "Please set one of these environment variables and try again."
      return 1
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

  # Check if either OpenRouter API key or Ollama is configured
  if [ -z "$OPENROUTER_API_KEY" ] && [ "$USE_OLLAMA" != "true" ]; then
    print_header "API Configuration Not Set"
    print_error "Neither OPENROUTER_API_KEY nor USE_OLLAMA environment variables are set."
    print_info "Please check your .env file and make sure it contains either a valid OpenRouter API key or Ollama configuration."
    return 1
  else
    if [ "$USE_OLLAMA" = "true" ]; then
      print_success "Ollama configuration is set (Model: $OLLAMA_MODEL)"
    else
      print_success "OpenRouter API key is set"
    fi
    return 0
  fi
}

# Function to initialize Kanbn in the repository
init_kanbn() {
  local project_name="$1"
  local project_description="$2"

  print_header "Initializing Kanbn Project"

  # Check if kanbn is already initialized
  if [ -d ".kanbn" ]; then
    print_warning "Kanbn is already initialized in this directory"

    # In container mode, always reinitialize
    print_info "Reinitializing Kanbn..."

    # Backup the existing board
    backup_dir=".kanbn_backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    cp -r .kanbn/* "$backup_dir" 2>/dev/null || true
    print_info "Existing board backed up to $backup_dir"

    # Remove the existing board
    rm -rf .kanbn
    print_success "Existing board removed, ready for reinitialization"
  fi

  # Initialize kanbn with AI
  print_info "Initializing Kanbn with AI-powered assistance..."
  print_command "kanbn init --ai --name \"$project_name\" --message \"$project_description\""

  # Set environment variable to indicate test mode to avoid interactive prompts
  export KANBN_ENV="test"

  # Run the command
  if kanbn init --ai --name "$project_name" --message "$project_description"; then
    print_success "Kanbn project initialized successfully!"
    return 0
  else
    print_error "Failed to initialize Kanbn project"
    return 1
  fi
}

# Function to add integrations
add_integrations() {
  print_header "Adding Integrations"

  # Add README.md as integration if it exists
  if [ -f "README.md" ]; then
    print_info "Adding README.md as integration..."
    if kanbn integrations --add --name readme --content "$(cat README.md)"; then
      print_success "README.md added as integration"
    else
      print_warning "Failed to add README.md as integration"
    fi
  fi

  # Add docs folder content as integrations if it exists
  if [ -d "docs" ]; then
    print_info "Adding docs folder content as integrations..."
    for file in docs/*; do
      if [ -f "$file" ]; then
        filename=$(basename "$file")
        print_info "Adding $filename as integration..."
        if kanbn integrations --add --name "$filename" --content "$(cat "$file")"; then
          print_success "$filename added as integration"
        else
          print_warning "Failed to add $filename as integration"
        fi
      fi
    done
  fi

  # Add repository structure as integration
  print_info "Adding repository structure as integration..."
  repo_structure=$(find . -type f -not -path "*/\.*" -not -path "*/node_modules/*" | sort | head -n 50)
  if kanbn integrations --add --name "repo-structure" --content "$repo_structure"; then
    print_success "Repository structure added as integration"
  else
    print_warning "Failed to add repository structure as integration"
  fi

  # List all integrations
  print_info "Listing all integrations..."
  kanbn integrations --list
}

# Function to build a Kanban board with predefined tasks
build_kanban_board() {
  print_header "Building Kanban Board"

  # Set up standard columns by updating the index.md file
  print_info "Setting up standard columns..."
  
  # Create the .kanbn directory if it doesn't exist
  mkdir -p .kanbn
  
  # Update the index.md file with standard columns
  cat > .kanbn/index.md << EOF
# Kanban Board

## Backlog

## To Do

## In Progress

## Done

EOF
  
  print_success "Created standard columns: Backlog, To Do, In Progress, Done"

  # Add predefined tasks
  print_info "Adding predefined tasks..."

  # Add a few example tasks
  kanbn add --name "Setup project infrastructure" --description "Set up the basic project structure and dependencies" --column "Backlog" || print_warning "Failed to add task"
  kanbn add --name "Create documentation" --description "Write comprehensive documentation for the project" --column "To Do" || print_warning "Failed to add task"
  kanbn add --name "Implement core features" --description "Develop the core functionality of the application" --column "Backlog" || print_warning "Failed to add task"

  # Show the board
  print_info "Kanban board created with predefined tasks"
  kanbn board
}

# Function to handle project initialization based on environment variables
setup_project() {
  print_header "Project Setup"

  # Check for PROJECT_MODE environment variable
  # 1 = Clone repository
  # 2 = Use existing repository
  # 3 = Initialize new project (default)
  PROJECT_MODE=${PROJECT_MODE:-3}

  case $PROJECT_MODE in
    1)
      # Clone GitHub repository
      if [ -z "$GITHUB_REPO_URL" ]; then
        print_error "GITHUB_REPO_URL environment variable is required for clone mode"
        print_info "Example: GITHUB_REPO_URL=https://github.com/username/repo.git"
        return 1
      fi

      print_info "Cloning repository: $GITHUB_REPO_URL"
      REPO_NAME=$(basename -s .git "$GITHUB_REPO_URL")
      CLONE_DIR=${CLONE_DIR:-"/workspace/$REPO_NAME"}

      # Check if directory already exists
      if [ -d "$CLONE_DIR" ]; then
        if [ "$FORCE_CLONE" = "true" ]; then
          print_warning "Directory '$CLONE_DIR' already exists, removing..."
          rm -rf "$CLONE_DIR"
        else
          print_error "Directory '$CLONE_DIR' already exists. Set FORCE_CLONE=true to overwrite"
          return 1
        fi
      fi

      # Clone the repository
      if git clone "$GITHUB_REPO_URL" "$CLONE_DIR"; then
        print_success "Repository cloned successfully to $CLONE_DIR"
        cd "$CLONE_DIR" || return 1
      else
        print_error "Failed to clone repository"
        return 1
      fi
      ;;

    2)
      # Use existing repository
      REPO_PATH=${REPO_PATH:-"/workspace"}

      if [ ! -d "$REPO_PATH" ]; then
        print_error "Repository path '$REPO_PATH' does not exist"
        return 1
      fi

      print_info "Using existing repository at: $REPO_PATH"
      cd "$REPO_PATH" || return 1

      # Check if it's a git repository
      if git rev-parse --is-inside-work-tree &> /dev/null; then
        print_success "Valid git repository found"
      else
        print_warning "Not a git repository. Continuing without git..."
      fi
      ;;

    3)
      # Initialize new project in current directory
      WORKSPACE_DIR=${WORKSPACE_DIR:-"/workspace"}

      if [ ! -d "$WORKSPACE_DIR" ]; then
        print_info "Creating workspace directory: $WORKSPACE_DIR"
        mkdir -p "$WORKSPACE_DIR"
      fi

      print_info "Initializing new project in: $WORKSPACE_DIR"
      cd "$WORKSPACE_DIR" || return 1

      # Initialize git if requested
      if [ "$INIT_GIT" = "true" ] && ! git rev-parse --is-inside-work-tree &> /dev/null; then
        print_info "Initializing git repository..."
        git init
        print_success "Git repository initialized"
      fi
      ;;

    *)
      print_error "Invalid PROJECT_MODE: $PROJECT_MODE. Must be 1, 2, or 3."
      return 1
      ;;
  esac

  print_info "Project setup complete"
  return 0
}

# Main function
main() {
  print_header "Kanbn Container Bootstrap"
  print_info "This script initializes a Kanbn board in a container environment."
  print_info "Available project modes:"
  print_info "1. Clone and set up a new GitHub repository (set PROJECT_MODE=1 and GITHUB_REPO_URL, e.g., https://github.com/tosin2013/sno-quickstarts.git)"
  print_info "2. Work with an existing local repository (set PROJECT_MODE=2 and REPO_PATH)"
  print_info "3. Initialize a new project in the current directory (default, set PROJECT_MODE=3)"

  # Check if kanbn is installed
  if ! check_kanbn_installed; then
    print_error "Kanbn is not installed. Exiting."
    exit 1
  fi

  # Setup project based on mode
  if ! setup_project; then
    print_error "Project setup failed. Exiting."
    exit 1
  fi

  # Setup API key
  if ! setup_api_key; then
    print_error "Failed to set up API configuration. Exiting."
    exit 1
  fi

  # Get project name from environment or use default
  PROJECT_NAME=${PROJECT_NAME:-"Container Project"}
  PROJECT_DESCRIPTION=${PROJECT_DESCRIPTION:-"A project initialized in a container environment"}

  # Initialize Kanbn
  if ! init_kanbn "$PROJECT_NAME" "$PROJECT_DESCRIPTION"; then
    print_error "Failed to initialize Kanbn. Exiting."
    exit 1
  fi

  # Add integrations
  add_integrations

  # Build Kanban board
  build_kanban_board

  # Commit changes if in a git repository and GIT_COMMIT is true
  if [ "$GIT_COMMIT" = "true" ] && git rev-parse --is-inside-work-tree &> /dev/null; then
    print_info "Committing changes to git..."
    git add .kanbn
    git commit -m "Initialize Kanbn project board"
    print_success "Changes committed to git"

    # Push changes if GIT_PUSH is true
    if [ "$GIT_PUSH" = "true" ]; then
      print_info "Pushing changes to remote repository..."
      if git push; then
        print_success "Changes pushed successfully"
      else
        print_warning "Failed to push changes. You may need to push manually."
      fi
    fi
  fi

  print_header "Kanbn Setup Complete"
  print_success "Your Kanbn project has been successfully set up!"
  print_info "You can now use the following commands:"
  echo "- kanbn board: View your Kanban board"
  echo "- kanbn add: Add a new task"
  echo "- kanbn move: Move a task between columns"
  echo "- kanbn chat: Chat with the AI assistant"

  return 0
}

# Run the main function
main
exit $?
