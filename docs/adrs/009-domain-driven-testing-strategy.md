# ADR 009 - Domain-Driven Testing Strategy

- **Status**: Accepted
- **Date**: 2025-05-07

## Context

The Kanbn project is adopting a comprehensive testing strategy to ensure code quality, maintainability, and to facilitate future development. As the project incorporates Domain-Driven Design (DDD) principles in its architecture (see ADR-003, ADR-004, ADR-007), it is beneficial to align the testing strategy with these principles. This ADR outlines how DDD concepts will inform the types of tests written, their organization, and their focus. The goal is to have tests that not only verify correctness but also clearly reflect the domain logic and business use cases.

## Decision

We will adopt a testing strategy that emphasizes Domain-Driven Design principles in the following ways:

1.  **Focus on Domain Layer for Unit Tests**:
    *   Core domain logic encapsulated in entities, value objects, and domain services will be the primary targets for unit tests.
    *   These tests will verify the internal consistency, behavior, and invariants of these domain objects in isolation.
    *   Mocks will be used for dependencies outside the specific domain object being tested (e.g., repositories, other services).

2.  **Use Case Driven Integration Tests**:
    *   Integration tests will be structured around application services or use cases (e.g., "adding a task," "decomposing an epic," "generating a burndown chart").
    *   These tests will verify the collaboration between domain objects, application services, and infrastructure components (like in-memory databases or mocked external services) to fulfill a specific use case.
    *   They will ensure that different parts of the domain layer and application layer work together correctly.

3.  **Ubiquitous Language in Tests**:
    *   Test names, scenario descriptions (e.g., in BDD-style if adopted, or in Jest `describe` and `it` blocks), variable names, and assertion messages will consistently use the Ubiquitous Language defined for the Kanbn domain (e.g., "Task," "Epic," "Sprint," "Column," "Work-In-Progress limit").
    *   This will make tests more readable, understandable, and act as living documentation for the domain behavior.

4.  **Test Structure**:
    *   Unit tests will be co-located with the domain logic where feasible or placed in `test/unit/domain/` mirroring the `src/` structure for domain components.
    *   Integration tests will be placed in `test/integration/usecases/` or `test/integration/features/` and named after the use case or feature they cover.

5.  **Testing Framework**:
    *   Jest will be the primary framework for both unit and integration tests, leveraging its capabilities for mocking, assertions, and test organization.

## Consequences

### Positive:

*   **Clearer Test Intent**: Tests will more clearly express the business rules and behaviors they are verifying.
*   **Improved Maintainability**: Aligning tests with domain concepts makes them easier to understand and update when the domain logic changes.
*   **Better Domain Understanding**: Writing tests in this manner reinforces the understanding of the domain for all developers.
*   **Living Documentation**: Tests serve as executable examples and documentation of how the domain works.
*   **Focused Testing**: Ensures that critical domain logic is thoroughly tested at the unit level, and interactions are covered at the integration level.

### Negative:

*   **Initial Learning Curve**: Developers may need time to fully grasp how to apply DDD principles to testing effectively.
*   **Potential for More Granular Tests**: Focusing on domain objects might lead to a larger number of more focused unit tests initially.
*   **Defining "Use Cases" for Integration Tests**: Clear definition and scoping of use cases for integration testing will be important to avoid overly broad or unfocused tests.
*   **Mocking Discipline**: Effective mocking strategies will be crucial for isolating domain objects in unit tests and for managing dependencies in integration tests.

## Testing Workflow Decision Flow

```mermaid
graph TD
    A[Start: Identify Code's Primary Role/Layer] --> B{Core Domain Logic?};
    B -- Yes --> C[Unit Test: Domain Object];
    C --> C1[Focus: Internal Consistency, Behavior, Invariants];
    C --> C2[Methodology: Jest, Mock Externals, Ubiquitous Language];
    C --> C3[Location: test/unit/domain/ or co-located];
    B -- No --> D{Application Service / Use Case?};
    D -- Yes --> E[Integration Test: Use Case];
    E --> E1[Focus: Collaboration, End-to-End Use Case];
    E --> E2[Methodology: Jest, Real Domain Objects, Mock Heavy Externals, Ubiquitous Language];
    E --> E3[Location: test/integration/usecases/ or /features/];
    D -- No --> F{General Utility / Library Code?};
    F -- Yes --> G[Unit Test: Utility/Library];
    G --> G1[Focus: Input/Output Correctness, Edge Cases];
    G --> G2[Methodology: Jest, Test in Isolation];
    G --> G3[Location: test/unit/lib/ or /utils/];
    F -- No --> H{Infrastructure Component?};
    H -- Yes --> I[Unit & Integration Tests: Infrastructure];
    I --> I1[Unit Focus: Internal Logic, Mock External Interaction];
    I --> I2[Integration Focus: Contract with External System (Test Instance/Double)];
    I --> I3[Methodology: Jest, Ubiquitous Language (if domain-related)];
    I --> I4[Location: test/unit/infra/ & test/integration/infra/];
    H -- No --> J[End: Re-evaluate/Other];

    K[Cross-Cutting Concerns for ALL Tests];
    K --> K1[Framework: Jest];
    K --> K2[Language: Ubiquitous Language];
    K --> K3[Clarity & Readability];

    C3 --> Z[End Test Definition];
    E3 --> Z;
    G3 --> Z;
    I4 --> Z;
    J --> Z;
```

This flow helps determine the appropriate testing approach for a given piece of code, based on ADR-009:

1.  **Identify the Code's Primary Role/Layer:**
    *   What is the main responsibility of the code you are about to test?

2.  **Decision Point: Is it Core Domain Logic?**
    *   **Characteristics:** Represents a fundamental concept, rule, or process of the Kanbn domain (e.g., a `Task` entity's state transitions, a `Sprint`'s capacity calculation, a `ValueObject` like `TaskPriority`).
    *   **If YES (Core Domain Logic):**
        *   **Test Type:** Primarily **Unit Tests**.
        *   **Focus:**
            *   Verify internal consistency, behavior, business rules, and invariants of the entity or value object in isolation.
            *   Test all significant states and transitions.
        *   **Methodology:**
            *   Use Jest.
            *   Mock all external dependencies (e.g., repositories, external services, other domain objects not directly part of the aggregate being tested).
            *   Employ the **Ubiquitous Language** in test descriptions (`describe`, `it`), variable names, and assertion messages.
        *   **Location:** Co-located with source or in `test/unit/domain/` mirroring the `src/` structure.

3.  **Decision Point: Is it an Application Service / Use Case Orchestrator?**
    *   **Characteristics:** Orchestrates domain objects and infrastructure components to fulfill a user-facing operation or a system process (e.g., `addTaskService`, `decomposeEpicUsecase`, `generateBurndownReportService`).
    *   **If YES (Application Service / Use Case):**
        *   **Test Type:** Primarily **Integration Tests**.
        *   **Focus:**
            *   Verify the successful execution of the entire use case.
            *   Test the collaboration between the application service, involved domain entities/services, and infrastructure components (e.g., data access, event emitters).
        *   **Methodology:**
            *   Use Jest.
            *   Use real instances of domain objects involved in the use case.
            *   Use test doubles (mocks, stubs, or fakes) for heavy external dependencies like actual databases or third-party APIs (e.g., an in-memory repository implementation for tests, or MSW for HTTP calls).
            *   Employ the **Ubiquitous Language** to describe the use case and expected outcomes.
        *   **Location:** `test/integration/usecases/` or `test/integration/features/`, named after the use case.

4.  **Decision Point: Is it a General Utility or Library Code (Non-Domain Specific)?**
    *   **Characteristics:** Provides reusable helper functions, data transformations, or technical services not tied to specific Kanbn domain rules (e.g., `file-utils.js`, `markdown-parser.js` if it's generic, `date-formatter.js`).
    *   **If YES (Utility/Library Code):**
        *   **Test Type:** Primarily **Unit Tests**.
        *   **Focus:**
            *   Verify the correctness of the function's input/output behavior.
            *   Test edge cases and error handling.
        *   **Methodology:**
            *   Use Jest.
            *   Test in isolation.
            *   Use clear, descriptive names based on the function's purpose.
        *   **Location:** `test/unit/lib/` or `test/unit/utils/` mirroring the `src/` structure.

5.  **Decision Point: Is it an Infrastructure Component?**
    *   **Characteristics:** Deals with external concerns like database access (repository implementations), API clients for external services, message queue adapters.
    *   **If YES (Infrastructure Component):**
        *   **Test Type:** Can be a mix:
            *   **Unit tests** for any internal logic within the component (e.g., query building, data mapping), mocking the actual external interaction.
            *   **Integration tests** (often called "contract tests" or focused integration tests) to verify the interaction with a test instance of the external system (e.g., an in-memory DB, a mock HTTP server like `nock` or MSW for API clients).
        *   **Focus:**
            *   Unit: Correctness of the component's own logic.
            *   Integration: Correct interaction contract (request/response) with the external system.
        *   **Methodology:**
            *   Use Jest.
            *   Employ the **Ubiquitous Language** where interactions touch domain concepts (e.g., a repository for `Task` entities).
        *   **Location:** `test/unit/infrastructure/` and `test/integration/infrastructure/`.

6.  **Cross-Cutting Concerns (Apply to All Tests):**
    *   **Framework:** Use Jest.
    *   **Language:** Consistently use the **Ubiquitous Language** in test descriptions, names, and assertions, especially when tests relate to domain behavior or use cases.
    *   **Clarity & Readability:** Strive for tests that are easy to understand and clearly express what is being tested and why.