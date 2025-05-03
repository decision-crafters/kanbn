#!/bin/bash
#export PS4='+(${BASH_SOURCE}:${LINENO}): ${FUNCNAME[0]:+${FUNCNAME[0]}(): }'
#set -x

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

  read -r input
  # Trim whitespace from input
  input=$(echo "$input" | xargs)

  if [ -z "$input" ] && [ -n "$default" ]; then
      input="$default"
  fi

  echo "$input"
}

# Function to check if kanbn is installed
check_kanbn_installed() {
  if ! command -v kanbn &> /dev/null; then
    print_error "Kanbn is not installed or not in your PATH"
    print_info "Please install Kanbn first with:"
    print_command "npm install -g @tosin2013/kanbn"
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
      return 0  # Newly initialized
    else
      print_info "Continuing without git..."
      return 2  # No git
    fi
  else
    print_success "Inside a git repository"
    # Show repository information
    REPO_NAME=$(basename -s .git $(git config --get remote.origin.url 2>/dev/null || echo "$(basename $(pwd))"))
    print_info "Repository: $REPO_NAME"
    #return 1  # Existing repo
  fi
}

# Function to check if Ollama is installed and running
check_ollama() {
  if command -v ollama &> /dev/null; then
    print_success "Ollama is installed"

    # Check if Ollama is running
    if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
      print_success "Ollama is running"
      return 0
    else
      print_warning "Ollama is installed but not running"
      print_info "Would you like to start Ollama now? (y/n) [y]:"
      read start_ollama

      if [ "$start_ollama" != "n" ] && [ "$start_ollama" != "N" ]; then
        print_info "Starting Ollama..."
        ollama serve &
        sleep 5

        # Check again if Ollama is running
        if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
          print_success "Ollama started successfully"
          return 0
        else
          print_error "Failed to start Ollama"
          return 1
        fi
      else
        print_info "Skipping Ollama start"
        return 1
      fi
    fi
  else
    print_warning "Ollama is not installed"
    return 1
  fi
}

# Function to setup API configuration
setup_api_key() {
  # Check for .env file
  if [ ! -f ".env" ]; then
    print_header "Environment Configuration Required"
    print_warning ".env file not found"

    print_info "Would you like to use Ollama (local) or OpenRouter (cloud) for AI capabilities?"
    echo "1. Ollama (local, free, requires installation)"
    echo "2. OpenRouter (cloud, requires API key)"
    echo -e "${YELLOW}Select an option (1-2) [1]:${NC} "
    read ai_option
    ai_option=${ai_option:-1}

    if [ "$ai_option" = "1" ]; then
      # Check if Ollama is installed and running
      if check_ollama; then
        # Get available models
        print_info "Checking available Ollama models..."
        available_models=$(ollama list 2>/dev/null | awk 'NR>1 {print $1}')

        if [ -z "$available_models" ]; then
          print_warning "No Ollama models found"
          print_info "Would you like to pull the recommended model (qwen3)? (y/n) [y]:"
          read pull_model

          if [ "$pull_model" != "n" ] && [ "$pull_model" != "N" ]; then
            print_info "Pulling qwen3 model..."
            ollama pull qwen3
            print_success "Model pulled successfully"
            default_model="qwen3"
          else
            print_info "Skipping model pull. Using default model."
            default_model="qwen3"
          fi
        else
          print_success "Available Ollama models:"
          echo "$available_models" | nl

          # Check if qwen3 is available
          if echo "$available_models" | grep -q "qwen3"; then
            default_model="qwen3"
          else
            # Use the first available model as default
            default_model=$(echo "$available_models" | head -n 1)
          fi

          print_info "Please select a model to use (enter the number or model name):"
          echo -e "${YELLOW}Model [${default_model}]:${NC} "
          read model_input

          if [ -n "$model_input" ]; then
            # Check if input is a number
            if [[ "$model_input" =~ ^[0-9]+$ ]]; then
              # Get the model name from the number
              selected_model=$(echo "$available_models" | sed -n "${model_input}p")
              if [ -n "$selected_model" ]; then
                default_model="$selected_model"
              fi
            else
              # Use the input as the model name
              default_model="$model_input"
            fi
          fi
        fi

        # Create .env file for Ollama
        echo "# Ollama configuration for Kanbn" > .env
        echo "USE_OLLAMA=true" >> .env
        echo "OLLAMA_URL=http://localhost:11434" >> .env
        echo "OLLAMA_MODEL=${default_model}" >> .env
        print_success ".env file created successfully with Ollama configuration"
      else
        print_error "Ollama is not available. Please install Ollama or choose OpenRouter."
        print_info "Would you like to use OpenRouter instead? (y/n) [y]:"
        read use_openrouter

        if [ "$use_openrouter" != "n" ] && [ "$use_openrouter" != "N" ]; then
          ai_option="2"
        else
          print_error "Cannot continue without either Ollama or OpenRouter."
          exit 1
        fi
      fi
    fi

    if [ "$ai_option" = "2" ]; then
      print_info "This script requires a .env file with your OpenRouter API key."
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
    exit 1
  else
    if [ "$USE_OLLAMA" = "true" ]; then
      print_success "Ollama configuration is set (Model: $OLLAMA_MODEL)"
    else
      print_success "OpenRouter API key is set"
    fi
  fi
}

# Function to clone a GitHub repository
clone_github_repo() {
  print_header "GitHub Repository Cloning"
  print_info "Please enter the GitHub repository URL to clone:"
  repo_url=$(get_input "Repository URL" "")

  if [ -z "$repo_url" ]; then
    print_error "No repository URL provided. Cannot continue."
    exit 1
  fi

  # Extract repo name from URL
  repo_name=$(basename -s .git "$repo_url")

  # Check if directory already exists
  if [ -d "$repo_name" ]; then
    print_warning "Directory '$repo_name' already exists."
    print_info "Would you like to remove it and clone again? (y/n) [n]:"
    read remove_dir

    if [ "$remove_dir" = "y" ] || [ "$remove_dir" = "Y" ]; then
      print_info "Removing existing directory..."
      rm -rf "$repo_name"
    else
      print_info "Please choose a different directory name:"
      repo_name=$(get_input "Directory name" "$repo_name-new")

      if [ -d "$repo_name" ]; then
        print_error "Directory '$repo_name' already exists. Please run the script again with a different name."
        exit 1
      fi
    fi
  fi

  print_info "Cloning repository into '$repo_name'..."
  if git clone "$repo_url" "$repo_name"; then
    print_success "Repository cloned successfully!"
    # Change to the repository directory
    cd "$repo_name"
    return 0
  else
    print_error "Failed to clone repository."
    exit 1
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
    print_info "Would you like to reinitialize it? (y/n) [n]:"
    read reinit

    if [ "$reinit" != "y" ] && [ "$reinit" != "Y" ]; then
      print_info "Skipping initialization. Using existing Kanbn board."
      return 0
    fi

    print_info "Reinitializing Kanbn..."

    # Backup the existing board
    backup_dir=".kanbn_backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    cp -r .kanbn/* "$backup_dir"
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
  kanbn init --ai --name "$project_name" --message "$project_description"

  # Unset the environment variable
  unset KANBN_ENV
  
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

  print_success "Kanbn project initialized successfully!"
  return 0
}

# Function to use kanbn chat to build a Kanban board
build_kanban_with_chat() {
  print_header "Building Kanban Board with AI"

  # Predefined tasks for the Kanban board
  print_info "Adding predefined tasks to the Kanban board..."

  # 1 · Define Product Vision & End-User Goals
  kanbn add --name "Describe primary user persona(s) and their top 3 pain points" --description "Add details to docs/VISION.md" --tags "Vision" --column "Backlog"
  kanbn add --name "State the product mission in ≤ 2 sentences" --description "Summarize the mission in docs/VISION.md" --tags "Vision" --column "Backlog"
  kanbn add --name "List 3 measurable success metrics" --description "Define metrics like time-to-X or adoption in docs/VISION.md" --tags "Vision" --column "Backlog"
  kanbn add --name "Add 'User Story' + 'Acceptance Criteria' sections to feature request template" --description "Update .github/ISSUE_TEMPLATE/feature_request.md" --tags "Vision" --column "Backlog"

  # 2 · Capture Architecture & Workflow Decisions
  kanbn add --name "Create high-level component diagram" --description "Add diagram to docs/ARCHITECTURE.md" --tags "Architecture" --column "Backlog"
  kanbn add --name "Document data/communication flow for a typical request" --description "Add details to docs/ARCHITECTURE.md" --tags "Architecture" --column "Backlog"
  kanbn add --name "Record pipeline strategy decision" --description "Add ADR to adrs/0001-choose-pipeline-strategy.md" --tags "Architecture" --column "Backlog"

  # 3 · Stand-up CI (Build + Unit Tests)
  kanbn add --name "Set up CI workflow for PRs to main" --description "Add .github/workflows/ci.yml with build and test steps" --tags "CI/CD" --column "Backlog"
  kanbn add --name "Ensure local test commands match CI" --description "Add make test or npm test to Makefile/package.json" --tags "CI/CD" --column "Backlog"

  # 4 · Automate Deploy to Staging
  kanbn add --name "Define staging environment infrastructure" --description "Add declarative IaC to infra/staging/" --tags "Deployment" --column "Backlog"
  kanbn add --name "Automate deploy to staging on successful build" --description "Add .github/workflows/deploy.yml with Slack/Teams notifications" --tags "Deployment" --column "Backlog"

  # 5 · Add E2E / Integration Test Skeleton
  kanbn add --name "Add E2E test skeleton" --description "Create tests/e2e/ with a smoke test scenario" --tags "Testing" --column "Backlog"
  kanbn add --name "Block merges on failed E2E tests" --description "Add CI job (e2e.yml) to enforce E2E test success" --tags "Testing" --column "Backlog"

  # 6 · Observability & Security Baseline
  kanbn add --name "Add structured logging with trace_id/request_id" --description "Update config/logging.yaml or code" --tags "Observability" --column "Backlog"
  kanbn add --name "Enable weekly dependency-update PRs" --description "Add .github/dependabot.yml" --tags "Security" --column "Backlog"
  kanbn add --name "Run security scans on every push" --description "Add .github/workflows/sec-scan.yml with Snyk/Trivy" --tags "Security" --column "Backlog"

  # 7 · Contributor Workflow & Knowledge Sharing
  kanbn add --name "Document contributor workflow" --description "Add branch naming conventions and PR checklist to docs/CONTRIBUTING.md" --tags "Collaboration" --column "Backlog"
  kanbn add --name "Create one-command local setup" --description "Add ./scripts/bootstrap.sh and link in docs/README.md" --tags "Collaboration" --column "Backlog"
  kanbn add --name "Link key documents in README" --description "Add links to VISION, ARCHITECTURE, and ADRs in docs/README.md" --tags "Collaboration" --column "Backlog"

  # Use AI to analyze and enhance the board
  print_info "Asking AI to analyze the board and suggest additional tasks..."
  kanbn chat --with-integrations --message "Analyze the predefined tasks and suggest additional tasks or improvements for the project."

  print_success "Kanban board built successfully with AI assistance!"
}

# Add this function definition after commit_changes (or near the end of main)

ask_integration_context() {
    while true; do
        print_header "Kanbn Integrations Context"
        print_info "To enhance AI assistance, you can add integration context. This lets you provide additional information (e.g., documentation, API specs) that the AI can reference using a Retrieval-Augmented Generation (RAG) approach."
        echo "Would you like to:"
        echo "1. Add an integration from a URL"
        echo "2. Inject README.md content as an integration"
        echo "3. Inject all files in the docs folder as integrations"
        echo "4. Inject Kanbn commands and their help recursively as an integration"
        echo "5. Exit"
        echo -e "${YELLOW}Select an option (1-6):${NC} "
        read integration_option

        case "$integration_option" in
            1)
                print_info "Injecting a Git URL or standard URL as an integration..."
                print_info "Please enter the URL to inject:"
                read -r url_input

                if [ -n "$url_input" ]; then
                    integration_name=$(basename "$url_input")
                    print_command "kanbn integrations --add --name \"$integration_name\" --url \"$url_input\""
                    kanbn integrations --add --name "$integration_name" --url "$url_input"
                    print_success "Injected $url_input as an integration."
                else
                    print_error "No URL provided. Skipping integration."
                fi
                ;;
            2)
                print_info "Injecting README.md content as integration by default..."
                if [ -f "README.md" ]; then
                    print_command "kanbn integrations --add --name readme --content \"$(cat README.md)\""
                    kanbn integrations --add --name readme --content "$(cat README.md)"
                    print_success "README.md content injected successfully as an integration."
                    kanbn integrations --list
                else
                    print_error "README.md file not found in the current directory."
                fi
                ;;
            3)
                print_info "Injecting all files in the docs folder as integrations..."
                if [ -d "docs" ]; then
                    for file in docs/*; do
                        if [ -f "$file" ]; then
                            integration_name=$(basename "$file")
                            print_command "kanbn integrations --add --name \"$integration_name\" --content \"$(cat "$file")\""
                            kanbn integrations --add --name "$integration_name" --content "$(cat "$file")"
                            print_success "Injected $file as an integration."
                        fi
                    done
                    kanbn integrations --list
                else
                    print_error "Docs folder not found in the current directory."
                fi
                ;;
            4)
                print_info "Injecting Kanbn commands and their help recursively as an integration..."
                kanbn_commands=$(kanbn help | grep -oP '^\s+\K\w+(?=\s+\.\.\.\.\.\.)')
                if [ -n "$kanbn_commands" ]; then
                    for command in $kanbn_commands; do
                        command_help=$(kanbn help "$command")
                        if [ -n "$command_help" ]; then
                            integration_name="kanbn-$command-help"
                            print_command "kanbn integrations --add --name \"$integration_name\" --content \"$command_help\""
                            kanbn integrations --add --name "$integration_name" --content "$command_help"
                            print_success "Injected help for command '$command' as an integration."
                        else
                            print_warning "No help available for command '$command'. Skipping."
                        fi
                    done
                    kanbn integrations --list
                else
                    print_error "No Kanbn commands found to inject."
                fi
                ;;
            5)
                print_info "Exiting integrations setup."
                break
                ;;
            6)
                print_info "Exiting integrations setup."
                break
                ;;
            *)
                print_error "Invalid option. Please try again."
                ;;
        esac
    done
}

# Function to commit changes to git
commit_changes() {
  if git rev-parse --is-inside-work-tree &> /dev/null; then
    print_header "Committing Changes"
    print_info "Would you like to commit the Kanbn board to git? (y/n) [y]:"
    read commit_to_git

    if [ "$commit_to_git" != "n" ] && [ "$commit_to_git" != "N" ]; then
      print_info "Adding Kanbn files to git..."
      git add .kanbn
      print_info "Committing Kanbn files..."
      git commit -m "Initialize Kanbn project board"
      print_success "Kanbn files committed to git"

      print_info "Would you like to push changes to the remote repository? (y/n) [n]:"
      read push_changes

      if [ "$push_changes" = "y" ] || [ "$push_changes" = "Y" ]; then
        print_info "Pushing changes to remote repository..."
        git push
        print_success "Changes pushed successfully!"
      else
        print_info "Skipping push. You can push changes later with:"
        print_command "git push"
      fi
    else
      print_info "Skipping commit. You can commit your Kanbn files later with:"
      print_command "git add .kanbn"
      print_command "git commit -m \"Initialize Kanbn project board\""
    fi
  else
    print_warning "Not in a git repository. Skipping commit."
  fi
}

# Main function
main() {
  print_header "Kanbn GitHub Project Integration"
  print_info "This script helps you initialize a Kanbn board for new or existing GitHub projects."
  echo ""

  # Check if kanbn is installed
  check_kanbn_installed

  # Ask if user wants to work with a new or existing project
  print_header "Project Selection"
  print_info "Would you like to:"
  echo "1. Clone and set up a new GitHub repository"
  echo "2. Work with an existing local repository"
  echo "3. Initialize a new project in the current directory"
  echo -e "${YELLOW}Select an option (1-3):${NC} "
  read project_option

  local git_status=0
  local project_dir=$(pwd)

  case $project_option in
    1)
      # Clone GitHub repository
      clone_github_repo
      project_dir=$(pwd)
      git_status=1
      ;;
    2)
      # Work with existing local repository
      print_header "Local Repository Path"
      print_info "Please enter the path to your local repository:"
      read -e -p "Repository path [$(pwd)]: " local_repo_path
      local_repo_path=${local_repo_path:-$(pwd)}

      if [ ! -d "$local_repo_path" ]; then
        print_error "Directory '$local_repo_path' does not exist."
        exit 1
      fi

      cd "$local_repo_path"
      project_dir=$(pwd)
      check_git_repo
      git_status=$?
      ;;
    3)
      # Initialize a new project in the current directory
      print_info "Using current directory: $(pwd)"
      project_dir=$(pwd)
      check_git_repo
      git_status=$?
      ;;
    *)
      print_error "Invalid option. Exiting."
      exit 1
      ;;
  esac

  # Setup OpenRouter API key
  setup_api_key

  # Get project information
  print_header "Project Information"
  DEFAULT_PROJECT_NAME=$(basename "$project_dir")
  print_info "Please provide a name for your project."
  project_name=$(get_input "Project name" "$DEFAULT_PROJECT_NAME")

  # Check if there's an existing Kanbn board
  local has_existing_board=false
  if [ -d ".kanbn" ]; then
    has_existing_board=true
    print_info "Existing Kanbn board found."

    get_existing_tasks

    print_info "Would you like to:"
    echo "1. Continue with the existing board"
    echo "2. Reinitialize the board (backup will be created)"
    echo -e "${YELLOW}Select an option (1-2):${NC} "
    read board_option

    if [ "$board_option" = "1" ]; then
      print_info "Continuing with existing board..."
    else
      # Get project description for reinitialization
      print_info "Please provide a description of your project:"
      project_description=$(get_input "Project description" "A software development project with multiple features and requirements.")

      # Initialize Kanbn
      init_kanbn "$project_name" "$project_description"

      ask_integration_context
      echo -e "${GREEN}Thank you for using Kanbn!${NC}"

      # Build Kanban board with chat
      build_kanban_with_chat
    fi
  else
    # No existing board, initialize a new one
    print_info "Please provide a description of your project:"
    project_description=$(get_input "Project description" "A software development project with multiple features and requirements.")

    # Initialize Kanbn
    init_kanbn "$project_name" "$project_description"

    ask_integration_context
    echo -e "${GREEN}Thank you for using Kanbn!${NC}"

    # Build Kanban board with chat
    build_kanban_with_chat
  fi

  # Commit changes to git if in a git repository
  if [ "$git_status" -eq 0 ] || [ "$git_status" -eq 1 ]; then
    commit_changes
  fi

  # Show next steps
  print_header "Next Steps"
  print_success "Your Kanbn project has been successfully set up!"
  print_info "You can now:"
  echo "1. View your board with: kanbn board"
  echo "2. Add more tasks with: kanbn add"
  echo "3. Move tasks between columns with: kanbn move task-id 'Column Name'"
  echo "4. Chat with the project assistant with: kanbn chat"
  echo "5. Decompose tasks into subtasks with: kanbn decompose --task task-id"
  echo "6. Add integration context with: ask_integration_context"
  echo ""

  # Ask if user wants to view the board
  print_info "Would you like to view your Kanban board now? (y/n) [y]:"
  read view_board

  if [ "$view_board" != "n" ] && [ "$view_board" != "N" ]; then
    print_info "Displaying Kanban board..."
    kanbn board
  fi

  echo -e "${GREEN}Thank you for using Kanbn!${NC}"
}

# Run the main function
main