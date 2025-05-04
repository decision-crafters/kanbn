# Epic Management in Kanbn

Epics are high-level tasks or user stories that can be broken down into smaller, more manageable subtasks. Kanbn's AI-powered epic management helps you organize complex features or major project initiatives by automatically decomposing them into actionable tasks.

## Creating and Managing Epics

Epics in Kanbn are represented as special tasks with a `type: "epic"` metadata property and parent-child relationships to their subtasks.

### Creating Epics

Create a new epic using the chat interface:

```bash
kanbn chat "createEpic: Create a user authentication system"
```

This will:
1. Create a new task with `type: "epic"` in its metadata
2. Apply appropriate tags based on the epic description
3. Return the epic ID for future reference

### Decomposing Epics

Break down an epic into subtasks using:

```bash
kanbn chat "decomposeEpic: epic-123"
```

The AI will:
1. Analyze the epic description
2. Generate appropriate subtasks
3. Establish parent-child relationships
4. Assign tasks to suitable columns
5. Recommend sprint assignments when possible

### Viewing Epic Information

Several commands are available for viewing epic information:

```bash
# List all epics in the project
kanbn chat "listEpics"

# Show details of a specific epic
kanbn chat "showEpicDetails: epic-123"

# List all tasks belonging to an epic
kanbn chat "listEpicTasks: epic-123"
```

## Epic Data Structure

Epics use Kanbn's existing task structure with special metadata:

```yaml
---
id: epic-123
name: Create user authentication system
description: Implement a secure user authentication system with registration and login capabilities
metadata:
  type: epic
  children:
    - auth-task-1
    - auth-task-2
    - auth-task-3
  tags:
    - authentication
    - security
---
```

Child tasks have a reference back to their parent epic:

```yaml
---
id: auth-task-1
name: Implement user registration form
description: Create a registration form with email, password, and confirmation fields
metadata:
  parent: epic-123
  tags:
    - frontend
    - authentication
---
```

## Bootstrap Scripts with Epics

Kanbn provides bootstrap scripts that support epic creation during project initialization.

### Local Bootstrap Script

```bash
# Download the bootstrap script
curl -O https://raw.githubusercontent.com/decision-crafters/kanbn/refs/heads/master/examples/bootstrap.sh
chmod +x bootstrap.sh

# Create a project with an epic
./bootstrap.sh --project-name "Auth System" --epic "Create a user authentication system with registration and login capabilities"

# Use Ollama instead of OpenRouter
./bootstrap.sh --use-ollama --epic "Create a user authentication system"
```

### Container Bootstrap Script

```bash
# With Docker - Create Project with Epic
docker run --rm -v $(pwd):/workspace -w /workspace \
  -e PROJECT_NAME="Auth System" \
  -e PROJECT_DESCRIPTION="A secure authentication system" \
  -e EPIC_DESCRIPTION="Create a user authentication system with registration and login" \
  -e USE_OLLAMA=true \
  -e OLLAMA_HOST=http://host.docker.internal:11434 \
  --add-host=host.docker.internal:host-gateway \
  quay.io/takinosh/kanbn:latest ./examples/bootstrap_container.sh
```

## AI Models and Configuration

Epic management works best with specific models:

- **OpenRouter**: Works with most models, but `google/gemma-3-4b-it:free` provides good results
- **Ollama**: The `qwen3` model is recommended for epic decomposition

Configure your environment variables accordingly:

```bash
# Option A: OpenRouter
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_MODEL=google/gemma-3-4b-it:free

# Option B: Ollama
USE_OLLAMA=true
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen3
```

## Best Practices

For effective epic management:

1. **Be Specific**: Provide clear, detailed descriptions when creating epics
2. **Use Tags**: Include relevant tags to help with task organization
3. **Review Decomposition**: Always review AI-generated subtasks for completeness
4. **Update Regularly**: Keep epic statuses updated as subtasks progress
5. **Use Context**: For better decomposition, provide project context using RAG integrations

## Integration with Sprints

Epics integrate with Kanbn's sprint functionality:

1. The AI will recommend sprint assignments when decomposing epics
2. Track epic progress across sprints with the burndown chart
3. Use `kanbn status` to see overall epic completion metrics

## Examples

### Creating a Feature Epic

```bash
# Create an epic for a new feature
kanbn chat "createEpic: Implement file upload and management with drag-and-drop, progress tracking, and file preview capabilities"

# Decompose the epic into subtasks
kanbn chat "decomposeEpic: epic-123"
```

### Creating an Infrastructure Epic

```bash
# Create an epic for infrastructure work
kanbn chat "createEpic: Set up CI/CD pipeline with automated testing, staging deployment, and production release management"

# Decompose the epic
kanbn chat "decomposeEpic: epic-456"
```

## Troubleshooting

- **No child tasks created**: Make sure your AI service is properly configured
- **Epic not found**: Verify the epic ID is correct
- **Limited decomposition**: Try providing more context or a more detailed epic description
- **API errors**: Check your environment variables and API key configuration
