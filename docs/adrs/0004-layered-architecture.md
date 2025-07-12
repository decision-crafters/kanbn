# ADR 004: Formalize Layered Architecture

**Status**: Proposed

**Date**: 2025-07-03

**Context**:
The project currently lacks a formally defined architectural style, leading to inconsistent component organization and unclear separation of concerns. This makes the codebase harder to navigate, maintain, and test. The recent ecosystem analysis confirmed this as a key area for improvement.

**Decision**:
We will adopt a formal Layered Architecture with four distinct layers:

- **Presentation (CLI & MCP Server)**: Handles user interface, input/output, and request parsing. This is the entry point for all external interactions.
- **Application (Use Cases/Services)**: Coordinates application logic and orchestrates use cases. It contains the application-specific business rules and is independent of the UI.
- **Domain (Business Logic/Entities)**: Contains the core business logic, entities, and aggregates. This layer is the heart of the application and has no dependencies on other layers.
- **Infrastructure (Data Persistence/External Services)**: Manages data access (e.g., file system operations) and integration with any external systems or services.

Each layer will have a well-defined responsibility and can only communicate with the layer directly below it.

**Consequences**:

*   **Positive**:
    *   Enforces a clear separation of concerns, improving modularity.
    *   Enhances testability by allowing layers to be tested in isolation.
    *   Provides a consistent and predictable structure for future development.
    *   Makes the codebase easier to understand and navigate for new developers.

*   **Negative**:
    *   Requires an initial refactoring effort to align existing code with the new structure.
    *   May introduce a small amount of performance overhead due to the additional abstraction.
