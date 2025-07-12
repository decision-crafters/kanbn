# ADR 008: Editor-Agent Integration Strategy

**Status**: Proposed

**Date**: 2025-07-03

## Context
Developers increasingly work inside IDEs and AI chat clients. We want Kanbn to be accessible from:
1. **VS Code Extension** – exposes Kanbn commands within the editor UI.
2. **Claude Desktop Agent** – enables natural‐language interactions with project boards.

Two competing transport options were considered:
• **Model Context Protocol (MCP)** – mature, tool-schema discovery, provider-agnostic.
• **Agent-to-Agent (A2A) Protocol** – emerging, richer orchestration but unstable.

Research (see research-questions-2025-07-03.md) shows MCP already meets >80 % of needs with lower risk.

## Decision
Adopt MCP as the primary integration layer for editor/agent clients. IDE extensions and chat agents will communicate with the local MCP server.

## Consequences
+ Immediate integration path for VS Code and Claude Desktop via HTTP.
+ Future A2A support can be layered on later through an adapter without breaking clients.
− Requires extension authors to embed simple MCP client instead of A2A.

## Tasks
- [ ] Publish reference `@kanbn/mcp-client` npm package (thin wrapper).
- [ ] Build VS Code extension using the client; implement "Add Task" command.
- [ ] Write Claude Desktop prompt guide referencing MCP endpoints.
- [ ] Monitor A2A spec maturity; reassess quarterly.
