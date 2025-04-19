# AI Features in Kanbn

Kanbn now includes AI-powered features to help you manage your tasks more efficiently.

## AI Task Decomposition

The `decompose` command allows you to break down complex tasks into smaller, actionable subtasks using AI.

```
kanbn decompose --task my-task
```

### How It Works

1. The AI analyzes the task description and generates a list of subtasks
2. Each subtask is created as a separate task in your kanban board
3. Parent-child relationships are established between the original task and the subtasks
4. All AI interactions are logged for tracking and analysis

### Options

- `-i, --interactive`: Decompose a task interactively
- `-t, --task`: Specify the task ID to decompose
- `-d, --description`: Provide a custom description for decomposition (optional)

### Requirements

- An OpenRouter API key set as `OPENROUTER_API_KEY` environment variable
- Internet connection (falls back to basic decomposition when offline)

## Project Management Chat

The `chat` command provides an AI-powered project management assistant that understands your Kanbn board and can help with project management.

```
kanbn chat
```

### How It Works

1. The AI assistant analyzes your project context (tasks, columns, statistics)
2. You can ask questions about your project, get advice, or discuss task management
3. The assistant provides insights based on your project data
4. All chat interactions are logged for tracking and analysis

### Options

- `-m, --message`: Send a one-off message to the assistant without entering interactive mode
- `-h, --help`: Show help

### Interactive Mode

By default, the chat command enters interactive mode, allowing for continuous conversation:

```
📊 Kanbn Project Assistant 📊
Type "exit" or "quit" to end the conversation

You: What's the status of my project?
Project Assistant: Your project "Example Project" has 12 tasks across 4 columns...
```

## AI Interaction Tracking

Kanbn automatically logs all AI interactions, allowing you to:

1. Track AI usage and contributions
2. View AI interaction details
3. See AI metrics in status reports

### Viewing AI Interactions

AI interactions are stored as special task files with the `ai-interaction` tag.

```
kanbn find --tag ai-interaction
```

### AI Metrics in Status Reports

The `status` command now includes AI interaction metrics:

```
kanbn status
```

## Parent-Child Task Relationships

Tasks can now have parent-child relationships:

- A task can be a parent of multiple child tasks
- A task can be a child of another task
- These relationships are represented as special relation types: `parent-of` and `child-of`

### Working with Parent-Child Relationships

You can view parent-child relationships in the task view:

```
kanbn task my-task
```

Parent-child relationships are also considered in progress calculations, with parent task progress reflecting the completion status of child tasks.
