# Task Decomposition Demo

The Kanbn decompose feature allows you to break down complex tasks into smaller, actionable subtasks using AI.

## Prerequisites

Before using the decompose feature, make sure you have:

1. An OpenRouter API key set as an environment variable:
   ```bash
   export OPENROUTER_API_KEY=your_api_key_here
   ```

2. A Kanbn project initialized:
   ```bash
   kanbn init
   ```

3. At least one task created:
   ```bash
   kanbn add --name "Build website" --description "Create a company website with multiple pages and features" --column "Backlog"
   ```

## Basic Usage

To decompose a task, use the `decompose` command with the `--task` or `-t` option followed by the task ID:

```bash
kanbn decompose --task implement-user-authentication
```

This will:
1. Analyze the task description
2. Generate a list of subtasks
3. Create each subtask as a separate task in your kanban board
4. Establish parent-child relationships between the original task and the subtasks

Example output:

```
Decomposing task "Implement user authentication"...
Using model: google/gemma-3-4b-it:free
Generated 7 subtasks:
1. Design login and registration UI components
2. Create user database schema and models
3. Implement registration API endpoint with email verification
4. Implement login API endpoint with JWT token generation
5. Add password reset functionality
6. Implement frontend authentication state management
7. Add session persistence and token refresh mechanism

Creating child tasks...

Created 7 child tasks for "Implement user authentication"
- design-login-ui
- create-user-schema
- implement-registration-api
- implement-login-api
- add-password-reset
- implement-auth-state
- add-session-persistence
```

## Advanced Usage

### Interactive Mode

You can use the interactive mode to select a task and provide additional information:

```bash
kanbn decompose --interactive
```

This will prompt you to:
1. Select a task to decompose
2. Confirm if you want to use AI for decomposition
3. Optionally provide a custom description for decomposition

Example interactive session:

```
? Select a task to decompose: create-content-strategy
? Use AI to decompose this task? Yes
? Enter a custom description for decomposition (leave empty to use task description): Develop a comprehensive content strategy for the company website including blog posts, product pages, and marketing materials

Decomposing task "Create content strategy"...
Using model: google/gemma-3-4b-it:free
Generated 6 subtasks:
1. Conduct audience research and create user personas
2. Define content goals and KPIs for each website section
3. Create content calendar for blog posts (3-month plan)
4. Develop product page templates and content guidelines
5. Create style guide for consistent brand voice and messaging
6. Plan content distribution and promotion strategy

Creating child tasks...

Created 6 child tasks for "Create content strategy"
- conduct-audience-research
- define-content-goals
- create-content-calendar
- develop-product-templates
- create-style-guide
- plan-content-distribution
```

### Custom Description

If you want to provide more context or specific instructions for the decomposition, you can use the `--description` or `-d` option:

```bash
kanbn decompose --task setup-backend-api --description "Implement a RESTful API backend for the website with Node.js and Express. The API should handle user authentication, content management, form submissions, and integrate with the database. Ensure proper error handling, validation, and documentation."
```

Example output:

```
Decomposing task "Setup backend API"...
Using model: google/gemma-3-4b-it:free
Generated 8 subtasks:
1. Set up Node.js project structure with Express
2. Design database schema and create models
3. Implement user authentication endpoints (register, login, logout)
4. Create content management API endpoints (CRUD operations)
5. Implement form submission handling and validation
6. Add error handling middleware and logging
7. Create API documentation with Swagger/OpenAPI
8. Write unit and integration tests for API endpoints

Creating child tasks...

Created 8 child tasks for "Setup backend API"
- setup-node-project
- design-database-schema
- implement-auth-endpoints
- create-content-endpoints
- implement-form-handling
- add-error-handling
- create-api-docs
- write-api-tests
```

### Customizing the AI Model

You can customize the AI model used by setting the `OPENROUTER_MODEL` environment variable:

```bash
export OPENROUTER_MODEL="anthropic/claude-3-haiku-20240307"
kanbn decompose --task build-website
```

By default, the decompose feature uses `google/gemma-3-4b-it:free` which is a cost-effective option.

## Viewing Parent-Child Relationships

After decomposing a task, you can view the parent-child relationships:

```bash
kanbn task build-website
```

This will show the original task with its child tasks:

```
# Implement user authentication

Add login/signup functionality with secure authentication

## Metadata

- Created: 2023-04-19T14:25:00.000Z
- Updated: 2023-04-19T14:45:00.000Z
- Tags: backend, security, user-management
- Assigned: alex

## Relations

- Parent of: design-login-ui
- Parent of: create-user-schema
- Parent of: implement-registration-api
- Parent of: implement-login-api
- Parent of: add-password-reset
- Parent of: implement-auth-state
- Parent of: add-session-persistence

## Comments

**alex** (2023-04-19T14:50:00.000Z):
I've decomposed this task into smaller subtasks. We should prioritize the schema and API endpoints first.
```

You can also view a child task to see its parent:

```bash
kanbn task implement-login-api
```

Output:

```
# Implement login API endpoint with JWT token generation

Create a secure login endpoint that validates credentials and generates JWT tokens for authenticated users

## Metadata

- Created: 2023-04-19T14:45:00.000Z
- Updated: 2023-04-19T15:10:00.000Z
- Tags: backend, security, api
- Assigned: alex

## Relations

- Child of: implement-user-authentication
- Depends on: create-user-schema

## Subtasks

- [x] Define login request/response schema
- [ ] Implement password validation
- [ ] Add JWT token generation
- [ ] Set up token expiration and refresh logic
- [ ] Add rate limiting for failed login attempts
```

## Logging

All decompose interactions are automatically logged as special task files with the `ai-interaction` tag. You can view these interactions using:

```bash
kanbn find --tag ai-interaction
```

This helps you keep track of how tasks were decomposed and the AI's reasoning.
