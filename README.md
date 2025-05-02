# Kanbn

🎯 Transform your Git repository into an AI-powered Kanban board. Track tasks, manage sprints, and leverage AI to optimize your workflow - all from the command line.

## ✨ Key Features

- 🤖 AI-powered task decomposition
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

# Or bootstrap a new project with our script (requires OpenRouter API key)
curl -O https://raw.githubusercontent.com/decision-crafters/kanbn/refs/heads/master/examples/bootstrap.sh
chmod +x bootstrap.sh
./bootstrap.sh

# Add a task
kanbn add

# View your board
kanbn board

# Get help for any command
kanbn help <command>

## 🐳 Using Docker Container

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

The container mounts your current directory as `/workspace`, allowing Kanbn to manage tasks in your local project. For detailed container usage instructions and advanced configurations, see [DOCKER.md](docs/DOCKER.md).

## 🧪 Example Scripts

Check out the `examples` directory for interactive scripts that demonstrate Kanbn's features:

- `interactive-demo.sh` - A comprehensive demo of Kanbn's features
- `bootstrap.sh` - Quickly set up a new Kanbn project with AI assistance
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
kanbn decompose  # Use AI to break down tasks
kanbn chat       # Chat with AI project assistant
kanbn task task-id --prompt  # Generate AI-friendly prompt from task data
kanbn integrations --add --name docs --url https://example.com/docs  # Add web content as context
kanbn chat --integration docs  # Chat with context from integrations
```

#### Environment Variables for AI Features

```bash
# Required for AI features
OPENROUTER_API_KEY=your_api_key_here

# Optional: Specify a different model (defaults to google/gemma-3-4b-it:free)
OPENROUTER_MODEL=google/gemma-3-4b-it:free

# Optional: Force real API calls in test environment
USE_REAL_API=true
```

You can add these to a `.env` file in your project root. A `.env.example` file is provided as a template.

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
