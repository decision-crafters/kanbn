# Task References

Kanbn supports adding references to tasks, allowing you to link external resources, documentation, GitHub issues, or any other relevant information to your tasks.

## What are References?

References are URLs or other identifiers that point to external resources related to a task. They can be:

- Links to GitHub issues or pull requests
- URLs to documentation or specifications
- Links to design files or mockups
- References to external tracking systems
- Any other relevant external resource

## Adding References to Tasks

### When Creating a Task

You can add references when creating a new task:

```bash
kanbn add --name "Implement feature X" --refs "https://github.com/org/repo/issues/123" --refs "https://example.com/design-spec"
```

### When Editing a Task

You can add, remove, or replace references when editing a task:

```bash
# Add a reference
kanbn edit task-id --add-ref "https://example.com/new-reference"

# Remove a reference
kanbn edit task-id --remove-ref "https://example.com/old-reference"

# Replace all references
kanbn edit task-id --refs "https://example.com/new-reference"
```

### Interactive Mode

You can also add and manage references in interactive mode:

```bash
kanbn add -i
# Follow the prompts to add references

kanbn edit task-id -i
# Follow the prompts to add, remove, or edit references
```

## Viewing References

References are displayed when viewing a task:

```bash
kanbn task task-id
```

They appear in a dedicated "References" section in the task view.

## Finding Tasks by Reference

You can find tasks that contain specific references:

```bash
kanbn find --metadata "references" "github.com"
```

This will find all tasks that have references containing "github.com".

## References in Task Files

In the task markdown files, references are stored in two places:

1. In the YAML front-matter metadata:

```yaml
---
created: 2023-05-01T12:00:00.000Z
updated: 2023-05-01T12:00:00.000Z
references:
  - https://example.com/reference1
  - https://github.com/decision-crafters/kanbn/issues/123
---
```

2. In a dedicated "References" section in the markdown body:

```markdown
## References

- https://example.com/reference1
- https://github.com/decision-crafters/kanbn/issues/123
```

## Using References with AI Features

References can be included in AI features to provide additional context:

### In Chat

```bash
kanbn chat --with-refs
```

### In Task Decomposition

```bash
kanbn decompose --task task-id --with-refs
```

For more information on using references with AI features, see the [AI Features](ai-features.md) documentation.

## Benefits of Using References

- **Traceability**: Link tasks to external resources for better traceability
- **Context**: Provide additional context for tasks
- **Documentation**: Link to relevant documentation or specifications
- **Integration**: Connect your Kanbn board with other tools and systems
- **AI Enhancement**: Improve AI-powered features with additional context
