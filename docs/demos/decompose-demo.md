# Task Decomposition Demo

The Kanbn decompose feature allows you to break down complex tasks into smaller, actionable subtasks using AI.

## Prerequisites

Before using the decompose feature, make sure you have:

1. An OpenRouter API key set as an environment variable:
   ```bash
   export OPENROUTER_API_KEY=your_api_key_here
   ```

2. A Kanbn project initialized:
   ```bash
   kanbn init
   ```

3. At least one task created:
   ```bash
   kanbn add --name "Build website" --description "Create a company website with multiple pages and features" --column "Backlog"
   ```

## Basic Usage

To decompose a task, use the `decompose` command with the `--task` or `-t` option followed by the task ID:

```bash
kanbn decompose --task build-website
```

This will:
1. Analyze the task description
2. Generate a list of subtasks
3. Create each subtask as a separate task in your kanban board
4. Establish parent-child relationships between the original task and the subtasks

Example output:

```
Decomposing task "Build website"...
Using model: google/gemma-3-4b-it:free
Generated 5 subtasks:
1. Design website mockups and wireframes
2. Develop homepage with responsive layout
3. Create about us and services pages
4. Implement contact form with validation
5. Test website across different browsers and devices

Creating child tasks...

Created 5 child tasks for "Build website"
- child-task-1
- child-task-2
- child-task-3
- child-task-4
- child-task-5
```

## Advanced Usage

### Interactive Mode

You can use the interactive mode to select a task and provide additional information:

```bash
kanbn decompose --interactive
```

This will prompt you to:
1. Select a task to decompose
2. Confirm if you want to use AI for decomposition
3. Optionally provide a custom description for decomposition

### Custom Description

If you want to provide more context or specific instructions for the decomposition, you can use the `--description` or `-d` option:

```bash
kanbn decompose --task build-website --description "Create a company website with homepage, about us page, services page, blog, and contact form. The website should be responsive and follow modern design principles."
```

### Customizing the AI Model

You can customize the AI model used by setting the `OPENROUTER_MODEL` environment variable:

```bash
export OPENROUTER_MODEL="anthropic/claude-3-haiku-20240307"
kanbn decompose --task build-website
```

By default, the decompose feature uses `google/gemma-3-4b-it:free` which is a cost-effective option.

## Viewing Parent-Child Relationships

After decomposing a task, you can view the parent-child relationships:

```bash
kanbn task build-website
```

This will show the original task with its child tasks:

```
# Build website

Create a company website with multiple pages and features

## Metadata

- Created: 2023-04-19T12:00:00.000Z
- Updated: 2023-04-19T12:30:00.000Z

## Relations

- Parent of: child-task-1
- Parent of: child-task-2
- Parent of: child-task-3
- Parent of: child-task-4
- Parent of: child-task-5
```

You can also view a child task to see its parent:

```bash
kanbn task child-task-1
```

Output:

```
# Design website mockups and wireframes

Design website mockups and wireframes

## Metadata

- Created: 2023-04-19T12:30:00.000Z
- Updated: 2023-04-19T12:30:00.000Z

## Relations

- Child of: build-website
```

## Logging

All decompose interactions are automatically logged as special task files with the `ai-interaction` tag. You can view these interactions using:

```bash
kanbn find --tag ai-interaction
```

This helps you keep track of how tasks were decomposed and the AI's reasoning.
