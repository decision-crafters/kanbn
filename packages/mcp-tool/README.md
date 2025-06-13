# @kanbn/mcp-tool

This package bundles Kanbn MCP tool definitions (input and output schemas).

## Included Tools

- `kanbn_task_add`
- `kanbn_task_view`
- `kanbn_task_list`
- `kanbn_task_update`
- `kanbn_task_move`
- `kanbn_task_delete`

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
