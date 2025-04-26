# Markdown Parser Migration

This document describes the migration from `marked` to `markdown-it` for Markdown parsing in Kanbn.

## Motivation

The primary motivation for this migration was to fix an issue with empty list items in the Kanbn index file. The `marked` parser was incorrectly handling empty list items (`- `), which caused errors when parsing the index file.

## Implementation

The migration was implemented by creating a compatibility layer in `src/lib/markdown.js` that provides a consistent API for markdown parsing using `markdown-it`. This allows us to switch from `marked` to `markdown-it` without having to change the API in all the places where markdown parsing is used.

### Files Changed

- `src/lib/markdown.js` (new file) - Compatibility layer
- `src/parse-task.js` - Updated to use the new markdown module
- `src/parse-index.js` - Updated to use the new markdown module
- `src/controller/task.js` - Updated to use the new markdown module

### Dependencies Added

- `markdown-it` - The new markdown parser
- `markdown-it-task-lists` - Plugin for task list support
- `markdown-it-terminal` - Plugin for terminal rendering

## Testing

The migration was tested by creating a test script that compares the output of both parsers on various test cases, including empty list items, nested lists, and task lists. The results showed that both parsers correctly handle empty list items, which was the primary goal of this migration.

## Future Work

- Remove the `marked` dependency once all usages have been replaced
- Consider adding more plugins to enhance the markdown parsing capabilities
- Improve the compatibility layer to better handle edge cases

## References

- [markdown-it](https://github.com/markdown-it/markdown-it)
- [markdown-it-task-lists](https://github.com/revin/markdown-it-task-lists)
- [markdown-it-terminal](https://github.com/trabus/markdown-it-terminal)
