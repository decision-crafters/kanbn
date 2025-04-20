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

## Complex Interactions

The chat feature maintains context across interactions, allowing for natural multi-step workflows:

### Task Creation and Management

```bash
You: Create a task called "Project Setup" with tag "high-priority"
Project Assistant: Created task "Project Setup" with high-priority tag in the Backlog column.

You: Add three subtasks: "Install Dependencies", "Configure Environment", and "Setup Tests"
Project Assistant: Added three subtasks to "Project Setup":
1. "Install Dependencies"
2. "Configure Environment"
3. "Setup Tests"
All subtasks have been linked to the parent task.

You: Move Install Dependencies to In Progress
Project Assistant: Moved "Install Dependencies" to In Progress column.

You: Add a comment "NPM packages installed successfully"
Project Assistant: Added comment "NPM packages installed successfully" to "Install Dependencies" task.

You: Mark it as completed and move it to Done
Project Assistant: Updated "Install Dependencies":
- Moved to Done column
- Marked as completed
- Updated completion timestamp
Parent task "Project Setup" progress has been updated.
```

### Context-Aware Operations

The assistant maintains context between messages:

```bash
You: Create a task called "Feature Implementation"
Project Assistant: Created task "Feature Implementation" in the Backlog column.

You: Add a tag "in-progress" to that task
Project Assistant: Added "in-progress" tag to "Feature Implementation".
Note: Would you like me to move this task to the In Progress column as well?

You: Yes, and create a subtask called "Unit Tests"
Project Assistant: I've:
1. Moved "Feature Implementation" to In Progress
2. Created "Unit Tests" as a subtask
3. Linked the subtask to the parent task

You: What's the current status of the feature implementation?
Project Assistant: Here's the status of "Feature Implementation":
- Current column: In Progress
- Tags: in-progress
- Subtasks: Unit Tests (in Backlog)
- Progress: 0% (0/1 subtasks completed)
```

### Error Recovery

The chat feature handles errors gracefully:

```bash
You: Move task XYZ to Done
Project Assistant: I couldn't find a task with ID "XYZ". Here are similar tasks I found:
1. Feature Implementation
2. Project Setup
Which task would you like to move to Done?

You: Feature Implementation
Project Assistant: Moved "Feature Implementation" to Done column.
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

The logs include:
- User messages and assistant responses
- Task operations performed
- Board state changes
- Error handling events
- Context preservation details

This helps you keep track of your conversations with the AI assistant and the actions it performs.
