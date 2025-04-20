# Kanbn

🎯 Transform your Git repository into an AI-powered Kanban board. Track tasks, manage sprints, and leverage AI to optimize your workflow - all from the command line.

## ✨ Key Features

- 🤖 AI-powered task decomposition
- 💬 Interactive project management assistant
- 📊 Visual progress tracking and burndown charts
- 🔄 Git-friendly markdown-based task management
- 🏃‍♂️ Sprint planning and execution
- 📱 Command-line interface for speed and efficiency

## 🚀 Quick Start

### Prerequisites

- Node.js 20 or higher is required

```bash
# Install Node.js 20 (if not already installed)
# For macOS/Linux using nvm:
nvm install 20
nvm use 20

# For Windows using the installer:
# Download from https://nodejs.org/

# Install kanbn globally
npm install -g @tosin2013/kanbn

# Initialize a new board
kanbn init

# Add a task
kanbn add

# View your board
kanbn board

# Get help for any command
kanbn help <command>
```

## 📚 Documentation

For full documentation, visit [https://decision-crafters.github.io/kanbn/](https://decision-crafters.github.io/kanbn/)

### Available Commands

```bash
kanbn help      # Show help menu
kanbn init      # Initialize kanbn board
kanbn board     # Show the kanbn board
kanbn task      # Show a kanbn task
kanbn add       # Add a kanbn task
kanbn edit      # Edit a kanbn task
kanbn move      # Move a task to another column
kanbn status    # Get project statistics
kanbn sprint    # Start a new sprint
kanbn burndown  # View a burndown chart
```

### AI Features

```bash
kanbn decompose  # Use AI to break down tasks
kanbn chat       # Chat with AI project assistant
```

#### Environment Variables for AI Features

> **Note:** AI features require Node.js 20 or higher

```bash
# Required for AI features
OPENROUTER_API_KEY=your_api_key_here

# Optional: Specify a different model (defaults to google/gemma-3-4b-it:free)
OPENROUTER_MODEL=google/gemma-3-4b-it:free

# Optional: Force real API calls in test environment
USE_REAL_API=true
```

You can add these to a `.env` file in your project root.

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
