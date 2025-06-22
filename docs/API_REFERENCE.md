# Kanbn API Documentation

## Overview

Kanbn is a CLI-based Kanban board management tool with AI-powered task management features. It provides a simple yet powerful way to organize and track tasks using a markdown-based storage system. Key features include:

- Task management with columns, metadata, and relationships
- AI-powered task decomposition and project initialization
- Natural language interaction via chat interface
- Customizable workflows and views
- Integration with AI services (OpenRouter, Ollama)
- Comprehensive reporting and statistics

## API Reference

### Core Modules

#### `src/main.js`

The main Kanbn module that provides core functionality.

```javascript
const Kanbn = require('@tosin2013/kanbn');
const kanbn = Kanbn();
```

**Key Methods:**

- `initialised()` - Check if Kanbn is initialized in current directory
- `init(options)` - Initialize a new Kanbn board
- `getIndex()` - Get the board index
- `getTask(taskId)` - Get a task by ID
- `createTask(taskData, columnName)` - Create a new task
- `updateTask(taskId, taskData, columnName)` - Update an existing task
- `deleteTask(taskId, removeFile)` - Delete a task
- `moveTask(taskId, columnName, position, relative)` - Move a task between columns
- `archiveTask(taskId)` - Archive a task
- `restoreTask(taskId, columnName)` - Restore an archived task
- `search(filters, quiet)` - Search for tasks
- `status(options)` - Get project status
- `burndown(options)` - Generate burndown chart data

#### `src/board.js`

Handles board visualization and display.

```javascript
const board = require('@tosin2013/kanbn/src/board');
```

**Key Methods:**

- `getTaskString(index, task)` - Format task for display
- `getColumnHeading(index, columnName)` - Format column heading
- `showBoard(index, tasks, view, json)` - Display the Kanban board

### Controllers

#### Task Management

- `src/controller/add.js` - Add new tasks
- `src/controller/edit.js` - Edit existing tasks
- `src/controller/move.js` - Move tasks between columns
- `src/controller/remove.js` - Remove tasks
- `src/controller/rename.js` - Rename tasks
- `src/controller/archive.js` - Archive tasks
- `src/controller/restore.js` - Restore archived tasks
- `src/controller/comment.js` - Add comments to tasks

#### AI Features

- `src/controller/chat.js` - Natural language chat interface
- `src/controller/chat-controller.js` - Core chat functionality
- `src/controller/decompose.js` - AI-powered task decomposition
- `src/controller/init.js` - AI-powered project initialization

#### Utilities

- `src/controller/find.js` - Search for tasks
- `src/controller/sort.js` - Sort tasks
- `src/controller/task.js` - View task details
- `src/controller/integrations.js` - Manage AI context integrations

### Libraries

#### AI Services

- `src/lib/ai-service.js` - Abstraction layer for AI providers
- `src/lib/openrouter-client.js` - OpenRouter API client
- `src/lib/ollama-client.js` - Ollama API client (local fallback)

#### Chat System

- `src/lib/chat-handler.js` - Core chat command processing
- `src/lib/chat-context.js` - Maintains chat conversation context
- `src/lib/interactive-chat.js` - Interactive chat session handler
- `src/lib/memory-manager.js` - Manages chat history and context

#### Project Context

- `src/lib/project-context.js` - Gathers project information for AI
- `src/lib/rag-manager.js` - Retrieval-Augmented Generation for context
- `src/lib/integration-manager.js` - Manages external integrations

#### Utilities

- `src/lib/index-utils.js` - Index manipulation utilities
- `src/lib/task-utils.js` - Task manipulation utilities
- `src/lib/filter-utils.js` - Task filtering utilities
- `src/lib/status-utils.js` - Status calculation utilities
- `src/lib/event-bus.js` - Centralized event system

## CLI Commands

### Basic Commands

```bash
kanbn init [--ai]          # Initialize a new Kanbn board
kanbn board [--json]       # Show the Kanban board
kanbn status               # Show project status
kanbn burndown             # Show burndown chart
```

### Task Management

```bash
kanbn add [--interactive]  # Add a new task
kanbn edit <taskId>        # Edit a task
kanbn move <taskId>        # Move a task
kanbn remove <taskId>      # Remove a task
kanbn rename <taskId>      # Rename a task
kanbn archive <taskId>     # Archive a task
kanbn restore <taskId>     # Restore archived task
kanbn comment <taskId>     # Add comment to task
kanbn task <taskId>        # Show task details
```

### AI Features

```bash
kanbn chat [message]       # Start interactive chat session
kanbn decompose <taskId>   # Decompose task into subtasks
kanbn init --ai            # AI-powered project initialization
kanbn integrations         # Manage AI context integrations
```

### Search & Filtering

```bash
kanbn find [--filter]      # Search for tasks
kanbn sort <column>        # Sort tasks in column
```

## Configuration

### Environment Variables

- `OPENROUTER_API_KEY` - API key for OpenRouter service
- `OPENROUTER_MODEL` - Default model to use with OpenRouter
- `OLLAMA_MODEL` - Default model to use with Ollama
- `OLLAMA_URL` - URL for Ollama API (default: http://localhost:11434)
- `KANBN_QUIET` - Suppress non-essential output when set to "true"
- `DEBUG` - Enable debug logging when set to "true"

### Configuration Files

Kanbn stores configuration in `.kanbn/index.md` with the following structure:

```markdown
---
# YAML front matter with board configuration
name: My Project
columns:
  Backlog: []
  Doing: []
  Done: []
options:
  dateFormat: "yyyy-mm-dd"
  taskTemplate: |
    {b}{name}{b}
    {d}ID: {id}{d}
...

# Rest of markdown file contains optional documentation
```

## AI Integration

Kanbn provides several AI-powered features:

### AI Services

- **OpenRouter** (default) - Cloud-based AI service with multiple models
- **Ollama** (fallback) - Local AI service for offline use

### AI Features

1. **Task Decomposition** - Break down complex tasks into subtasks
   ```bash
   kanbn decompose <taskId>
   ```

2. **Project Initialization** - AI-assisted board setup
   ```bash
   kanbn init --ai
   ```

3. **Natural Language Interface** - Chat with your board
   ```bash
   kanbn chat "What tasks are in progress?"
   ```

4. **Context Integration** - Enhance AI with project documentation
   ```bash
   kanbn integrations add <name> <url|file>
   ```

### Customizing AI Behavior

Create custom prompts in `.kanbn/prompts/` to tailor AI responses.

## Examples

### Initialize a New Project

```bash
kanbn init --ai
# Follow interactive prompts to set up your board
```

### Create a Task

```bash
kanbn add --interactive
# Or directly:
kanbn add -n "Implement feature X" -d "Add new functionality" --column "Backlog"
```

### Chat with Your Board

```bash
kanbn chat "What tasks are overdue?"
kanbn chat "Move task 'Fix bug' to 'In Progress'"
kanbn chat "Create a new task for documentation updates"
```

### Generate Burndown Chart

```bash
kanbn burndown --sprint current
```

### AI-Powered Task Decomposition

```bash
kanbn decompose "Implement user authentication"
# AI will suggest subtasks like:
# - Create login page
# - Set up auth middleware
# - Implement password reset
```

### Manage Integrations

```bash
kanbn integrations add api-docs https://example.com/api-docs.md
kanbn integrations list
```