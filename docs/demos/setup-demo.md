# Project Setup Demo

This demo walks through setting up a new project with Kanbn, showcasing real-world examples and best practices.

## Basic Project Setup

```bash
# Create a new project directory
mkdir my-new-project
cd my-new-project

# Initialize npm project (optional but recommended)
npm init -y

# Initialize Kanbn with AI assistance
kanbn init --ai
```

## Demo: Setting Up a Web Application Project

### 1. Initial Setup with AI

```bash
# Create project
mkdir web-app-project
cd web-app-project

# Initialize with AI
kanbn init --ai

# When prompted, describe your project:
# "A modern web application with user authentication, 
#  REST API backend, and React frontend"
```

Example AI Output:
```
Analyzing project requirements...
Suggested columns:
- Backlog
- Design
- Development
- Testing
- Done

Initial tasks created:
1. Setup project structure
2. Configure development environment
3. Design database schema
4. Implement user authentication
5. Create REST API endpoints
```

### 2. Customizing the Setup

```bash
# Edit board configuration
kanbn edit index

# Add custom columns
kanbn column add "Code Review"
kanbn column add "Deployed"

# Configure task templates
kanbn template add feature
kanbn template add bug
```

### 3. Setting Up Project Integration

```bash
# Configure Git integration
git init
echo ".kanbn/" >> .gitignore
git add .
git commit -m "Initialize Kanbn project"

# Set up team collaboration
kanbn config set team.members "alice,bob,charlie"
kanbn config set notifications.enabled true
```

## Demo: Task Organization

### 1. Creating Task Structure

```bash
# Create epic task
kanbn task add "User Authentication System" \
  --type epic \
  --description "Complete user authentication system implementation"

# Create child tasks
kanbn task add "Setup OAuth providers" \
  --parent "user-authentication-system"
kanbn task add "Implement login UI" \
  --parent "user-authentication-system"
```

### 2. Using AI for Task Generation

```bash
# Generate tasks for a feature
kanbn chat "Generate tasks for implementing user profile features"

# Break down complex task
kanbn decompose --task "user-authentication-system"
```

## Demo: Project Documentation

### 1. Generating Documentation

```bash
# Generate project overview
kanbn report overview

# Create sprint documentation
kanbn report sprint --current
```

### 2. AI-Assisted Documentation

```bash
# Get documentation suggestions
kanbn chat "Help me document the authentication system"

# Generate technical documentation
kanbn chat "Create API documentation for user endpoints"
```

## Best Practices Demonstrated

1. **Project Organization**
   - Use meaningful task names
   - Maintain clear task hierarchies
   - Keep related tasks grouped

2. **Team Collaboration**
   - Set up team members
   - Configure notifications
   - Use standardized templates

3. **Documentation**
   - Regular progress reports
   - Technical documentation
   - AI-assisted documentation

4. **Version Control**
   - Proper Git integration
   - Ignore patterns
   - Commit messages

## Common Setup Scenarios

### Scenario 1: Solo Developer Project
```bash
kanbn init --ai
kanbn config set workflow.type "solo"
kanbn template add personal-task
```

### Scenario 2: Team Project
```bash
kanbn init --ai
kanbn config set workflow.type "team"
kanbn config set review.required true
```

### Scenario 3: Client Project
```bash
kanbn init --ai
kanbn config set workflow.type "client"
kanbn config set reporting.frequency "weekly"
```

## Troubleshooting

1. **AI Integration Issues**
   - Verify API key configuration
   - Check internet connectivity
   - Validate model availability

2. **Configuration Problems**
   - Check .kanbnrc file
   - Verify permissions
   - Review environment variables

## Next Steps

- Explore [AI Features](../ai-features.md)
- Review [Task Management](../task-structure.md)
- Check [Workflow Examples](workflow-demo.md) 