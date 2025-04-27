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
# Install Kanbn globally
npm install -g @tosin2013/kanbn

# Create a new project
mkdir my-project && cd my-project

# Initialize with AI assistance
kanbn init --ai

# Start managing tasks
kanbn task add "Setup project structure"
kanbn list
```

[Complete Getting Started Guide →](getting-started.md)

## 💡 Essential Commands

### Task Management
```bash
kanbn task add     # Create new task
kanbn task edit    # Modify task
kanbn task move    # Change task status
kanbn list         # View board
kanbn search       # Find tasks
kanbn progress     # View task progress
```

### AI Chat & Analysis
```bash
# General AI assistance
kanbn chat "How should I structure this project?"
kanbn chat "What tasks should I prioritize?"

# Task-specific chat
kanbn chat --task task-id "How can I break this down?"
kanbn chat --task task-id "What are the dependencies?"

# Progress analysis
kanbn chat "Show me project progress"
kanbn chat "Analyze sprint velocity"
kanbn chat "Identify bottlenecks"

# Task generation
kanbn chat "Generate tasks for user authentication"
kanbn chat "Create tasks for API integration"

# Documentation help
kanbn chat "Document current sprint progress"
kanbn chat "Summarize recent changes"
```

### Progress Tracking
```bash
# View overall progress
kanbn progress

# Sprint progress
kanbn progress --sprint current
kanbn progress --sprint previous

# Filtered progress
kanbn progress --tag frontend
kanbn progress --assignee username

# Export progress reports
kanbn progress --format markdown
kanbn progress --format json --output progress.json

# Burndown charts
kanbn chart burndown
kanbn chart velocity
```

### Project Tools
```bash
kanbn report       # Generate reports
kanbn export       # Export data
kanbn stats        # View metrics
kanbn config       # Manage settings
```

[View All Commands →](commands.md)

## 📚 Documentation

### Getting Started
- [Quick Start Guide](quick-start.md)
- [Installation & Setup](getting-started.md)
- [Basic Usage](getting-started.md#basic-usage)
- [Configuration](advanced-configuration.md)

### Core Features
- [Task Management](task-structure.md)
- [Board Organization](index-structure.md)
- [AI Integration](ai-features.md)
- [Project Templates](rules-template-integration.md)

### Advanced Topics
- [Custom Workflows](advanced-configuration.md#workflows)
- [API Integration](advanced-configuration.md#api)
- [Automation](advanced-configuration.md#automation)
- [Security](advanced-configuration.md#security)

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

### Real-time Progress Tracking
- **Sprint Metrics**: Track velocity, completion rates, and estimations
- **Burndown Charts**: Visual representation of sprint progress
- **Team Analytics**: Individual and team performance metrics
- **Bottleneck Detection**: AI-powered analysis of workflow impediments
- **Custom Reports**: Generate tailored progress reports

### AI-Powered Progress Analysis
- **Predictive Analytics**: Estimate completion times and resource needs
- **Pattern Recognition**: Identify successful workflows and potential issues
- **Resource Optimization**: Suggestions for better task distribution
- **Risk Assessment**: Early warning system for project delays
- **Trend Analysis**: Long-term project health monitoring

### Progress Commands
```bash
# Basic progress views
kanbn progress                 # Overall progress
kanbn progress --detailed     # Detailed breakdown
kanbn progress --summary      # Quick summary

# Filtered views
kanbn progress --sprint "Sprint 1"
kanbn progress --tag "frontend"
kanbn progress --priority "high"
kanbn progress --assignee "username"

# Time-based analysis
kanbn progress --period "last-week"
kanbn progress --from "2024-01-01" --to "2024-03-01"

# Export options
kanbn progress --format markdown --output progress.md
kanbn progress --format json --output metrics.json
```

### Progress Visualization
```bash
# Generate charts
kanbn chart burndown          # Sprint burndown
kanbn chart velocity          # Team velocity
kanbn chart distribution      # Task distribution
kanbn chart timeline          # Project timeline

# Interactive views
kanbn board --progress       # Board with progress
kanbn status --live         # Live status updates
```
