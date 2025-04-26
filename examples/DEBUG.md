# Debugging the Ollama RAG Integration Tests

This guide explains how to debug the Ollama RAG integration tests using VSCode and the bash debugger.

## Setup

1. Make sure you have the "Bash Debug" extension installed in VSCode
2. The `.vscode/launch.json` configuration is already set up
3. The test script has been instrumented with debug points

## Debug Points

The script contains 6 strategic debug points where you might want to set breakpoints:

1. **[DEBUG POINT 1] - Test initialization**
   - Directory creation and setup
   - Environment validation

2. **[DEBUG POINT 2] - Board initialization**
   - Kanbn board creation
   - Initial configuration

3. **[DEBUG POINT 3] - Task creation**
   - Creating test tasks
   - Validating task properties

4. **[DEBUG POINT 4] - Integration setup**
   - Adding game systems integration
   - Adding personality traits integration

5. **[DEBUG POINT 5] - RAG testing**
   - Testing chat functionality
   - Integration queries

6. **[DEBUG POINT 6] - Test completion**
   - Final validation
   - Summary statistics

## How to Debug

1. Open VSCode and set breakpoints by clicking in the gutter next to the debug points

2. Press F5 or select "Debug Ollama RAG Test" from the debug menu

3. Use the following debug controls:
   - Continue (F5)
   - Step Over (F10)
   - Step Into (F11)
   - Step Out (Shift+F11)

4. Watch Variables:
   - TEST_DIR
   - Environment variables
   - Command exit codes

## Debug Output

The script provides enhanced debugging information through:
- Debug messages (when DEBUG=true)
- Error tracing with stack traces
- Command failure detection
- Test summary statistics

## Environment Variables

You can modify these in the launch.json configuration:
- KANBN_ENV=test
- DEBUG=true
- KANBN_TEST_MODE=true
- KANBN_QUIET=true
- NODE_OPTIONS=--no-deprecation
- KANBN_ROOT: Path to the project root (automatically set)

### Test Environment Setup

The test scripts handle environment setup in different contexts:

1. **Local Development**
   - Uses launch.json configuration
   - Test directory created in /tmp
   - KANBN_ROOT set to current project directory

2. **Docker Tests**
   - Isolated test directory mounted as volume
   - Project files mounted at /app
   - KANBN_ROOT=/app for module resolution

3. **CI/CD Environment**
   - Test directory created per test run
   - Environment variables set via GitHub Actions
   - API keys handled via GitHub Secrets

## Common Debugging Scenarios

1. **Board Initialization Issues**
   - Set breakpoint at [DEBUG POINT 2]
   - Check .kanbn directory creation
   - Validate index.md content

2. **RAG Integration Problems**
   - Set breakpoint at [DEBUG POINT 5]
   - Monitor Ollama connection
   - Check integration responses

3. **Task Creation Errors**
   - Set breakpoint at [DEBUG POINT 3]
   - Verify task properties
   - Check column assignments
