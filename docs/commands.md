# Kanbn Commands

This page provides an overview of all available commands in Kanbn.

## Basic Commands

### `kanbn init`

Initializes a new Kanbn project in the current directory.

```bash
kanbn init [--name <project name>] [--description <project description>]
```

Options:
- `--name, -n`: Specify the project name
- `--description, -d`: Specify the project description

### `kanbn add`

Adds a new task to the Kanbn board.

```bash
kanbn add [--name <task name>] [--description <task description>] [--column <column name>]
```

Options:
- `--name, -n`: Specify the task name
- `--description, -d`: Specify the task description
- `--column, -c`: Specify the column to add the task to
- `--untracked, -u`: Add all untracked tasks

### `kanbn board`

Displays the Kanbn board in the terminal.

```bash
kanbn board
```

### `kanbn task`

Displays details of a specific task.

```bash
kanbn task <task id>
```

### `kanbn find`

Finds tasks based on various criteria.

```bash
kanbn find [--column <column name>] [--tag <tag>] [--assigned <assignee>] [--name <name>] [--description <description>]
```

Options:
- `--column, -c`: Find tasks in a specific column
- `--tag, -t`: Find tasks with a specific tag
- `--assigned, -a`: Find tasks assigned to a specific person
- `--name, -n`: Find tasks with a specific name (supports regex)
- `--description, -d`: Find tasks with a specific description (supports regex)

### `kanbn move`

Moves a task to a different column.

```bash
kanbn move <task id> <column name>
```

### `kanbn edit`

Edits a task's properties.

```bash
kanbn edit <task id> [--name <new name>] [--description <new description>]
```

Options:
- `--name, -n`: Change the task name
- `--description, -d`: Change the task description
- `--add-tag, -at`: Add a tag to the task
- `--remove-tag, -rt`: Remove a tag from the task
- `--assign, -a`: Assign the task to someone
- `--unassign, -ua`: Unassign the task

### `kanbn comment`

Adds a comment to a task.

```bash
kanbn comment <task id> <comment text>
```

### `kanbn remove`

Removes a task from the board.

```bash
kanbn remove <task id>
```

### `kanbn remove-all`

Removes all tasks from the board.

```bash
kanbn remove-all [--column <column name>]
```

Options:
- `--column, -c`: Remove all tasks from a specific column

### `kanbn rename`

Renames a column.

```bash
kanbn rename <old column name> <new column name>
```

### `kanbn status`

Displays the status of the Kanbn board.

```bash
kanbn status [--json] [--no-color]
```

Options:
- `--json, -j`: Output in JSON format
- `--no-color, -nc`: Disable colored output

### `kanbn version`

Displays the version of Kanbn.

```bash
kanbn version
```

### `kanbn help`

Displays help information.

```bash
kanbn help [command]
```

## Advanced Commands

### `kanbn archive`

Archives a task.

```bash
kanbn archive <task id>
```

### `kanbn restore`

Restores an archived task.

```bash
kanbn restore <task id> [--column <column name>]
```

Options:
- `--column, -c`: Specify the column to restore the task to

### `kanbn sort`

Sorts tasks in a column.

```bash
kanbn sort <column name> [--by <field>] [--direction <asc|desc>]
```

Options:
- `--by, -b`: Sort by field (name, created, updated)
- `--direction, -d`: Sort direction (asc, desc)

### `kanbn validate`

Validates the Kanbn board structure.

```bash
kanbn validate
```

### `kanbn burndown`

Generates a burndown chart.

```bash
kanbn burndown [--start <start date>] [--end <end date>] [--output <output file>]
```

Options:
- `--start, -s`: Start date (YYYY-MM-DD)
- `--end, -e`: End date (YYYY-MM-DD)
- `--output, -o`: Output file path

### `kanbn sprint`

Manages sprints.

```bash
kanbn sprint [--start <start date>] [--end <end date>] [--name <sprint name>]
```

Options:
- `--start, -s`: Start date (YYYY-MM-DD)
- `--end, -e`: End date (YYYY-MM-DD)
- `--name, -n`: Sprint name

## AI Commands

### `kanbn chat`

Starts a chat with the AI project assistant.

```bash
kanbn chat [--message <message>]
```

Options:
- `--message, -m`: Send a one-off message to the assistant

For detailed examples and usage instructions, see the [Chat Demo](demos/chat-demo.md).

### `kanbn decompose`

Decomposes a task into smaller subtasks using AI.

```bash
kanbn decompose [--task <task id>] [--description <custom description>] [--interactive]
```

Options:
- `--task, -t`: Specify the task ID to decompose
- `--description, -d`: Provide a custom description for decomposition
- `--interactive, -i`: Decompose a task interactively

For detailed examples and usage instructions, see the [Decompose Demo](demos/decompose-demo.md).

### `kanbn integrations`

Manages RAG-based knowledge integrations for AI features.

```bash
kanbn integrations [--list] [--add] [--remove] [--name <name>] [--url <url>] [--content <content>]
```

Options:
- `--list, -l`: List all available integrations
- `--add, -a`: Add a new integration
- `--remove, -r`: Remove an integration
- `--name, -n`: Name of the integration (required for add/remove)
- `--url, -u`: URL to download integration content from
- `--content, -c`: Content for the integration

Use integrations with the chat command:
```bash
# Use all available integrations
kanbn chat --with-integrations

# Use specific integration(s)
kanbn chat --integration game-systems
```
