# @kanbn/mcp-tool

This package bundles Kanbn MCP tool definitions (input and output schemas).

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
