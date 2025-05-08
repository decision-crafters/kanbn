# ADR 003 - Bounded Context Definition

- **Status**: Proposed
- **Date**: 2025-05-07

## Context

Defining a clear bounded context is essential for understanding the scope and responsibilities of the Kanbn system. This helps in maintaining focus and avoiding scope creep, ensuring that Kanbn excels at its core purpose.

## Decision

The **Kanbn System** bounded context has the primary responsibility of **local project and task management within a Git repository using a Kanban-style methodology**. Its boundaries are defined as follows:

**Core Responsibilities (Inside the Context):**

*   Managing a Kanban board (columns, tasks).
*   Creating, reading, updating, and deleting tasks.
*   Tracking task status, assignments, and metadata.
*   Storing board and task data in Markdown files within the user's project (`.kanbn` directory).
*   Providing a Command Line Interface (CLI) for all user interactions.
*   Facilitating sprint planning and burndown chart generation.
*   Integrating with AI services (e.g., OpenRouter, Ollama) for features like task decomposition and chat-based project assistance.
*   Validating the integrity of its data files.
*   Archiving and restoring tasks.

**Out of Scope (Outside the Context):**

*   **Version Control System:** Kanbn relies on Git but does not implement Git itself. It operates on files that are expected to be versioned by Git.
*   **Real-time Multi-user Collaboration:** While the files can be shared via Git, Kanbn core is designed as a local tool. Real-time synchronization is not a primary goal.
*   **CI/CD Platform:** Kanbn is not a CI/CD runner, though it can be used to manage tasks related to CI/CD pipelines.
*   **Issue Tracking for External Systems:** Kanbn does not aim to replace or directly synchronize with external issue trackers like Jira or GitHub Issues (though future integrations could be considered as separate contexts or anti-corruption layers).
*   **User Interface (UI) beyond CLI:** While alternative UIs could be built on top of the core, the primary interface is the CLI.
*   **Complex Reporting/Analytics Engine:** Basic status and burndown charts are included, but advanced business intelligence is out of scope.

## Consequences

**Positive:**
-   A clear focus allows for a lean and effective tool that excels at its core purpose.
-   Easier to maintain and reason about the system.
-   Avoids trying to be a monolithic solution for all project management needs.

**Negative:**
-   Users requiring features outside this defined context (e.g., real-time collaboration, deep integration with external bug trackers) will need to use Kanbn in conjunction with other tools or develop custom integrations.

## Mermaid Diagram: Kanbn Bounded Context (Optional)

```mermaid
C4Context
  System_Boundary(kanbn_bc, "Kanbn System") {
    Component(cli, "CLI", "Node.js", "Command Line Interface for user interaction")
    Component(task_manager, "Task & Board Manager", "Node.js", "Manages task lifecycle, board state, sprints")
    Component(markdown_store, "Markdown Data Store", "File System", "Stores board and tasks in .kanbn/ as Markdown")
    Component(ai_integration, "AI Integration Layer", "Node.js", "Connects to AI services for task decomposition, chat, etc.")
    Component(validation_engine, "Validation Engine", "Node.js", "Ensures data integrity")

    Rel(cli, task_manager, "Uses")
    Rel(task_manager, markdown_store, "Reads/Writes")
    Rel(task_manager, ai_integration, "Uses")
    Rel(validation_engine, markdown_store, "Validates")
  }

  SystemDb_Ext(git, "Git Repository", "Version Control System")
  System_Ext(ai_services, "AI Services", "OpenRouter, Ollama, etc.")

  Rel(kanbn_bc, git, "Operates within")
  Rel(ai_integration, ai_services, "Makes API calls to", "HTTPS")

  UpdateRelStyle(kanbn_bc, git, $offsetY="-40", $offsetX="80")
  UpdateRelStyle(ai_integration, ai_services, $offsetY="60", $offsetX="80")
```
