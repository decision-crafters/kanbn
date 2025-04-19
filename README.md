# Kanbn

A CLI kanban board application with AI-powered task management features.

Documentation can be found [here](./docs/index.md).

## Installation

```
npm install -g @basementuniverse/kanbn
```

## Usage

```
Usage:
  kanbn ......... Show help menu
  kanbn <command> [options]

Where <command> is one of:
  help .......... Show help menu
  version ....... Show package version
  init .......... Initialise kanbn board
  board ......... Show the kanbn board
  task .......... Show a kanbn task
  add ........... Add a kanbn task
  edit .......... Edit a kanbn task
  rename ........ Rename a kanbn task
  move .......... Move a kanbn task to another column
  comment ....... Add a comment to a task
  remove ........ Remove a kanbn task
  find .......... Search for kanbn tasks
  status ........ Get project and task statistics
  sort .......... Sort a column in the index
  sprint ........ Start a new sprint
  burndown ...... View a burndown chart
  validate ...... Validate index and task files
  archive ....... Archive a task
  restore ....... Restore a task from the archive
  remove-all .... Remove the kanbn board and all tasks
  decompose ..... Use AI to break down tasks into subtasks

For more help with commands, try:

kanbn help <command>
kanbn h <command>
kanbn <command> --help
kanbn <command> -h
```

## New AI Features

Kanbn now includes AI-powered features to help you manage your tasks more efficiently:

### AI Task Decomposition

Break down complex tasks into smaller, actionable subtasks using AI:

```
kanbn decompose --task my-task
kanbn d -i  # Interactive mode
```

### Parent-Child Task Relationships

Tasks can now have parent-child relationships, allowing for better organization of complex projects:

- Parent tasks can track progress of child tasks
- Child tasks inherit properties from parent tasks
- View relationships in task details

### AI Interaction Tracking

All AI interactions are logged and can be tracked:

```
kanbn find --tag ai-interaction
kanbn status  # Includes AI metrics
```

## Requirements for AI Features

- OpenRouter API key set as `OPENROUTER_API_KEY` environment variable
- Internet connection (falls back to basic decomposition when offline)

For more details on AI features, see the [AI Features documentation](./docs/ai-features.md).
