# Chat Feature Demo

The Kanbn chat feature provides an AI-powered project management assistant that understands your Kanbn board and can help with project management tasks.

## Prerequisites

Before using the chat feature, make sure you have:

1. An OpenRouter API key set as an environment variable:
   ```bash
   export OPENROUTER_API_KEY=your_api_key_here
   ```

2. A Kanbn project initialized:
   ```bash
   kanbn init
   ```

## Basic Usage

You can use the chat feature in two ways:

### Interactive Mode

The interactive mode allows you to have a conversation with the AI assistant:

```bash
kanbn chat
```

This will start an interactive session:

```
📊 Kanbn Project Assistant 📊
Type "exit" or "quit" to end the conversation

You: What's the status of my project?
Project Assistant: Your project "Example Project" has 5 tasks across 3 columns.

Based on your project data, here's a summary:
- Project name: Example Project
- Project description: A sample project for demonstration
- Tasks: 5
- Columns: Backlog, In Progress, Done

You: How many tasks are in the Backlog?
Project Assistant: There are 3 tasks in the Backlog column.

You: exit
Project Assistant: Goodbye! Happy organizing!
```

### One-off Message Mode

If you just want to ask a single question without entering interactive mode, you can use the `--message` or `-m` option:

```bash
kanbn chat --message "What's the status of my project?"
```

This will return a single response:

```
Project Assistant: Your project "Example Project" has 5 tasks across 3 columns.

Based on your project data, here's a summary:
- Project name: Example Project
- Project description: A sample project for demonstration
- Tasks: 5
- Columns: Backlog, In Progress, Done
```

## Advanced Usage

### Customizing the AI Model

You can customize the AI model used by setting the `OPENROUTER_MODEL` environment variable:

```bash
export OPENROUTER_MODEL="anthropic/claude-3-haiku-20240307"
kanbn chat
```

By default, the chat feature uses `google/gemma-3-4b-it:free` which is a cost-effective option.

### Example Questions

Here are some example questions you can ask the AI assistant:

- "What's the status of my project?"
- "How many tasks are in the Backlog column?"
- "What are the most important tasks I should focus on?"
- "Can you summarize my project progress?"
- "What tasks are assigned to me?"
- "How can I organize my tasks better?"
- "What's the next step for my project?"

## Logging

All chat interactions are automatically logged as special task files with the `ai-interaction` tag. You can view these interactions using:

```bash
kanbn find --tag ai-interaction
```

This helps you keep track of your conversations with the AI assistant and the advice it provides.
