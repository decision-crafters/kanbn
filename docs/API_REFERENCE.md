# Kanbn API Documentation

## Overview

Kanbn is a CLI-based Kanban board management tool with AI integration features. It provides a simple yet powerful way to manage tasks in a Kanban workflow directly from your terminal. Key features include:

- Task management with columns (Backlog, In Progress, Done, etc.)
- AI-powered task creation and decomposition
- Natural language interaction via chat interface
- Burndown charts and progress tracking
- Customizable workflows and task templates
- Integration with AI services (OpenRouter, Ollama)

## Installation

```bash
npm install -g @tosin2013/kanbn
```

## CLI Commands

### Board Management

#### `kanbn init`
Initialize a new Kanbn board in the current directory.

Options:
- `--ai` - Use AI to help initialize the board
- `--prompt` - Custom prompt for AI initialization
- `--model` - Specify AI model to use

#### `kanbn board`
Display the Kanban board.

Options:
- `--view` - Specify view to display
- `--json` - Output as JSON

### Task Management

#### `kanbn add`
Add a new task.

Options:
- `--column` - Specify column to add task to
- `--interactive` - Interactive task creation
- `--untracked` - Add untracked tasks

#### `kanbn edit <taskId>`
Edit an existing task.

Options:
- `--column` - Move task to specified column
- `--interactive` - Interactive task editing

#### `kanbn move <taskId>`
Move a task to another column.

Options:
- `--position` - Position in new column
- `--relative` - Treat position as relative

#### `kanbn remove <taskId>`
Remove a task.

Options:
- `--file` - Also remove task file

#### `kanbn archive <taskId>`
Archive a task.

#### `kanbn restore <taskId>`
Restore an archived task.

### AI Features

#### `kanbn chat [message]`
Start an interactive chat session with the AI assistant.

Options:
- `--model` - Specify AI model to use
- `--stream` - Stream responses
- `--conversation` - Conversation ID to continue

#### `kanbn decompose <taskId>`
Decompose a task into subtasks using AI.

Options:
- `--interactive` - Interactive decomposition
- `--references` - Include references in context

#### `kanbn integrations`
Manage AI context integrations.

Subcommands:
- `list` - List available integrations
- `add` - Add new integration
- `remove` - Remove integration

### Utility Commands

#### `kanbn status`
Show project status.

Options:
- `--sprint` - Show sprint status
- `--due` - Show overdue tasks
- `--untracked` - Show untracked tasks

#### `kanbn burndown`
Show burndown chart data.

Options:
- `--sprint` - Specify sprint
- `--dates` - Date range
- `--normalise` - Normalize dates

## API Reference

### Core Modules

#### `main.js`
The core Kanbn module that provides all board and task management functionality.

```javascript
const Kanbn = require('@tosin2013/kanbn');
const kanbn = Kanbn();

// Example usage
kanbn.initialised()
  .then(initialised => {
    if (initialised) {
      return kanbn.loadIndex();
    }
    throw new Error('Kanbn not initialized');
  })
  .then(index => {
    console.log(index);
  });
```

Key methods:
- `initialised()` - Check if board is initialized
- `loadIndex()` - Load board index
- `loadTask(taskId)` - Load specific task
- `addTask(taskData, columnName)` - Add new task
- `moveTask(taskId, columnName, position)` - Move task
- `deleteTask(taskId, removeFile)` - Delete task

#### `board.js`
Handles board display and visualization.

```javascript
const showBoard = require('@tosin2013/kanbn/src/board');

showBoard(index, tasks, view, jsonFormat);
```

### AI Integration

#### `ai/index.js`
Central AI client abstraction layer.

```javascript
const { getDefaultClient } = require('@tosin2013/kanbn/src/ai');

const aiClient = getDefaultClient();
```

#### `lib/ai-service.js`
AI service abstraction with automatic fallback.

```javascript
const AIService = require('@tosin2013/kanbn/src/lib/ai-service');

const ai = new AIService({
  apiKey: process.env.OPENROUTER_API_KEY,
  model: 'gpt-4'
});

ai.chatCompletion(messages)
  .then(response => {
    console.log(response);
  });
```

#### `lib/project-context.js`
Gathers project context for AI assistance.

```javascript
const ProjectContext = require('@tosin2013/kanbn/src/lib/project-context');

const context = new ProjectContext(kanbnInstance);
context.getContext()
  .then(ctx => {
    console.log(ctx);
  });
```

### Task Management

#### `lib/task-utils.js`
Utility functions for task operations.

```javascript
const {
  findTaskColumn,
  addTaskToIndex,
  removeTaskFromIndex
} = require('@tosin2013/kanbn/src/lib/task-utils');

const column = findTaskColumn(index, taskId);
```

#### `lib/index-utils.js`
Index management utilities.

```javascript
const {
  loadIndex,
  saveIndex,
  sortColumnInIndex
} = require('@tosin2013/kanbn/src/lib/index-utils');

loadIndex(getIndexPath)
  .then(index => {
    // Modify index
    return saveIndex(index, getIndexPath);
  });
```

### Configuration

Environment variables:
- `OPENROUTER_API_KEY` - API key for OpenRouter service
- `OLLAMA_HOST` - URL for local Ollama instance
- `OLLAMA_MODEL` - Model to use with Ollama
- `KANBN_QUIET` - Suppress non-essential output
- `DEBUG` - Enable debug logging

Configuration files:
- `.kanbn/index.md` - Board index with columns and options
- `.kanbn/tasks/*.md` - Individual task files
- `.kanbn/archive/*.md` - Archived tasks

## Examples

### Initialize a new board with AI

```bash
kanbn init --ai
```

### Add a new task interactively

```bash
kanbn add --interactive
```

### Decompose a task with AI

```bash
kanbn decompose task-123 --interactive
```

### Chat with the AI assistant

```bash
kanbn chat "What tasks are in progress?"
```

### Get burndown data for current sprint

```bash
kanbn burndown --sprint current --json
```

### Move a task to "In Progress"

```bash
kanbn move task-123 --column "In Progress"
```

## Error Handling

Kanbn uses custom error classes for consistent error handling:

```javascript
const { KanbnError, AiError } = require('@tosin2013/kanbn/src/errors');

try {
  // Kanbn operation
} catch (error) {
  if (error instanceof KanbnError) {
    console.error('Kanbn error:', error.message);
  } else if (error instanceof AiError) {
    console.error('AI error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Advanced Usage

### Custom Task Templates

Define custom task display templates in the index options:

```yaml
---
options:
  taskTemplate: |
    {b}{name}{b}
    Status: {column}
    Created: {created}
    {description}
columns:
  Backlog: []
  ...
---
```

### Custom Date Formats

Specify date formatting in index options:

```yaml
---
options:
  dateFormat: 'yyyy-mm-dd HH:MM'
columns:
  ...
---
```

### AI-Powered Initialization

Create a custom initialization prompt:

```bash
kanbn init --ai --prompt "Create a Kanban board for a React project with columns for Design, Development, Testing, and Deployment"
```

### Integration with CI/CD

Example GitHub Actions workflow:

```yaml
name: Kanbn Board Update
on: [push]
jobs:
  update-board:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Setup Node
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    - run: npm install -g @tosin2013/kanbn
    - run: kanbn status
```

## Troubleshooting

### Debugging

Set `DEBUG=true` environment variable for detailed logs:

```bash
DEBUG=true kanbn board
```

### Common Issues

1. **AI Service Not Responding**
   - Verify API keys are set
   - Check network connectivity
   - Try alternative AI provider

2. **Task Not Found**
   - Verify task ID exists
   - Check for typos
   - Run `kanbn status --untracked` to see all tasks

3. **Board Not Initialized**
   - Run `kanbn init` in project directory
   - Verify `.kanbn` directory exists