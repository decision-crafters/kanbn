# AI Features in Kanbn

Kanbn includes AI-powered features to help you manage your tasks more efficiently.

> For detailed examples and usage instructions, check out the [Chat Demo](demos/chat-demo.md) and [Decompose Demo](demos/decompose-demo.md).

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

### Chat Context Memory

The chat feature maintains context across interactions:
- Remembers recently discussed tasks and their relationships
- Understands task references without explicit names
- Preserves conversation history for natural dialogue
- Maintains board state consistency during operations
- Tracks task modifications and updates

### Board State Validation

During chat operations, the system ensures:
- Task count accuracy across all operations
- Column integrity and task assignments
- Task metadata consistency
- Index structure validity
- Proper parent-child relationships
- Error recovery and state preservation

### Error Handling

The chat feature includes robust error handling:
- Network error recovery with graceful fallbacks
- API rate limit management
- Invalid operation prevention
- State consistency preservation
- Transaction-like operations for multi-step changes

### Options

- `-m, --message`: Send a one-off message to the assistant without entering interactive mode
- `--with-refs`, `--include-refs`, `--references`: Include task references in the context
- `-h, --help`: Show help

### Interactive Mode

By default, the chat command enters interactive mode, allowing for continuous conversation:

```
📊 Kanbn Project Assistant 📊
Type "exit" or "quit" to end the conversation

You: What's the status of my project?
Project Assistant: Your project "Example Project" has 12 tasks across 4 columns...
```

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
- `--with-refs`, `--include-refs`, `--references`: Include task references in the decomposition context

### Requirements

- An OpenRouter API key set as `OPENROUTER_API_KEY` environment variable
- Internet connection (falls back to basic decomposition when offline)

### Environment Variables

```bash
# Required for AI features
OPENROUTER_API_KEY=your_api_key_here

# Optional: Specify a different model (defaults to google/gemma-3-4b-it:free)
OPENROUTER_MODEL=google/gemma-3-4b-it:free

# Optional: Force real API calls in test environment
USE_REAL_API=true
```

You can add these to a `.env` file in your project root.

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

## Task References in AI Features

Kanbn now supports task references, which can be used to store URLs and external resources related to tasks. These references can be included in AI features to provide additional context.

### Including References in Chat

When using the chat feature, you can include task references in the context:

```
kanbn chat --with-refs
```

This allows the AI assistant to see and reference external resources when answering questions or providing insights about your tasks.

### Including References in Task Decomposition

When decomposing a task, you can include its references to help the AI generate more relevant subtasks:

```
kanbn decompose --task my-task --with-refs
```

This is particularly useful when the task references contain specifications, requirements, or other information that can help with decomposition.

### Benefits of References in AI Features

- Provides additional context for AI-powered features
- Helps generate more relevant and accurate responses
- Allows the AI to consider external resources when analyzing tasks
- Improves the quality of task decomposition
- Enhances the overall AI experience
