# Research Questions – 2025-07-03

This document captures the key research questions for evaluating whether the current Kanbn architecture aligns with project goals and upcoming epic-management features.

## Context
*Current architecture* – CLI-first, Local-first, DDD, Markdown storage, AI-augmented.

## Questions & Verification

| # | Question | Evidence to Gather | Verification Method |
|---|-----------|-------------------|---------------------|
| 1 | **DDD Alignment** – Are bounded contexts & ubiquitous language still intact as tasks/boards/sprints/epics evolve? | Aggregate boundaries in `src/`; ADR-009, ADR-011; epic branches | Architecture map vs. dep-cruiser scan; test coverage per context |
| 2 | **Local-First Markdown Viability** – Does Git-native Markdown remain optimal for large boards & epic hierarchies? | Performance on 5k-task board; merge-conflict stats | CRUD latency benchmark; conflict frequency analysis |
| 3 | **AI ACL Robustness** – Does the Anti-Corruption Layer fully isolate external LLM calls? | `src/ai/` modules, controllers, prompt templates | Fault-injection tests; security scan for data leakage |
| 4 | **CLI-First UX Sustainability** – Will advanced epic/sprint ops overload CLI discoverability? | Command usage logs, user feedback, planned flags | Cognitive-load heuristic; competitor comparison |
| 5 | **Testing Strategy Coverage** – Do Jest domain/data-flow tests guard new epic flows? | Remaining QUnit files; gap matrix | Coverage diff; mutation-testing score |
| 6 | **Scalability & Performance Headroom** – Can Kanbn scale to multi-team boards? | Container footprints; planned API endpoints | Load test with parallel instances; resource profiling |
| 7 | **Security & Compliance Posture** – Does the environment meet GDPR/SOC2 for AI logs & data? | Dockerfile hardening; `.env` secrets; audit status | Dependency audit; secrets scanner; threat model review |
| 8 | **Epic Decomposition Workflow Fit** – Will parent-child epic design integrate with sprints & board views? | Markdown schema prototype; chat command UX | Spike integration test; acceptance scenario validation |

---
*Generated automatically via MCP analysis on 2025-07-03.*
