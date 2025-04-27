# Workflow Examples

This demo showcases different workflow scenarios and best practices for using Kanbn in various development environments.

## Solo Developer Workflow

### Daily Workflow

```bash
# Start your day
kanbn chat "Show me my tasks for today"
kanbn list --assignee me --status "In Progress"

# Update task status
kanbn task move setup-environment "In Progress"
kanbn task comment setup-environment "Setting up development environment"

# Track progress
kanbn progress
kanbn chat "What should I focus on next?"
```

### Project Planning

```bash
# Generate project tasks
kanbn chat "Help me plan tasks for my personal blog project"

# Organize tasks
kanbn task add "Setup Blog Framework" --priority high
kanbn decompose --task "setup-blog-framework"

# Track milestones
kanbn milestone add "MVP Release"
kanbn task link blog-setup --milestone mvp-release
```

## Team Workflow

### Sprint Planning

```bash
# Create new sprint
kanbn sprint create "Sprint 1"
kanbn sprint set-dates --start "2024-03-01" --end "2024-03-15"

# Plan sprint tasks
kanbn chat "Help plan tasks for Sprint 1"
kanbn sprint add-task user-authentication
kanbn sprint add-task api-endpoints

# Assign tasks
kanbn task assign user-authentication alice
kanbn task assign api-endpoints bob
```

### Code Review Process

```bash
# Move task to review
kanbn task move user-authentication "Code Review"
kanbn task comment user-authentication "Ready for review - PR #123"

# Review feedback
kanbn task add-review user-authentication \
  --reviewer charlie \
  --status approved \
  --comment "Code looks good, minor style fixes needed"

# Complete review
kanbn task move user-authentication "Done"
kanbn task comment user-authentication "Addressed review feedback"
```

### Team Collaboration

```bash
# Daily standup
kanbn report standup --team frontend
kanbn chat "Summarize team progress"

# Track blockers
kanbn task block api-endpoints "Waiting for database setup"
kanbn list --blocked true

# Team metrics
kanbn report velocity
kanbn report burndown
```

## Client Project Workflow

### Client Communication

```bash
# Generate client report
kanbn report client --sprint current
kanbn chat "Generate progress summary for client meeting"

# Track client requests
kanbn task add "Update homepage design" \
  --type "client-request" \
  --priority high \
  --requested-by "client-name"

# Milestone tracking
kanbn milestone progress "Phase 1"
kanbn report milestone --format markdown
```

### Release Management

```bash
# Prepare release
kanbn release create v1.0.0
kanbn release add-tasks v1.0.0 --tag release-1.0

# Generate release notes
kanbn chat "Generate release notes for v1.0.0"
kanbn report release v1.0.0 --format markdown

# Track deployment
kanbn task add "Deploy v1.0.0" \
  --type deployment \
  --depends-on "run-tests,update-docs"
```

## Agile Workflow

### Sprint Management

```bash
# Sprint planning
kanbn sprint plan --capacity 50
kanbn chat "Suggest task priorities for sprint"

# Daily activities
kanbn standup start
kanbn list --sprint current
kanbn progress --sprint current

# Sprint review
kanbn sprint review
kanbn report retrospective
```

### Backlog Refinement

```bash
# Organize backlog
kanbn backlog sort --priority
kanbn chat "Help refine backlog items"

# Story points
kanbn task set user-auth points 5
kanbn sprint capacity
```

## DevOps Workflow

### CI/CD Integration

```bash
# Track deployments
kanbn task add "Deploy to staging" \
  --type deployment \
  --environment staging

# Monitor status
kanbn task status deployment-123
kanbn list --environment production
```

### Infrastructure Management

```bash
# Track infrastructure tasks
kanbn task add "Update AWS resources" \
  --type infrastructure \
  --priority high

# Monitor changes
kanbn list --tag infrastructure
kanbn progress --tag infrastructure
```

## Best Practices

### Task Management
- Use consistent naming conventions
- Keep task descriptions detailed
- Update task status regularly
- Add relevant tags and metadata

### Team Communication
- Regular progress updates
- Clear task assignments
- Documented decisions
- Tracked blockers

### Project Organization
- Structured milestones
- Clear dependencies
- Regular backlog refinement
- Consistent workflow

## Common Workflow Patterns

### Feature Development
1. Create feature task
2. Break down into subtasks
3. Assign to team members
4. Track progress
5. Review and merge
6. Update documentation

### Bug Fixing
1. Create bug report
2. Reproduce and document
3. Assign priority
4. Fix and test
5. Review changes
6. Update status

### Documentation
1. Track documentation tasks
2. Use AI for generation
3. Review and update
4. Link to related tasks
5. Version control

## Next Steps

- Explore [AI Features](../ai-features.md)
- Review [Project Setup](setup-demo.md)
- Check [Task Structure](../task-structure.md) 