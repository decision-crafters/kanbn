# ADR 011 - High-Level Data Flow

- **Status**: Accepted
- **Date**: 2025-05-07

## Context

Understanding how data moves through the Kanbn CLI application is crucial for development, testing, and maintenance. This ADR documents the high-level flow of data and control, from user command execution to file system interaction and potential external service calls (like AI).

**Note:** This ADR represents our current understanding based on project structure. It should be revisited and updated as integration tests and further code analysis reveal more specific details about module interactions and data flow patterns.


## Decision

The general data flow for a typical Kanbn command follows these steps:

1.  **Command Execution**: User executes `kanbn <command> [options] [arguments]` in the terminal.
2.  **CLI Entry Point (`bin/kanbn`)**: The shell executes the script registered in `package.json` (`bin/kanbn`). This script bootstraps the Node.js environment and executes the main exported function from `index.js`.
3.  **Main Application Bootstrap (`index.js`)**: This module handles initial setup:
    *   Loads environment variables (`dotenv`).
    *   Parses initial command-line arguments (`minimist`).
    *   Loads route definitions from `routes/*.json` using `auto-load`.
4.  **Command Routing (`index.js`)**: Based on the primary command (`process.argv[2]`), it identifies the appropriate route configuration (which includes the target controller path and argument parsing options).
    *   It handles the `help` command as a special case.
    *   It re-parses arguments using `minimist` based on the specific route's configuration.
5.  **Controller Logic (`src/controller/*.js`)**:
    *   The specific controller (required and executed by `index.js`) receives the route-specific parsed arguments (`argv`).
    *   It typically interacts with an instance of the `Kanbn` class (from `src/main.js`) to perform core operations.
    *   It may call general utility functions (`src/utility.js`).
    *   For AI features, it interacts with AI service abstractions (`src/lib/ai-service.js`).
6.  **Core Service (`src/main.js` - Kanbn Class)**:
    *   The `Kanbn` class orchestrates most application logic.
    *   It manages loading/saving the index and tasks via the file system, often delegating specific logic to utility modules (`index-utils`, `task-utils`, `file-utils`).
    *   It uses parsing utilities (`parse-index`, `parse-task`) for data conversion.
    *   It handles core operations like `createTask`, `moveTask`, `status`, `validate`, etc.
    *   Note: `src/main.js` also exports utility functions directly alongside the `Kanbn` class factory, allowing controllers or other modules to potentially bypass the class instance for certain operations.
7.  **Data Persistence (File System)**: The `Kanbn` class methods (often via utils) read and write the index file (e.g., `.kanbn/index.md`) and task files (e.g., `.kanbn/tasks/*.md`).
8.  **Output Generation**: The controller receives results from the `Kanbn` class methods or other services and generates output for the user via `console.log/error/warn`, potentially using formatting utilities.

**Diagrammatic Representation:**

```mermaid
sequenceDiagram
    participant User
    participant Terminal
    participant bin/kanbn as CLI Entry
    participant index.js as Router
    participant Controller (src/controller/*.js)
    participant Kanbn (Instance of src/main.js#Kanbn)
    participant Utils (src/lib/*, src/utility.js, src/parse-*.js)
    participant FS as File System (Index, Tasks)
    participant AIService as AI Service / Clients

    User->>Terminal: kanbn <command> [args]
    Terminal->>CLI Entry: Executes script
    CLI Entry->>Router: require('./index.js')()
    Router->>Router: Parse args (minimist), Load routes (auto-load)
    Router->>Controller: require/call controller(routeArgs)
    Controller->>Kanbn: new Kanbn() / call method(args)
    Kanbn->>Utils: Use helpers (index, task, file, parsing)
    Utils->>FS: Read Index/Task files
    FS-->>Utils: Return file content
    Utils-->>Kanbn: Return parsed data (index, tasks)
    alt AI Command (e.g., chat)
        Controller->>AIService: process command (text, context)
        AIService-->>Controller: Return AI response
    end
    Kanbn->>Utils: Use helpers (data manipulation)
    Utils->>FS: Write updated Index/Task files
    FS-->>Utils: Confirm write
    Kanbn-->>Controller: Return result/status
    Controller->>Terminal: console.log/error (formatted output)
    Terminal-->>User: Display output
```
## Consequences

### Positive:

*   Provides a clear mental model of the application's architecture.
*   Helps identify key modules and their responsibilities.
*   Facilitates debugging by showing likely paths for data flow.
*   Informs testing strategy (e.g., which layers require mocking).

### Negative:

*   This is a high-level view; actual interactions might be more complex or deviate in specific cases.
*   Doesn't detail internal data structures or specific function calls.
*   May become outdated if the architecture changes significantly; requires maintenance (ref: ADR-008).
