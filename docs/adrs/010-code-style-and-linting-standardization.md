# ADR 010 - Code Style and Linting Standardization

- **Status**: Accepted
- **Date**: 2025-05-07

## Context

The Kanbn codebase currently lacks a formally enforced code style guide and automated linting process. This can lead to inconsistencies in code formatting, potential errors slipping through, and increased effort during code reviews and maintenance. To improve code quality, readability, and maintainability, a standardized approach to code style and linting is required.

## Decision

We will standardize code style and enforce it using ESLint with the following configuration and processes:

1.  **Tooling**: ESLint will be the standard linting tool for JavaScript code.

2.  **Configuration File**: ESLint configuration will be defined in `.eslintrc.js` in the project root.

3.  **Base Style Guide**: We will extend the widely-used `eslint-config-airbnb-base` style guide as our foundation.

4.  **Environment**: The ESLint configuration will specify the runtime environments as `node`, `commonjs`, and `es2021`. The `jest` environment will also be enabled to support testing globals.

5.  **Key Rule Overrides/Customizations** (as defined in `.eslintrc.js`):
    *   `no-console`: Allowed via `warn` level for `warn`, `error`, `info`, `log`, `debug` (useful for CLI).
    *   `no-unused-vars`: Warning level, ignoring args starting with `_` or named `next`.
    *   `no-plusplus`: Allowed (`off`).
    *   `no-param-reassign`: Allowed for property modification (`warn`, `{ props: false }`).
    *   `no-restricted-syntax`: `ForInStatement` discouraged (as per Airbnb), `ForOfStatement` allowed.
    *   `max-len`: Set to `code: 100`, but configured to ignore URLs, strings, template literals, and RegExp literals due to potential practical difficulties and readability concerns with excessively broken lines for these cases.

6.  **Ignored Patterns**: `node_modules/`, `coverage/`, `docs/`, `*.json`, `*.md` will be ignored by ESLint.

7.  **NPM Script**: An `npm run lint` script is defined in `package.json` executing `eslint . --ext .js`.

8.  **Error Handling Process**:
    *   Developers should run `npm run lint` periodically.
    *   Use `npm run lint -- --fix` to automatically correct fixable errors.
    *   Manually address remaining errors and warnings.
    *   If a rule seems overly restrictive or inappropriate for a specific, justifiable situation, discuss with the team before potentially disabling it for a specific line/block using `// eslint-disable-next-line ...` or `/* eslint-disable ... */ ... /* eslint-enable ... */` comments, **providing a clear reason in the comment**. Use disables sparingly.
    *   For persistent errors where the rule seems correct but the tool fails (like the `max-len` issues encountered on seemingly short lines during setup), use `eslint-disable-next-line` with a comment explaining it's a workaround for a suspected tooling issue, after exhausting reasonable fix attempts.

9.  **Future Integration**: Plan to integrate linting into pre-commit hooks (e.g., using Husky and lint-staged) and CI pipelines to automate enforcement (Ref: Testing Plan Step 10).

## Consequences

### Positive:

*   **Consistency**: Codebase will adhere to a single, consistent style guide.
*   **Readability**: Consistent formatting improves code readability and comprehension.
*   **Early Error Detection**: Linting catches potential errors and anti-patterns early.
*   **Reduced Review Effort**: Less time spent discussing style issues in code reviews.
*   **Easier Onboarding**: New developers have a clear style guide to follow.

### Negative:

*   **Initial Cleanup**: Significant initial effort may be required to bring the existing codebase into compliance.
*   **Build/Commit Friction**: Linting errors might block commits or builds until fixed, potentially slowing down development initially.
*   **Configuration Maintenance**: The ESLint configuration and its dependencies may require occasional updates.
*   **Rule Disputes**: Developers might occasionally disagree with specific rules from the chosen style guide, requiring discussion and potential configuration adjustments.
*   **Tooling Issues**: As observed, specific rules or configurations might occasionally interact poorly with the linting tool itself, requiring workarounds (like disable comments).
