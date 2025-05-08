# ADR 001 - Project Goal and Value

- **Status**: Proposed
- **Date**: 2025-05-07

## Context

This project, Kanbn, aims to provide a command-line based Kanban board and project management tool. It leverages AI for features like task decomposition and offers Git-friendly markdown-based task management. The primary motivation is to offer a fast, efficient, and developer-centric way to manage projects directly within a Git repository.

## Decision

We will develop Kanbn with a core focus on:
1.  **CLI First**: All primary interactions will be through a command-line interface.
2.  **Markdown as Data**: Tasks and board state will be stored in Markdown files for easy version control and readability.
3.  **AI Augmentation**: Integrate AI capabilities to assist with project management tasks (e.g., epic decomposition, task generation).
4.  **Extensibility**: Design for future integrations and customization.
5.  **Local First / Self-Contained**: The core functionality should run locally without requiring external services, with optional AI integrations.

## Consequences

**Positive:**
-   Improved developer workflow by keeping project management within the terminal and version control.
-   Enhanced productivity through AI-assisted features.
-   Transparency and version history for project tasks and decisions.
-   Low friction for developers already comfortable with CLI and Git.

**Negative:**
-   May have a steeper learning curve for users not familiar with CLIs.
-   Visual appeal and user experience might be less rich compared to GUI-based tools, at least initially.
-   Reliance on AI for some features means those features might be unavailable or limited if AI services are down or not configured.
