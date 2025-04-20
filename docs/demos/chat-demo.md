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
Project Assistant: Your project "Website Development" has 6 tasks across 4 columns.

Based on your project data, here's a summary:
- Project name: Website Development
- Project description: A project to develop the company website
- Tasks: 6
- Columns: Backlog (4), In Progress (1), Review (0), Done (1)
- Tags: design, frontend, backend, content

You: What tasks are in the Backlog?
Project Assistant: There are 4 tasks in the Backlog column:

1. "Design website mockups" - Create wireframes and mockups for all pages
2. "Setup backend API" - Implement RESTful API endpoints for the website
3. "Create content strategy" - Develop content plan for all website sections
4. "Implement user authentication" - Add login/signup functionality

Would you like me to provide more details about any of these tasks?

You: Which task should I focus on first?
Project Assistant: Based on your project structure and dependencies, I recommend focusing on "Design website mockups" first.

This task is foundational for the other work, as the frontend implementation will depend on having finalized designs. The mockups will also help inform the content strategy and ensure the backend API is designed to support all the necessary features.

After completing the mockups, you could move on to the backend API and content strategy in parallel.

You: exit
Project Assistant: Goodbye! Happy organizing! Feel free to chat again when you need assistance with your project.
```

### One-off Message Mode

If you just want to ask a single question without entering interactive mode, you can use the `--message` or `-m` option:

```bash
kanbn chat --message "What's the status of my project?"
```

This will return a single response:

```
Project Assistant: Your project "Website Development" has 6 tasks across 4 columns.

Based on your project data, here's a summary:
- Project name: Website Development
- Project description: A project to develop the company website
- Tasks: 6
- Columns: Backlog (4), In Progress (1), Review (0), Done (1)
- Tags: design, frontend, backend, content

You have 1 task in progress: "Implement homepage design" which has been in progress for 3 days.
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

Here are some realistic questions you can ask the AI assistant:

- "What's the status of my project?"
- "How many tasks are in the Backlog column?"
- "Which tasks should I prioritize this week?"
- "What's my project completion percentage?"
- "Show me all tasks assigned to Sarah"
- "What tasks are blocked or at risk?"
- "Summarize the work completed in the last sprint"
- "What dependencies exist between my current tasks?"
- "Which tasks have been in the 'In Progress' column the longest?"
- "What's the estimated completion date based on current velocity?"

## Logging

All chat interactions are automatically logged as special task files with the `ai-interaction` tag. You can view these interactions using:

```bash
kanbn find --tag ai-interaction
```

This helps you keep track of your conversations with the AI assistant and the advice it provides.
