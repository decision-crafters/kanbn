# ADR 005 - Ubiquitous Language Strategy

- **Status**: Proposed
- **Date**: 2025-05-07

## Context

A shared, unambiguous language (Ubiquitous Language) is essential for effective communication between domain experts, developers, and within the codebase itself. This ADR defines the strategy for establishing and maintaining such a language for the Kanbn project.

## Decision

We will actively cultivate and enforce a Ubiquitous Language derived from the Core Domain of Kanbn (AI-Augmented, Git-Native Task Management). This language will be used consistently across all project artifacts, including:

*   Code (variable names, class names, function names, comments)
*   Documentation (ADRs, README, user guides)
*   Discussions (meetings, chat, issue trackers)
*   CLI command names and output messages
*   User-facing prompts and AI interactions

**Process for Managing the Ubiquitous Language:**

1.  **Initial Glossary Development:** A preliminary glossary of terms will be established based on the Core Domain (ADR 004) and Bounded Context (ADR 003). This glossary will be part of this ADR initially and may be moved to a separate, more easily updatable document if it grows significantly.
2.  **Continuous Refinement:** The language is not static. As our understanding of the domain evolves, so will the language. Refinements will be proposed and discussed, often during ADR reviews or specific design sessions.
3.  **Code and Documentation Alignment:** Code reviews and documentation reviews will explicitly check for consistent use of the Ubiquitous Language.
4.  **ADRs as a Source of Truth:** New or clarified terms emerging from ADRs will be incorporated into the Ubiquitous Language.
5.  **CLI as an Embodiment:** The Kanbn CLI commands, options, and outputs are primary expressions of the Ubiquitous Language. Changes here must reflect and reinforce the language.

**Initial Glossary:**

*   **ADR (Architectural Decision Record):** A document recording an important architectural decision, its context, and consequences.
*   **AI Assistant/Chat:** The interactive, natural language interface for managing the project via AI.
*   **Archive:** The location or state of tasks that are completed and no longer active on the board but are preserved for historical reference.
*   **Board (Kanban Board):** The visual representation of work, typically organized into columns representing stages of a workflow. In Kanbn, this is primarily represented by `.kanbn/index.md`.
*   **Burndown Chart:** A graphical representation of work remaining versus time.
*   **CLI (Command Line Interface):** The primary method of interaction with Kanbn.
*   **Column:** A distinct stage or state in the Kanban workflow (e.g., "Todo", "In Progress", "Done"). Columns are defined in the `index.md`.
*   **Comment:** A note or discussion item attached to a Task.
*   **Context (Bounded Context):** The specific responsibility area and boundary of the Kanbn system.
*   **Core Domain:** The essential business logic and unique value proposition of Kanbn.
*   **Decompose (Task Decomposition):** The AI-driven process of breaking a larger Task or Epic into smaller, more manageable sub-tasks.
*   **Epic:** A large body of work that can be broken down into a number of smaller Tasks. Managed via AI chat and linked to Tasks.
*   **Index File (`.kanbn/index.md`):** The central Markdown file defining the board structure (columns) and referencing tasks.
*   **Initialize/Init:** The process of setting up a new Kanbn board in a project.
*   **Integration:** Connection with external services or data sources (e.g., AI services, web content for RAG).
*   **Kanbn:** The name of the project/software.
*   **Markdown:** The markup language used for storing task and board data.
*   **Metadata:** Additional, structured information associated with a task (e.g., creation date, custom fields).
*   **Move:** The action of changing a task's column or its order within a column.
*   **RAG (Retrieval Augmented Generation):** An AI technique that uses external knowledge sources to improve generated responses.
*   **Sprint:** A time-boxed period during which a specific set of work is to be completed.
*   **Status:** The current state of a task (often synonymous with the Column it resides in, but can also be a property of the task itself).
*   **Sub-task:** A smaller task that is part of a larger Task or Epic.
*   **Task:** A single unit of work tracked on the Kanban board. Represented by a Markdown file in `.kanbn/tasks/`.
*   **Task ID:** A unique identifier for a task.
*   **Template (ADR Template):** A standard format for creating ADRs.
*   **Ubiquitous Language:** The shared, common language used by the team and embedded in the system.
*   **Validate:** The process of checking the integrity and consistency of Kanbn data files.

## Consequences

**Positive:**
-   Reduced misunderstandings and ambiguity.
-   Improved collaboration between all stakeholders.
-   A more cohesive and understandable codebase.
-   Easier onboarding for new team members.
-   More intuitive CLI and user interactions.

**Negative:**
-   Requires conscious effort and discipline to maintain.
-   Initial time investment to define and agree upon the language.
-   May require refactoring of code or documentation if terms evolve significantly.
