# Welcome to Kanbn

> Your intelligent command-line task management companion powered by AI

Kanbn revolutionizes project management by combining the simplicity of Kanban boards with cutting-edge AI capabilities, all through an elegant command-line interface.

## 🌟 Key Features

### 🤖 AI-Powered Intelligence
- **Smart Task Management**: AI-driven task creation, estimation, and organization
- **Natural Language Interface**: Interact with your project through conversation
- **Automated Documentation**: Generate and maintain project documentation
- **Context Awareness**: AI remembers project context and previous decisions
- **Intelligent Suggestions**: Get smart recommendations for next actions
- **Progress Analysis**: AI-powered insights into project velocity and bottlenecks

### 📊 Project Management
- **Kanban Workflow**: Visual task tracking with customizable columns
- **Task Dependencies**: Track and manage task relationships
- **Sprint Planning**: Organize work into sprints with burndown charts
- **Resource Management**: Assign and track team member workload
- **Priority Management**: Smart task prioritization and scheduling

### 🛠 Developer-Friendly
- **Git Integration**: Version-controlled task management
- **Markdown Support**: Rich text formatting for task descriptions
- **CLI Efficiency**: Fast and powerful command-line interface
- **API References**: Link tasks to external systems and documentation
- **Extensible Design**: Customize workflows with plugins and hooks

## 🚀 Quick Start

```bash
# Install Kanbn
npm install -g @tosin2013/kanbn

# Initialize a new project with AI assistance
mkdir my-project && cd my-project
kanbn init --ai

# Start managing tasks
kanbn chat "Help me plan my project"
kanbn list
```

For detailed setup instructions and best practices, see our [Getting Started Guide](getting-started.md).

For real-world examples and scenarios:
- [Project Setup Demo](demos/setup-demo.md)
- [Workflow Examples](demos/workflow-demo.md)

## 💡 Essential Commands

### Task Management
```bash
kanbn init      # Initialize kanbn board
kanbn board     # Show the kanbn board
kanbn task      # Show a kanbn task
kanbn add       # Add a kanbn task
kanbn edit      # Edit a kanbn task
kanbn rename    # Rename a kanbn task
kanbn move      # Move a kanbn task to another column
kanbn comment   # Add a comment to a task
kanbn remove    # Remove a kanbn task
kanbn find      # Search for kanbn tasks
```

### AI Features
```bash
# Task decomposition
kanbn decompose --task "complex-task"

# Project assistant chat
kanbn chat "How should I structure this project?"
kanbn chat --message "What tasks should I prioritize?"

# Knowledge integration
kanbn integrations add "project-docs"
```

### Project Management
```bash
# Project status and metrics
kanbn status     # Get project and task statistics
kanbn sort       # Sort a column in the index
kanbn sprint     # Start a new sprint
kanbn burndown   # View a burndown chart

# Task organization
kanbn validate   # Validate index and task files
kanbn archive    # Archive a task
kanbn restore    # Restore a task from the archive
```

### Status Commands
```bash
# View project status
kanbn status                  # Overall project statistics
kanbn status --detailed      # Detailed breakdown

# Sprint management
kanbn sprint new "Sprint 1"  # Start new sprint
kanbn sprint end            # End current sprint
kanbn burndown              # View burndown data

# Task organization
kanbn sort --column "In Progress"  # Sort tasks in column
kanbn find --tag "priority"       # Find specific tasks
```

### Task Visualization
```bash
# Board views
kanbn board              # View kanban board
kanbn board --compact   # Compact board view

# Task details
kanbn task task-id      # View detailed task info
kanbn find --format detailed  # Detailed task listing
```


[View All Commands →](commands.md)

## 📚 Documentation

### Getting Started
- [Installation & Setup](getting-started.md)
- [Project Setup Demo](demos/setup-demo.md)
- [Workflow Examples](demos/workflow-demo.md)
- [Configuration](advanced-configuration.md)

### Core Features
- [Task Management](task-structure.md)
- [Board Organization](index-structure.md)
- [AI Integration](ai-features.md)
- [Project Templates](rules-template-integration.md)

### Advanced Topics
- [Configuration Options](advanced-configuration.md)
- [Project Dependencies](dependencies.md)
- [Task References](references.md)
- [Repository Integration](repository-analysis.md)

### Examples & Demos
- [AI Chat Demo](demos/chat-demo.md)
- [Task Decomposition](demos/decompose-demo.md)
- [Project Setup](demos/setup-demo.md)
- [Workflow Examples](demos/workflow-demo.md)

## 🛟 Support & Community

- [GitHub Discussions](https://github.com/tosin2013/kanbn/discussions)
- [Issue Tracker](https://github.com/tosin2013/kanbn/issues)
- [Contributing Guide](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)

## 📈 Project Status

![Version](https://img.shields.io/npm/v/@tosin2013/kanbn)
![Downloads](https://img.shields.io/npm/dm/@tosin2013/kanbn)
![License](https://img.shields.io/npm/l/@tosin2013/kanbn)

## 🔄 Recent Updates

Check our [Changelog](CHANGELOG.md) for recent updates and improvements.

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md) to get started.

## 📊 Progress Features

### Project Status Tracking
- **Sprint Management**: Track sprint progress with `kanbn sprint`
- **Burndown Analysis**: Visual burndown data with `kanbn burndown`
- **Task Statistics**: Get project metrics with `kanbn status`
- **Team Analytics**: Track task assignments and completion rates
- **Custom Reports**: Generate task reports using AI assistance

### AI-Powered Analysis
- **Task Insights**: Get AI recommendations for task organization
- **Workflow Analysis**: Identify bottlenecks and optimization opportunities
- **Resource Planning**: Get suggestions for task distribution
- **Risk Assessment**: Early identification of potential delays
- **Trend Analysis**: Understanding project patterns and health

