# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Testing
- `npm test` - Run all Jest tests
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests only
- `npm run test:jest` - Run Jest test suite
- `npm run test:jest-watch` - Run Jest in watch mode
- `npm run test:all` - Run comprehensive test suite including AI features

### Special Test Commands
- `npm run test:real` - Run real filesystem tests
- `npm run test:ai-init` - Test AI initialization features
- `npm run test:events` - Test event bus and chat events

### Linting and Validation
- `npm run lint` - Currently outputs "No linting configured" (no actual linting setup)
- Use `kanbn validate` to validate kanbn board structure and task files

### Documentation
- `npm run docs` - Serve documentation locally
- `npm run docs:install` - Install docsify for documentation

## Architecture Overview

### Core System Design
Kanbn is a CLI-based Kanban board tool that stores data in markdown files with AI-powered features. The system follows a modular architecture:

**Main Entry Points:**
- `bin/kanbn` - CLI executable that delegates to `index.js`
- `index.js` - Main application bootstrapper with environment setup
- `src/main.js` - Core Kanbn class and business logic

**Command Architecture:**
- `routes/*.json` - Command route definitions
- `src/controller/` - Command controllers (add, edit, move, chat, etc.)
- Commands are auto-loaded via the `auto-load` package

### Data Storage
- **Index file**: `.kanbn/index.md` - Central board configuration and task references
- **Task files**: `.kanbn/tasks/*.md` - Individual task data in markdown format  
- **Archive**: `.kanbn/archive/*.md` - Archived tasks
- **Configuration**: `kanbn.yml` or `kanbn.json` - Optional separate config files

### AI Integration Architecture
The AI system uses a modular, provider-agnostic design:

**Core AI Components:**
- `src/lib/ai-service.js` - Main AI service abstraction with OpenRouter/Ollama fallback
- `src/lib/openrouter-client.js` - OpenRouter API client
- `src/lib/ollama-client.js` - Local Ollama client
- `src/controller/chat.js` & `src/controller/chat-controller.js` - Chat command handling

**AI Features:**
- **Epic Management**: Create and decompose large tasks into subtasks
- **Task Decomposition**: Break down tasks using AI analysis
- **Interactive Chat**: Natural language project management assistant
- **RAG Integration**: Web content integration via `src/lib/rag-manager.js`

**AI Support Libraries:**
- `src/lib/project-context.js` - Gather project context for AI
- `src/lib/memory-manager.js` - Chat history management
- `src/lib/ai-logging.js` - AI interaction logging
- `src/lib/prompt-loader.js` - System prompt management

### Key Utility Modules
- `src/lib/task-utils.js` - Task manipulation utilities
- `src/lib/index-utils.js` - Index file operations
- `src/lib/file-utils.js` - File system operations
- `src/lib/filter-utils.js` & `src/lib/status-utils.js` - Data processing utilities
- `src/lib/event-bus.js` - Event system for chat and AI interactions

### Configuration
Environment variables for AI features:
- `OPENROUTER_API_KEY` - OpenRouter API key (primary AI provider)
- `OPENROUTER_MODEL` - Model selection (default: openai/gpt-3.5-turbo)  
- `USE_OLLAMA=true` - Use local Ollama instead of OpenRouter
- `OLLAMA_HOST` - Ollama API URL (default: http://localhost:11434)
- `OLLAMA_MODEL` - Ollama model name

### Testing Framework
The project uses Jest as the testing framework after migrating from QUnit. Test files are organized in:
- `test/unit/` - Unit tests
- `test/integration/` - Integration tests
- `test/fixtures.js` - Test data and mocking utilities
- `test/jest.setup.js` - Jest configuration and setup

**Test Utilities:**
- Mock filesystem using `mock-fs`
- Mock AI services for testing
- Real filesystem tests in `test/real-fs-fixtures/`

### Development Notes
- The codebase supports both interactive and non-interactive modes
- Tasks are identified by slugified names as IDs
- The system supports custom fields, sprints, and burndown charts
- All dates and metadata are stored in task frontmatter
- The CLI supports help for all commands via `kanbn help <command>`