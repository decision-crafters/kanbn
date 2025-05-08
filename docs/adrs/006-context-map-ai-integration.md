# ADR 006 - Context Map for AI and Git Integration

- **Status**: Proposed
- **Date**: 2025-05-07

## Context

Kanbn, while primarily a local tool, interacts with external systems, notably AI services for advanced features and the underlying Git system for versioning its data. This ADR documents these relationships using a Context Map to clarify boundaries and interaction patterns.

## Decision

We will define the relationships between the **Kanbn System** bounded context and its key external dependencies: **AI Services** and the **Git Version Control System**.

**Context Map:**

1.  **Kanbn System <-> AI Services (e.g., OpenRouter, Ollama)**
    *   **Relationship Type:** Upstream/Downstream (Kanbn is Downstream, AI Services are Upstream).
    *   **Interaction Pattern:** Kanbn acts as a client, making API requests to AI services for specific functionalities like task decomposition, natural language understanding for chat, and potentially content generation.
    *   **Integration Strategy:** An Anti-Corruption Layer (ACL) is implemented within Kanbn (`ai-service.js`, `openrouter-client.js`, `ollama-client.js`). This layer translates requests from Kanbn's domain model to the API contracts of the various AI services and translates responses back. This protects Kanbn from changes in the AI services' APIs and allows for swapping providers or models more easily.
    *   **Ubiquitous Language Note:** Terms like "prompt", "model", "completion" are used when interacting with the ACL and AI services, translated from Kanbn's internal concepts like "decompose task X" or "interpret chat command Y".

2.  **Kanbn System <-> Git Version Control System**
    *   **Relationship Type:** Partnership (Implicit) / Shared Kernel (loosely, via the file system).
    *   **Interaction Pattern:** Kanbn reads and writes its data (board, tasks) as Markdown files directly within a directory (`.kanbn`) that is intended to be partt of a user's Git repository. Kanbn itself does not execute Git commands directly for its core operations but relies on the user to manage versioning, branching, and sharing of these files using Git.
    *   **Integration Strategy:** Kanbn treats the file system as its persistence layer. The structure and format of these files (Markdown) are the "shared kernel". There isn't a tight programmatic integration, but the design *assumes* Git is present for versioning and collaboration workflows.
    *   **Ubiquitous Language Note:** Terms like "repository", "commit", "branch" are part of the user's workflow around Kanbn, but not directly manipulated by Kanbn commands themselves.

## Consequences

**Positive:**
-   Clear understanding of how Kanbn interacts with external systems.
-   The ACL for AI services provides flexibility and resilience to changes in external APIs.
-   Leveraging Git for versioning without direct integration keeps Kanbn simpler and focused on its core domain.
-   Developers can reason about the system's dependencies and design integrations accordingly.

**Negative:**
-   The ACL for AI services adds a layer of abstraction that needs to be maintained.
-   Kanbn's effectiveness for collaboration heavily relies on users' proficiency with Git.
-   Changes in how Git handles file locking or concurrent modifications (though rare at the file level Kanbn uses) could indirectly affect users if not managed well through user practices.

## Mermaid Diagram: Context Map

```mermaid
C4Context
  System_Boundary(kanbn_bc, "Kanbn System") {
    Component(core_logic, "Core Task & Board Logic", "Handles main operations")
    Component(ai_acl, "AI Anti-Corruption Layer", "Interface to AI services")
    Component(fs_adapter, "File System Adapter", "Reads/writes .kanbn files")

    Rel(core_logic, ai_acl, "Uses for AI features")
    Rel(core_logic, fs_adapter, "Uses for persistence")
  }

  System_Ext(ai_services, "AI Services", "OpenRouter, Ollama, etc.", "Upstream provider of AI models")
  SystemDb_Ext(git_repo, "Git Repository / File System", "Hosts .kanbn/ files, managed by user via Git", "Underlying version control")

  Rel_U(ai_acl, ai_services, "Consumes API of", "HTTPS/JSON")
  Rel_D(fs_adapter, git_repo, "Reads/Writes to", "Markdown files")

  UpdateRelStyle(ai_acl, ai_services, $offsetX="150", $offsetY="-50")
  UpdateRelStyle(fs_adapter, git_repo, $offsetX="150", $offsetY="50")

  Boundary_End()

  package "User's Workflow" {
    actor User
    System_Ext(git_cli, "Git CLI", "User tool for version control")
    Rel(User, git_cli, "Uses to manage repo")
    Rel(git_cli, git_repo, "Operates on")
  }

  Rel(User, kanbn_bc, "Interacts via CLI")

```
