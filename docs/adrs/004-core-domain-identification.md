# ADR 004 - Core Domain Identification

- **Status**: Proposed
- **Date**: 2025-05-07

## Context

Identifying the Core Domain is crucial for focusing development efforts on the most critical and differentiating aspects of the Kanbn system. The Core Domain represents the unique business logic and value proposition of Kanbn.

## Decision

The Core Domain of Kanbn is **AI-Augmented, Git-Native Task Management**.

This encompasses the following key elements and their essential business logic:

1.  **Task Lifecycle Management (Git-Native):**
    *   **Entities:** `Task`, `Board`, `Column`, `Sprint`.
    *   **Logic:** Creating, updating, moving, and archiving tasks. Defining task properties (ID, name, description, status, assignee, due date, sub-tasks, comments, metadata, relationships to epics).
    *   **Uniqueness:** Storing and managing these entities directly as Markdown files within a user's Git repository (`.kanbn` directory). This allows versioning, branching, and offline access inherent to Git.
    *   **Key Operations:** `add`, `edit`, `move`, `remove`, `archive`, `restore`, `task` (view).

2.  **Board Organization and Visualization (CLI-Centric):**
    *   **Entities:** `Board`, `Column`.
    *   **Logic:** Defining board structure (columns), displaying the board state in the terminal, calculating column WIP (Work In Progress) if implemented.
    *   **Uniqueness:** Providing a rich, text-based representation of the Kanban board accessible and manipulable via the CLI.
    *   **Key Operations:** `board`, `init` (board setup).

3.  **AI-Powered Project Assistance:**
    *   **Logic:** Leveraging Large Language Models (LLMs) for:
        *   **Task Decomposition:** Breaking down complex tasks or epics into smaller, manageable sub-tasks.
        *   **Interactive Chat:** Allowing users to interact with their project data, ask questions, and perform actions using natural language (e.g., "kanbn chat create a task for X", "kanbn chat what are my overdue tasks?").
        *   **Content Generation:** Potentially assisting in drafting task descriptions or comments.
    *   **Uniqueness:** Seamlessly integrating AI capabilities into the CLI workflow to enhance productivity and provide intelligent suggestions.
    *   **Key Operations:** `decompose`, `chat`, AI-driven `init`.

4.  **Sprint Management & Progress Tracking:**
    *   **Entities:** `Sprint`.
    *   **Logic:** Defining sprint start/end dates, associating tasks with sprints, generating burndown charts.
    *   **Uniqueness:** Lightweight sprint management suitable for CLI and Git-based workflows.
    *   **Key Operations:** `sprint`, `burndown`, `status`.

**Supporting Domains (Important, but not the core differentiator):**

*   **File Parsing & Serialization:** Converting between Markdown file content and in-memory data structures.
*   **CLI Argument Parsing & Command Dispatch:** Handling user input from the command line.
*   **Configuration Management:** Reading `.env` or other configuration files.
*   **Basic Validation:** Ensuring file integrity and basic data consistency (`validate` command).

## Consequences

**Positive:**
-   Development efforts are prioritized on features that deliver the most unique value.
-   Helps in making technology choices and architectural decisions that best support the core functionality.
-   Clarifies what makes Kanbn different from generic task managers or GUI-based Kanban boards.

**Negative:**
-   Features in supporting domains might initially be less sophisticated if focus is heavily on the core. However, they must be robust enough to support the core effectively.
