# ADR 007: Expose Kanbn Functionality via MCP Server

**Status**: Proposed

**Date**: 2025-07-03

## Context
Originally, Kanbn was conceived as a purely CLI-driven tool. As adoption grew, the need arose to integrate Kanbn capabilities into external environments (VS Code extension, Claude Desktop agent, future web UI). A lightweight, provider-agnostic HTTP layer is required for such integrations.

The Model Context Protocol (MCP) has matured into a stable open standard (spec v2025-06-18) offering discovery, typed schemas, and memory integration. Existing Kanbn code already includes a skeleton `src/mcp-server.mjs`.

## Decision
We will expose selected Kanbn domain tools over an MCP server that listens on `MCP_PORT` (default 3000).

Key points:
1. **Dual surface** – CLI remains; MCP is additive.
2. **Tool coverage (Phase 1)** – `task.add`, `ai.chat`, `epic.create`, `epic.decompose`, `sprint.assign`, `health`.
3. **Provider-agnostic** – MCP delegates inference to current adapter (OpenRouter or local Ollama).
4. **Security** – Same auth env-vars (`OPENROUTER_API_KEY`, `OLLAMA_HOST`). If neither is set, AI tools return 503.
5. **Deployment** – MCP server bundled in Docker image; enabled by default.

## Consequences
+ External agents can discover and call Kanbn tools without shelling out.
+ Minimal code duplication—tool handlers reuse existing domain services.
+ Must maintain backward compatibility for CLI scripts.
+ Adds one long-running process; DevOps must monitor `/health`.

## Tasks
- [ ] Implement MCP tool handler registration in `src/mcp-server.mjs`.
- [ ] Add health-check endpoint.
- [ ] Write Jest integration test spinning up MCP on random port.
- [ ] Document usage in `docs/mcp-vs-cli.md`.
- [ ] Update CI to run MCP tests.
