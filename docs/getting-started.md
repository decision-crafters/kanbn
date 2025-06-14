# Getting Started with Kanbn

This guide will help you get started with Kanbn, a powerful task management tool that combines Kanban methodology with AI capabilities.

## What is Kanbn?

Kanbn is a modern CLI tool that revolutionizes task management by combining:
- Traditional Kanban board functionality
- AI-powered task assistance and automation
- Integrated documentation generation
- Project memory and context awareness
- Seamless Git integration

## Quick Start Guide

### 1. Installation

You can install Kanbn either globally using npm or run it using a container:

#### Option 1: NPM Installation
```bash
# Install globally using npm
npm install -g @tosin2013/kanbn

# Verify installation
kanbn --version
```

#### Option 2: Container Usage
```bash
# Pull the latest container image
docker pull quay.io/takinosh/kanbn:latest

# Run Kanbn commands using the container
docker run -it --rm \
  -v $(pwd):/workspace \
  -e OPENROUTER_API_KEY=$OPENROUTER_API_KEY \
  quay.io/takinosh/kanbn:latest kanbn <command>
```

When using the container:
- Your current directory is mounted as `/workspace` inside the container
- Environment variables (like `OPENROUTER_API_KEY`) can be passed using `-e` flag
- All Kanbn commands are available through the container
- Files created/modified by Kanbn will have the correct permissions on your host system

For detailed container usage instructions, advanced configurations, and best practices, refer to our [Docker Guide](DOCKER.md).

### 2. Project Initialization

```bash
# Create and enter project directory
mkdir my-project
cd my-project

# Initialize Kanbn
kanbn init
```

### 3. First Steps

```bash
# Create your first task
kanbn task add "Setup project structure"

# View your board
kanbn list

# Get AI assistance
kanbn chat "Help me plan my project tasks"
```

## Core Concepts

### Project Structure
```
your-project/
├── .kanbn/              # Task management directory
│   ├── tasks/          # Individual task files
│   ├── index.md        # Board configuration
│   └── chat-memory.json # AI chat history
├── docs/               # Project documentation
│   ├── architecture.md # System architecture
│   └── technical.md    # Technical details
└── package.json        # Project configuration
```

### Task States
- **Backlog**: Planned but not started
- **In Progress**: Currently being worked on
- **Done**: Completed tasks
- Custom states can be configured in `index.md`

### AI Integration
- Task generation and refinement
- Project context awareness
- Documentation assistance
- Code generation support

## Configuration

### Required Setup

1. Environment Variables:
```bash
# Create .env file
touch .env

# Required for AI features
OPENROUTER_API_KEY=your_api_key_here
```

### Optional Configuration

1. Project-specific settings in `.kanbnrc`:
```yaml
defaultColumn: Backlog
aiModel: gpt-4-turbo
```

2. Git integration settings in `.gitconfig`

## Task Management Guide

### Creating Tasks

```bash
# Basic task creation
kanbn task add "Implement user authentication"

# Task with description and metadata
kanbn task add "Setup CI/CD pipeline" \
  --description "Configure GitHub Actions for automated testing and deployment" \
  --tags "devops,infrastructure" \
  --priority high

# Create task in specific column
kanbn task add "Review PR #123" --column "In Progress"

# Create task with dependencies
kanbn task add "Deploy to production" \
  --depends-on "setup-ci-cd,run-tests"
```

### Task Properties

Tasks can include:
- **Title**: Clear, actionable description
- **Description**: Detailed markdown-supported content
- **Tags**: Categorization labels
- **Priority**: Importance level (low, medium, high)
- **Dependencies**: Related task IDs
- **Assignee**: Team member responsible
- **Due Date**: Completion deadline
- **Custom Fields**: Project-specific metadata

### Managing Tasks

```bash
# View task details
kanbn task show task-id

# Edit task
kanbn task edit task-id

# Move task between columns
kanbn task move task-id "In Progress"

# Add comment to task
kanbn task comment task-id "Updated API endpoints"

# Mark task as blocked
kanbn task block task-id "Waiting for API access"

# Set task priority
kanbn task set task-id priority high

# Assign task
kanbn task assign task-id "username"

# Set due date
kanbn task set task-id due "2024-03-20"
```

### Task Organization

```bash
# List tasks by column
kanbn list

# Filter tasks by tag
kanbn list --tag frontend

# Sort tasks by priority
kanbn list --sort priority

# Search tasks
kanbn search "API"

# Export tasks
kanbn export tasks.json

# Generate task report
kanbn report --format markdown
```

### Task Automation with AI

```bash
# Generate task suggestions
kanbn ai suggest "frontend improvements"

# Break down complex task
kanbn ai decompose task-id

# Estimate task complexity
kanbn ai estimate task-id

# Get next task recommendation
kanbn ai next

# Generate task documentation
kanbn ai document task-id
```

### Task Templates

```bash
# Save task as template
kanbn template save task-id "bug-report"

# Create task from template
kanbn task add --template "bug-report"

# List available templates
kanbn template list
```

### Best Practices for Tasks

1. **Task Creation**
   - Use verb-noun format for titles
   - Include acceptance criteria
   - Set realistic due dates
   - Add relevant tags for filtering

2. **Task Management**
   - Update status regularly
   - Add progress comments
   - Link related tasks
   - Track blockers

3. **Task Organization**
   - Use consistent tagging
   - Maintain task dependencies
   - Regular backlog grooming
   - Archive completed tasks

## Essential Commands

### Task Management
```bash
kanbn task add "Task name"      # Create task
kanbn task move <id> "Done"     # Move task
kanbn task edit <id>            # Edit task
kanbn list                      # View board
```

### AI Features
```bash
kanbn chat "Plan next sprint"   # AI chat
kanbn generate docs            # Generate docs
kanbn analyze                  # Project analysis
```

### Documentation
```bash
kanbn docs build              # Build docs
kanbn docs serve             # Preview docs
```

## Best Practices

1. **Task Creation**
   - Use clear, actionable titles
   - Include acceptance criteria
   - Tag tasks appropriately

2. **AI Interaction**
   - Provide specific context
   - Use project memory
   - Leverage code generation

3. **Documentation**
   - Keep docs updated
   - Use AI for maintenance
   - Follow standard formats

## Troubleshooting

### Common Issues

1. **AI Features**
   - Verify API key setup
   - Check network connectivity
   - Confirm model availability

2. **Task Management**
   - Validate `.kanbn` structure
   - Check file permissions
   - Verify task IDs

3. **Dependencies**
   - Run `npm audit`
   - Update packages regularly
   - Check compatibility

## Next Steps

1. Explore [AI Features](ai-features.md) for advanced automation
2. Learn about [Advanced Configuration](advanced-configuration.md)
3. Review the [Command Reference](commands.md)
4. Understand [Task Structure](task-structure.md)

## Getting Help

- Use `kanbn help` for command documentation
- Check our [GitHub repository](https://github.com/tosin2013/kanbn)
- Join our community discussions
- Submit issues for bugs or features

## Contributing

See our [Contribution Guide](CONTRIBUTING.md) for:
- Development setup
- Code standards
- Testing requirements
- PR process

## Version Compatibility

- Node.js >= 12.13.0
- Git (latest stable version)
- NPM >= 6.0.0

Remember to check our [Changelog](CHANGELOG.md) for recent updates and breaking changes. 