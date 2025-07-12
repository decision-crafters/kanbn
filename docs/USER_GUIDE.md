# Kanbn User Guide

![Kanbn Logo](https://raw.githubusercontent.com/decision-crafters/kanbn/master/assets/logo.png)

Kanbn is a CLI Kanban board with AI-powered task management features that transforms your Git repository into a powerful project management tool. This guide will help you get started and master Kanbn's capabilities.

## Table of Contents
1. [Quick Start Guide](#quick-start-guide)
2. [Command Reference](#command-reference)
3. [Workflow Examples](#workflow-examples)
4. [AI Features](#ai-features)
5. [Configuration](#configuration)
6. [Advanced Usage](#advanced-usage)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start Guide

### Installation

```bash
# Install kanbn globally using npm
npm install -g @tosin2013/kanbn

# Verify installation
kanbn --version
```

**Note:** If you encounter issues on certain Linux distributions (e.g., Red Hat Linux 9.5), try using a newer Node.js version (12, 16, 20, or 22).

### Initializing Your Board

```bash
# Basic initialization
kanbn init

# AI-powered initialization (recommended)
kanbn init --ai

# Or use the bootstrap script for a complete setup
curl -O https://raw.githubusercontent.com/decision-crafters/kanbn/refs/heads/master/examples/bootstrap.sh
chmod +x bootstrap.sh
./bootstrap.sh
```

### First Tasks

```bash
# Add your first task
kanbn add -n "Implement login page" -d "Create the frontend login component" -c "In Progress"

# View your board
kanbn board
```

---

## Command Reference

### Core Commands

| Command | Alias | Description | Example |
|---------|-------|-------------|---------|
| `init` | `i` | Initialize new board | `kanbn init --ai` |
| `add` | `a` | Add new task | `kanbn add -n "Task name" -d "Description"` |
| `board` | `b` | View board | `kanbn board -v compact` |
| `task` | `t` | View task details | `kanbn task 1` |
| `move` | `mv` | Move task between columns | `kanbn mv 1 -c "Done"` |
| `edit` | `e` | Edit task | `kanbn edit 1 -d "Updated description"` |

### AI Commands

| Command | Alias | Description | Example |
|---------|-------|-------------|---------|
| `decompose` | `d` | Break down complex tasks | `kanbn decompose -t 1` |
| `chat` | `c` | AI project assistant | `kanbn chat -m "Suggest task prioritization"` |

### Workflow Commands

| Command | Alias | Description | Example |
|---------|-------|-------------|---------|
| `sprint` | `sp` | Start new sprint | `kanbn sprint -n "Sprint 1"` |
| `burndown` | `bd` | View burndown chart | `kanbn burndown` |
| `status` | `s` | Project status | `kanbn status --due` |

### Utility Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `find` | `f` | Search tasks |
| `sort` | - | Sort column |
| `archive` | `arc` | Archive tasks |
| `validate` | - | Validate board |

---

## Workflow Examples

### Basic Task Management

```bash
# Add task to Backlog
kanbn add -n "Fix login bug" -d "Users can't login on mobile" -c "Backlog"

# Move to In Progress
kanbn mv 1 -c "In Progress"

# Update progress
kanbn edit 1 --progress 50

# Complete task
kanbn mv 1 -c "Done"
```

### Sprint Planning

```bash
# Start new sprint
kanbn sprint -n "Q3 Sprint 2" -d "Authentication features"

# Add sprint tasks
kanbn add -n "OAuth integration" -c "Backlog" --sprint "Q3 Sprint 2"
kanbn add -n "Password reset flow" -c "Backlog" --sprint "Q3 Sprint 2"

# View sprint progress
kanbn status --sprint "Q3 Sprint 2"
```

---

## AI Features

### Task Decomposition

```bash
# Create complex task
kanbn add -n "Implement auth system" -d "Complete authentication solution"

# Break down into subtasks
kanbn decompose -t 1
```
**Output:** Creates subtasks for:
- User registration
- Login flow
- Password recovery
- Session management

### Project Chat

```bash
kanbn chat -m "Suggest improvements for our workflow"
kanbn chat -m "Estimate time for task #3"
```

### AI-Powered Initialization

```bash
kanbn init --ai --message "Create board for React e-commerce site"
```

---

## Configuration

### Environment Variables

```bash
# OpenAI/OpenRouter configuration
export OPENROUTER_API_KEY="your-api-key"
export OPENROUTER_MODEL="gpt-4"

# Ollama configuration (alternative)
export OLLAMA_MODEL="llama2"
```

### Customizing Columns

Edit `.kanbn/board.md`:
```markdown
---
columns:
  - name: Backlog
    description: Prioritized backlog
  - name: In Progress
    description: Actively working on
  - name: Review
    description: Ready for review
  - name: Done
    description: Completed work
---
```

---

## Advanced Usage

### Git Integration

```bash
# Kanbn stores tasks as markdown files - commit them!
git add .kanbn
git commit -m "Update kanban board"
```

### Bulk Operations

```bash
# Archive all completed tasks
kanbn find -c "Done" | xargs -I {} kanbn archive {}

# Move multiple tasks
kanbn find -c "Backlog" --json | jq '.[].id' | xargs -I {} kanbn mv {} -c "In Progress"
```

### Custom Views

Create `.kanbn/views/custom.md`:
```markdown
---
name: My View
columns:
  - Backlog
  - In Progress
filters:
  - assigned: me
  - due: thisweek
---
```
Use with: `kanbn board -v custom`

---

## Troubleshooting

### Common Issues

**Installation fails:**
- Ensure Node.js ≥ 12 is installed
- Try `npm install -g @tosin2013/kanbn --force`

**AI features not working:**
- Verify API keys are set
- Check model compatibility

**Board not loading:**
- Run `kanbn validate` to check for errors
- Ensure `.kanbn` directory exists

### Getting Help

```bash
# View general help
kanbn help

# Command-specific help
kanbn help add
kanbn help chat
```

For additional support, visit the [GitHub repository](https://github.com/decision-crafters/kanbn).

---

Kanbn combines the simplicity of CLI tools with powerful project management features and AI assistance. Start small with basic task tracking, then explore advanced features as your workflow evolves. Happy task managing!