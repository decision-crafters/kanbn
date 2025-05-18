# Kanbn MCP Server Implementation Tasks

## Phase 1: Core Functionality (In Progress)
- [x] Set up MCP server foundation (`src/lib/mcp-server.js`)
- [x] Add MCP dependencies (`package.json`)
- [x] Configure environment variables (`.env.example`)
- [ ] Implement remaining core tools:
  - [ ] `move-task` tool
  - [ ] `update-task` tool
  - [ ] `delete-task` tool
- [ ] Complete resource implementations:
  - [ ] Board metadata resource
  - [ ] Column definitions resource
  - [ ] Workload metrics resource

## Phase 2: AI Integration
- [ ] Refactor decomposition to use MCP protocol
- [ ] Migrate chat functionality:
  - [ ] Convert chat controller to MCP tools
  - [ ] Expose conversation history as resource
- [ ] Add project context resources:
  - [ ] Column definitions
  - [ ] Workload metrics
  - [ ] Tag taxonomy

## Phase 3: Advanced Features
- [ ] Implement OAuth for remote integration
- [ ] Create MCP-specific documentation
- [ ] Build demo integrations:
  - [ ] Claude Desktop
  - [ ] GitHub Copilot

## Testing
- [ ] Unit tests for MCP server
- [ ] Integration tests with AI hosts
- [ ] End-to-end workflow tests

## Documentation
- [ ] API reference
- [ ] Example integrations
- [ ] Developer guide

## Current Blockers
1. Need to fix failing Jest tests before proceeding
2. Need to finalize MCP authentication approach
