# AI-Powered Initialization

Kanbn now includes AI-powered initialization to help you set up your project board more efficiently. This feature uses AI to suggest appropriate columns, task structures, and initial tasks based on your project description.

## Getting Started

To use AI-powered initialization, run:

```bash
kanbn init --ai
```

You can also provide a project name and description:

```bash
kanbn init --ai --name "My Project" --description "This is a project for..."
```

## How It Works

The AI-powered initialization process follows these steps:

1. **Project Information**: You provide a project name and description.
2. **Repository Detection**: If you're initializing in an existing repository, the system automatically detects it and includes repository information in the AI prompts.
3. **Project Type Detection**: The AI analyzes your project information and suggests appropriate columns based on the detected project type.
4. **Column Confirmation**: You can accept the suggested columns or customize them.
5. **Board Initialization**: The system creates your Kanbn board with the selected columns.
6. **Initial Tasks**: The AI suggests initial tasks to help you get started with your project, tailored to your repository if applicable.

## Features

### Memory Persistence

The AI-powered initialization feature includes memory persistence, which means:

- Your conversation with the AI is saved between sessions
- The AI can reference previous interactions
- Context is maintained across different commands

Memory is stored in `.kanbn/chat-memory.json`.

### Custom Prompts

You can customize the prompts used by the AI by creating a `.kanbn/init-prompts/` directory and adding your own prompt files:

- `project-type.md`: For detecting project type and suggesting columns
- `class-of-service.md`: For suggesting Classes of Service
- `timebox-strategy.md`: For suggesting timebox strategies
- `initial-tasks.md`: For suggesting initial tasks

If custom prompts are not found, the system will use default prompts.

## Command Options

The `init --ai` command supports the following options:

| Option | Description |
|--------|-------------|
| `--name` | Project name |
| `--description` | Project description |
| `--column` | Predefined columns (comma-separated) |
| `--api-key` | OpenRouter API key (overrides environment variable) |
| `--model` | AI model to use (defaults to google/gemma-3-4b-it:free) |
| `--message` | Custom message to guide the AI (e.g., "Create a blog website") |

## Environment Variables

The AI-powered initialization uses the following environment variables:

- `OPENROUTER_API_KEY`: Your OpenRouter API key
- `OPENROUTER_MODEL`: The AI model to use (defaults to google/gemma-3-4b-it:free)
- `OPENROUTER_STREAM`: Set to 'false' to disable streaming responses

You can set these in a `.env` file in your project root.

## Examples

### Basic Initialization

```bash
kanbn init --ai
```

### Initialization with Project Details

```bash
kanbn init --ai --name "Web App Development" --description "A project to develop a web application for customer management"
```

### Using a Specific Model

```bash
kanbn init --ai --model "anthropic/claude-3-opus:beta"
```

### Using a Custom Message

```bash
kanbn init --ai --message "Create a blog website with user authentication and comment system"
```

### Initializing in an Existing Repository

```bash
# Navigate to your existing repository
cd my-existing-project

# Initialize with AI
kanbn init --ai --message "Create a task board for this project"
```

## Troubleshooting

If you encounter issues with AI-powered initialization:

1. Ensure your OpenRouter API key is set correctly
2. Check that you have internet connectivity
3. Try using the `--api-key` option to provide the key directly
4. If the AI is not generating appropriate suggestions, try providing a more detailed project description

For more help, run:

```bash
kanbn help init
```
