# Quick Start

## Initialise a Kanbn board in your project

```
cd my-project-folder
kanbn init
```

This will create a `.kanbn/` folder containing an index file (`.kanbn/index.md`) and a folder for tasks (`.kanbn/tasks/`).

Run `kanbn init --help` for more information on initialising kanbn.

## Start adding tasks

```
kanbn add -n "My new task"
```

This will create a task file `.kanbn/tasks/my-new-task.md`.

You can also add references to external resources:

```
kanbn add -n "Task with references" --refs "https://example.com/reference" --refs "https://github.com/org/repo/issues/123"
```

Run `kanbn add --help` for more information on creating tasks.

## Using AI Features

### Break down complex tasks

```
kanbn decompose --task "my-complex-task"
```

This will use AI to break down your complex task into smaller, manageable subtasks.

You can include task references in the decomposition context:

```
kanbn decompose --task "my-complex-task" --with-refs
```

### Get AI assistance

```
kanbn chat
kanbn chat --message "Summarize my project status"
```

Chat with an AI assistant that understands your project context and can help with task management.

You can include task references in the chat context:

```
kanbn chat --with-refs
```

## View the kanbn board

```
kanbn board
```

This will show a kanbn board, something like this:

```
╭────────────────────────┬─────────────────────────┬────────────────────────╮
│Todo                    │» In Progress            │✓ Done                  │
├────────────────────────┼─────────────────────────┼────────────────────────┤
│All tasks               │                         │                        │
├────────────────────────┼─────────────────────────┼────────────────────────┤
│Notifications           │Database schema          │Initialise framework    │
│27 Nov 20, 12:39        │25 Nov 20, 16:08         │21 Nov 20, 19:35        │
│                        │                         │                        │
│Add entity timestamps   │Basic entities           │User auth               │
│25 Nov 20, 11:42        │25 Nov 20, 16:09         │23 Nov 20, 15:29        │
│                        │                         │                        │
│Implement entity UUIDs  │                         │Groups and permissions  │
│26 Nov 20, 22:00        │                         │23 Nov 20, 18:41        │
│                        │                         │                        │
│My new task             │                         │                        │
│26 Nov 20, 19:31        │                         │                        │
╰────────────────────────┴─────────────────────────┴────────────────────────╯
```

## Edit a task

```
kanbn edit "my-new-task" -t "Large"
```

This will add a "Huge" tag to the task and modify the task's updated date. If you're using the default settings, this will also affect the task's workload.

Run `kanbn edit --help` for more information on editing tasks.

## Prerequisites for AI Features

- Set up your OpenRouter API key:
  ```
  export OPENROUTER_API_KEY=your_api_key_here
  ```
- Ensure you have an active internet connection for AI features

See [index structure](index-structure.md) for more information on project settings, tags and workload calculations.
For detailed information about AI features, see [AI Features](ai-features.md).
