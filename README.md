# Kanbn

🎯 Transform your Git repository into an AI-powered Kanban board. Track tasks, manage sprints, and leverage AI to optimize your workflow - all from the command line.

## ✨ Key Features

- 🤖 AI-powered task decomposition and epic management
- 💬 Interactive project management assistant
- 📊 Visual progress tracking and burndown charts
- 🔄 Git-friendly markdown-based task management
- 🏃‍♂️ Sprint planning and execution
- 📱 Command-line interface for speed and efficiency
- 🌐 RAG integrations with HTML-to-Markdown conversion

## 🚀 Quick Start

```bash
# Install kanbn globally
npm install -g @tosin2013/kanbn

# Note: If you encounter issues on certain Linux distributions (e.g., Red Hat Linux 9.5),
# try using a newer Node.js version (12, 16, 20, or 22)

# Initialize a new board
kanbn init

# Or use AI-powered initialization
kanbn init --ai

# Or bootstrap a new project with our script (supports both OpenRouter and Ollama)
curl -O https://raw.githubusercontent.com/decision-crafters/kanbn/refs/heads/master/examples/bootstrap.sh
chmod +x bootstrap.sh

# Basic usage
./bootstrap.sh

# Create project with a specific name and description
./bootstrap.sh --project-name "My Project" --project-desc "A detailed project description"

# Create project with an epic (automatically decomposed into tasks)
./bootstrap.sh --project-name "Auth System" --epic "Create a user authentication system with registration and login capabilities"

# Use Ollama instead of OpenRouter
./bootstrap.sh --use-ollama

# Add a task
kanbn add

# View your board
kanbn board

# Get help for any command
kanbn help <command>

## 🐳 Using Containers (Docker & Podman)

Kanbn can be run in containers using either Docker or Podman.

### Using Docker

```bash
# Pull the latest container image
docker pull quay.io/takinosh/kanbn:latest

# Run Kanbn commands using the container
docker run -it --rm \
  -v $(pwd):/workspace \
  -e OPENROUTER_API_KEY=$OPENROUTER_API_KEY \
  quay.io/takinosh/kanbn:latest kanbn <command>

# For example, to initialize a new board:
docker run -it --rm \
  -v $(pwd):/workspace \
  quay.io/takinosh/kanbn:latest kanbn init

# Or to view your board:
docker run -it --rm \
  -v $(pwd):/workspace \
  quay.io/takinosh/kanbn:latest kanbn board
```

### Using Podman

```bash
# Pull the latest container image
podman pull quay.io/takinosh/kanbn:latest

# Run Kanbn commands using the container
podman run -it --rm \
  -v $(pwd):/workspace:Z \
  -w /workspace \
  -e OPENROUTER_API_KEY=$OPENROUTER_API_KEY \
  quay.io/takinosh/kanbn:latest kanbn <command>

# For example, to initialize a new board:
podman run -it --rm \
  -v $(pwd):/workspace:Z \
  -w /workspace \
  quay.io/takinosh/kanbn:latest kanbn init
```

Note the `:Z` flag on the volume mount when using Podman, which is necessary on SELinux-enabled systems.

### Using Ollama with Containers

#### With Docker:

```bash
# Run Kanbn with Ollama (running on the host)
docker run -it --rm \
  -v $(pwd):/workspace \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://host.docker.internal:11434 \
  -e OLLAMA_MODEL=llama3:latest \
  --add-host=host.docker.internal:host-gateway \
  quay.io/takinosh/kanbn:latest kanbn chat
```

#### With Podman:

```bash
# Run Kanbn with Ollama (running on the host)
podman run -it --rm \
  --network=host \
  -v $(pwd):/workspace:Z \
  -w /workspace \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://localhost:11434 \
  -e OLLAMA_MODEL=llama3:latest \
  quay.io/takinosh/kanbn:latest kanbn chat
```

### Container Bootstrap Script

For a complete containerized setup, use our bootstrap script:

```bash
# With Docker - Basic Usage
docker run --rm -v $(pwd):/workspace -w /workspace \
  -e PROJECT_NAME="My Container Project" \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://host.docker.internal:11434 \
  --add-host=host.docker.internal:host-gateway \
  quay.io/takinosh/kanbn:latest ./examples/bootstrap_container.sh

# With Docker - Create Project with Epic
docker run --rm -v $(pwd):/workspace -w /workspace \
  -e PROJECT_NAME="Auth System" \
  -e PROJECT_DESCRIPTION="A secure authentication system" \
  -e EPIC_DESCRIPTION="Create a user authentication system with registration and login" \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://host.docker.internal:11434 \
  --add-host=host.docker.internal:host-gateway \
  quay.io/takinosh/kanbn:latest ./examples/bootstrap_container.sh

# With Podman - Basic Usage
podman run --rm \
  --network=host \
  -v $(pwd):/workspace:Z \
  -w /workspace \
  -e PROJECT_NAME="My Container Project" \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://localhost:11434 \
  quay.io/takinosh/kanbn:latest ./examples/bootstrap_container.sh

# With Podman - Create Project with Epic
podman run --rm \
  --network=host \
  -v $(pwd):/workspace:Z \
  -w /workspace \
  -e PROJECT_NAME="Auth System" \
  -e PROJECT_DESCRIPTION="A secure authentication system" \
  -e EPIC_DESCRIPTION="Create a user authentication system with registration and login" \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://localhost:11434 \
  quay.io/takinosh/kanbn:latest ./examples/bootstrap_container.sh
```

The container mounts your current directory as `/workspace`, allowing Kanbn to manage tasks in your local project. For detailed container usage instructions and advanced configurations, see:
- [Docker Guide](docs/DOCKER.md)
- [Podman Guide](docs/PODMAN.md)

## 🧪 Example Scripts

Check out the `examples` directory for interactive scripts that demonstrate Kanbn's features:

- `interactive-demo.sh` - A comprehensive demo of Kanbn's features
- `bootstrap.sh` - Quickly set up a new Kanbn project with AI assistance
- `bootstrap_container.sh` - Set up a Kanbn project in a container environment
- `github-repo-init.sh` - How to use Kanbn with existing GitHub repositories

Run any example with:

```bash
./examples/interactive-demo.sh
```

## 📚 Documentation

For full documentation, visit [https://decision-crafters.github.io/kanbn/](https://decision-crafters.github.io/kanbn/)

### Available Commands

```bash

====================================================
COMMAND: kanbn help
DESCRIPTION: Show help menu
====================================================
Usage:
  kanbn ......... Show help menu
  kanbn <command> [options]

Where <command> is one of:
  help .......... Show help menu
  version ....... Show package version
  init .......... Initialise kanbn board
  board ......... Show the kanbn board
  task .......... Show a kanbn task
  add ........... Add a kanbn task
  edit .......... Edit a kanbn task
  rename ........ Rename a kanbn task
  move .......... Move a kanbn task to another column
  comment ....... Add a comment to a task
  remove ........ Remove a kanbn task
  find .......... Search for kanbn tasks
  status ........ Get project and task statistics
  sort .......... Sort a column in the index
  sprint ........ Start a new sprint
  burndown ...... View a burndown chart
  validate ...... Validate index and task files
  archive ....... Archive a task
  restore ....... Restore a task from the archive
  remove-all .... Remove the kanbn board and all tasks
  decompose ..... Use AI to break down tasks into subtas
```

### AI Features

```bash
# Task Decomposition
kanbn decompose --task task-id  # Use AI to break down tasks into subtasks

# Epic Management
kanbn chat "createEpic: Create a user authentication system"  # Create a new epic
kanbn chat "decomposeEpic: epic-id"  # Decompose an epic into subtasks
kanbn chat "listEpics"  # List all epics in the project
kanbn chat "showEpicDetails: epic-id"  # Show details of a specific epic
kanbn chat "listEpicTasks: epic-id"  # List all tasks belonging to an epic

# AI Assistant
kanbn chat       # Chat with AI project assistant
kanbn task task-id --prompt  # Generate AI-friendly prompt from task data

# RAG Integrations
kanbn integrations --add --name docs --url https://example.com/docs  # Add web content as context
kanbn chat --integration docs  # Chat with context from integrations
```

#### Epic Management

Epics are high-level tasks that can be broken down into smaller, actionable subtasks. Use epics to organize complex features or major project initiatives.

- **Creating Epics**: Create epics through the chat interface with a descriptive name
- **Decomposing Epics**: AI automatically breaks down epics into smaller tasks
- **Viewing Epics**: List all epics or details of specific epics
- **Managing Epic Tasks**: View all tasks associated with a specific epic

#### Environment Variables for AI Features

You can use either OpenRouter (cloud) or Ollama (local) for AI features including epic management. Configure via `.env` file or environment variables:

```bash
# Option 1: OpenRouter (cloud-based AI)
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_MODEL=google/gemma-3-4b-it:free  # Optional, default is shown

# Option 2: Ollama (local AI)
USE_OLLAMA=true  # Enable Ollama instead of OpenRouter
OLLAMA_HOST=http://localhost:11434  # Ollama API URL
OLLAMA_MODEL=qwen3  # Recommended model for epic decomposition

# Testing
USE_REAL_API=true  # Optional: Force real API calls in test environment
```

You can add these to a `.env` file in your project root. A `.env.example` file is provided as a template.

#### Command Reference

```bash
# Epics
kanbn chat "createEpic: <epic description>"   # Create a new epic with description
kanbn chat "decomposeEpic: <epic-id>"        # Decompose epic into child tasks
kanbn chat "listEpics"                       # Show all epics in the project
kanbn chat "showEpicDetails: <epic-id>"      # Show details of a specific epic
kanbn chat "listEpicTasks: <epic-id>"        # List all tasks in an epic

# Project Bootstrap with Epics
./bootstrap.sh --epic "Create an authentication system"  # Create project with epic
```

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 🧪 Testing

Run tests with:

```bash
npm test
```

### Testing OpenRouter API Integration

To verify that your OpenRouter API key is working correctly, you can use the included test script:

```bash
./test-openrouter-api.sh
```

This script will:
1. Load your API key from the `.env` file or environment variables
2. Make a test request to the OpenRouter API
3. Verify that the response contains the expected data

You can also run the full test suite including API tests with:

```bash
./test-all-commands.sh
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
