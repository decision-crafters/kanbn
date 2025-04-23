# Task Structure

Here is a sample task file (`.kanbn/tasks/task-name.md`):

```markdown
---
created: 2021-03-18T02:08:42.293Z
updated: 2021-03-18T02:08:42.293Z
tags:
  - TagName
references:
  - https://example.com/reference1
  - https://github.com/decision-crafters/kanbn/issues/123
assigned: Username
progress: 0.5
started: 2021-03-21T04:58:38.653Z
completed: 2021-03-21T04:58:38.653Z
due: 2021-03-21T04:58:38.653Z
---

# Task Name

Task description...

## Sub-tasks

- [ ] This is an incomplete sub-task
- [x] This sub-task has been completed

## References

- https://example.com/reference1
- https://github.com/decision-crafters/kanbn/issues/123

## Relations

- [duplicates test-task-1](test-task-1.md)
- [obsoletes test-task-2](test-task-2.md)

## Comments

- author: Username
  date: 2021-03-31T07:47:05.775Z
  This is a comment...
```

The task file can optionally begin with YAML front-matter containing task metadata.

There should be a single level-1 heading at the top of the markdown body containing the task name.

The task description should appear below the title. The description can be of any length and can contain markdown.

The following level-2 headings are reserved for special purposes:

## Metadata

The 'Metadata' heading should be followed by a code block containing YAML. The 'yaml' info-string is not required, but might help with syntax highlighting in some editors.

Task metadata will be merged with YAML front-matter if any is present.

*Note: when a task is saved, all task metadata will be placed into YAML front-matter. The 'Metadata' heading is still supported for backwards-compatibility.*

```yaml
created: 2021-03-18T02:08:42.293Z
updated: 2021-03-18T02:08:42.293Z
tags:
  - TagName
assigned: Username
progress: 0.5
started: 2021-03-21T04:58:38.653Z
completed: 2021-03-21T04:58:38.653Z
due: 2021-03-21T04:58:38.653Z
```

### `created`

The date and time that the task was created. This is automatically populated when the task is created using `kanbn add`.

### `updated`

The date and time that the task was last updated. This is automatically populated when the task is modified, renamed, or moved to another column.

### `tags`

An array of tags to apply to this task.

### `references`

An array of URLs or other references related to this task. These can be links to external resources, documentation, GitHub issues, or any other relevant information.

### `assigned`

The name of the user this task is assigned to.

### `progress`

The amount of progress for this task. This should be between 0 (not started) and 1 (complete).

### `started`

The date and time that the task was started.

### `completed`

The date and time that the task was completed.

### `due`

The date and time that the task is due to be completed.

## Sub-tasks

This should be a list of strings. Each string can optionally start with `[ ]` (incomplete) or `[x]` (completed).

## Relations

This should be a list of links to other task files. The link text can optionally begin with a relation type.

## Comments

An array of comments, where each comment has an `author` and `date` property, and some text.
