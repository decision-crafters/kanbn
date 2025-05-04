# AI Features in Kanbn

Kanbn includes AI-powered features to help you manage your tasks more efficiently. Version 0.13.0 introduces enhanced AI capabilities with OpenRouter and Ollama support, along with improved project memory and RAG (Retrieval-Augmented Generation) features.

> For detailed examples and usage instructions, check out the [Chat Demo](demos/chat-demo.md), [Decompose Demo](demos/decompose-demo.md), and [AI-Powered Initialization](ai-init.md).

## AI Service Integration

Kanbn now supports multiple AI service providers:

1. **OpenRouter Integration**
   - Primary AI service provider
   - Requires `OPENROUTER_API_KEY` environment variable
   - Supports various models through OpenRouter's API

2. **Ollama Support**
   - Local AI model support
   - No API key required
   - Run models locally for enhanced privacy

### Configuration

```bash
# Primary AI service (OpenRouter)
OPENROUTER_API_KEY=your_api_key_here

# Optional: Specify a different model
OPENROUTER_MODEL=google/gemma-3-4b-it:free

# Optional: Force real API calls in test environment
USE_REAL_API=true

# Optional: Ollama configuration (if using Ollama)
OLLAMA_HOST=http://localhost:11434
```

## Enhanced Project Memory System

Version 0.13.0 introduces an improved project memory system that provides:

1. **Persistent Context**: Better retention of project context across sessions
2. **RAG Capabilities**: 
   - Improved AI interactions through document retrieval
   - Better understanding of project documentation
   - More relevant and context-aware responses
3. **Enhanced State Management**:
   - Improved handling of project context
   - Better error recovery
   - More reliable state persistence

## AI-Powered Initialization

Use `kanbn init --ai` to initialize a new Kanbn board with AI assistance. The AI will:
1. Analyze your project description
2. Suggest appropriate board columns
3. Create initial tasks based on project goals
4. Set up task relationships and dependencies

## Project Management Chat

The `kanbn chat` command provides an intelligent project management assistant that:
1. Maintains conversation context across sessions
2. Understands your project's current state
3. Provides task-specific recommendations
4. Helps with task organization and prioritization
5. Leverages RAG capabilities for more informed responses

### Chat Features

- **Context-Aware Responses**: The AI assistant uses RAG to reference your project documentation and history
- **Task Management**: Create, update, and organize tasks through natural conversation
- **Project Insights**: Get AI-powered insights about project progress and bottlenecks
- **Documentation Help**: Generate and update project documentation with AI assistance

## Epic Management

Version 0.14.0 introduces AI-powered epic management to help organize complex features or major project initiatives using a structured approach:

1. **Create Epics**: Define high-level tasks or user stories via chat interface
2. **Decompose Epics**: Automatically break down epics into smaller, actionable tasks
3. **Track Epic Progress**: Monitor completion of all epic-related tasks
4. **Manage Task Relationships**: Maintain parent-child relationships between epics and subtasks

> For detailed instructions and examples, see [Epic Management](epic-management.md).

Quick example:

```bash
# Create an epic
kanbn chat "createEpic: Create a user authentication system"

# Decompose an epic into subtasks
kanbn chat "decomposeEpic: epic-123"

# List all epics
kanbn chat "listEpics"
```

## AI Task Decomposition

Break down complex tasks into manageable subtasks using `kanbn decompose --task <task-id>`. The AI will:
1. Analyze the task description and context
2. Identify logical subtasks
3. Create parent-child relationships
4. Suggest task priorities and dependencies

## AI Interaction Tracking

Kanbn automatically tracks AI interactions to:
1. Maintain conversation history
2. Record AI-suggested changes
3. Track task modifications
4. Enable review of AI decisions

### Interaction Records

Each AI interaction is logged with:
- Timestamp
- Interaction type
- Context used
- Changes made
- Task relationships affected

## Parent-Child Task Relationships

Tasks can have parent-child relationships that:
1. Affect progress calculations
2. Show task dependencies
3. Help with project organization
4. Enable better task tracking

## AI-Friendly Task Prompts

Generate AI-friendly prompts from your tasks using:
```bash
kanbn prompt --task <task-id>
```

This feature helps you:
1. Get formatted prompts for external AI tools
2. Include relevant task context
3. Maintain consistency in AI interactions
4. Leverage task relationships in prompts

## Error Handling and Recovery

Version 0.13.0 includes improved error handling for AI features:
1. Graceful fallback between AI services
2. Better error messages and recovery options
3. Automatic retry mechanisms
4. State preservation during failures

## Best Practices

1. **Environment Setup**:
   - Always set up required environment variables
   - Test AI connectivity before major operations
   - Configure fallback options when possible

2. **Project Context**:
   - Keep project documentation up-to-date
   - Use consistent task descriptions
   - Maintain clear task relationships

3. **AI Interactions**:
   - Review AI suggestions before applying
   - Keep track of AI-generated changes
   - Use specific prompts for better results

For more information about using these features, check the [documentation](README.md) or use `kanbn help` for command-specific guidance.
