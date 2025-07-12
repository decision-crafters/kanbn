# ADR 003: MCP Server Integration

**Status**: Proposed

**Date**: 2025-07-03

**Context**:
Kanbn is currently a CLI-first application that consumes AI services. To enhance its utility and interoperability within the broader AI ecosystem, there is a need to expose its project management capabilities to external AI agents and tools in a standardized way.

**Decision**:
We will implement a Model Context Protocol (MCP) server within the Kanbn project. This server will operate alongside the existing CLI, providing a programmatic interface to Kanbn's core functionalities.

1.  **Architecture**: Kanbn will evolve into a dual-interface application. The existing CLI will be maintained for human interaction, while a new MCP server will handle programmatic interaction.

2.  **Capabilities**: The server will expose Kanbn's core functions as `Tools` as defined by the MCP specification. Initial tools will include:
    *   `create-task`
    *   `get-task`
    *   `list-tasks`
    *   `decompose-epic`

3.  **Technology**: We will use the official `@modelcontextprotocol/sdk` TypeScript/JavaScript SDK (version `^1.14.0`) to build the server. It will be run within the existing Node.js environment, likely using the Express.js framework to handle HTTP transport.

**Consequences**:

*   **Positive**:
    *   **Interoperability**: Kanbn will become compatible with any MCP client (e.g., AI assistants, IDE extensions), dramatically increasing its utility.
    *   **Automation**: Enables complex, agentic workflows where AI can autonomously manage projects within Kanbn.
    *   **Clear API**: Formalizes a clear, versioned API for Kanbn's core logic, improving maintainability.

*   **Negative**:
    *   **Increased Complexity**: Introduces a new server component, adding to the architectural complexity.
    *   **New Dependencies**: Requires adding and managing new dependencies for the MCP SDK and an HTTP server.
    *   **Operational Overhead**: The server will be a long-running process, requiring new considerations for deployment, monitoring, and security.

**Implementation Notes**:
*   **Package Import**: During initial setup, an `ERR_PACKAGE_PATH_NOT_EXPORTED` error was encountered. This was resolved by changing the import from `require('@modelcontextprotocol/sdk')` to `require('@modelcontextprotocol/sdk/server')`. This is a common requirement for modern Node.js packages that use the `exports` field in `package.json`.
