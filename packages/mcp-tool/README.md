# @kanbn/mcp-tool

This package bundles Kanbn MCP tool definitions (input and output schemas).

## Included Tools
- `kanbn_burndown`
- `kanbn_chat`
- `kanbn_help`
- `kanbn_init`
- `kanbn_integrations`
- `kanbn_remove_all`
- `kanbn_sprint`
- `kanbn_status`
- `kanbn_task_add`
- `kanbn_task_archive`
- `kanbn_task_comment`
- `kanbn_task_decompose`
- `kanbn_task_delete`
- `kanbn_task_find`
- `kanbn_task_list`
- `kanbn_task_move`
- `kanbn_task_rename`
- `kanbn_task_restore`
- `kanbn_task_sort`
- `kanbn_task_update`
- `kanbn_task_view`
- `kanbn_validate`
- `kanbn_version`

## Usage

### Register tools with an MCP server
```js
const { tools } = require('@kanbn/mcp-tool');
Object.values(tools).forEach(toolDef => server.addTool(toolDef));
```

### Use with `mcp-test`
```yaml
servers:
  - name: kanbn
    url: http://localhost:4444
    toolsPackage: '@kanbn/mcp-tool'
```
