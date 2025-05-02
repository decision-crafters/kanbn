# Kanbn Testing Documentation

## Overview
This document outlines the testing infrastructure, known issues, and best practices for running and maintaining tests in the Kanbn project.

## Test Environment Setup

### Environment Variables
- `KANBN_ENV=test`: Required for proper test execution
- `OPENROUTER_API_KEY`: Required for AI service integration tests
- Additional environment variables should be defined in `.env.test`

### Directory Structure
```
kanbn/
├── test/
│   ├── unit/           # Unit test files
│   ├── integration/    # Integration test files
│   └── fixtures/       # Test fixtures and mock data
├── scripts/
│   └── run-tests.js    # Centralized test runner
└── .env.test           # Test environment configuration
```

### Mock Configurations
1. File System Mocks
   - Test directory creation/cleanup
   - Mock filesystem structure verification
   - Index file access simulation

2. AI Service Mocks
   - OpenRouter API response mocks
   - Ollama fallback simulation
   - AI service availability checks

## Known Test Issues

### 1. AI Service Integration
- **OpenRouter API Authentication**
  - Issue: Authentication failures despite valid API key
  - Impact: AI-related tests fail intermittently
  - Workaround: Use mock responses in test mode

- **Ollama Fallback System**
  - Issue: Fallback mechanism not working properly
  - Impact: Tests fail when OpenRouter is unavailable
  - Workaround: Ensure proper error handling in AI service tests

### 2. Project Context and File System
- **Index File Access**
  - Issue: Errors accessing index files in test environment
  - Impact: Task management tests fail
  - Workaround: Initialize proper file structure before tests

- **Mock Filesystem**
  - Issue: Verification failures in mock filesystem
  - Impact: File operation tests unreliable
  - Workaround: Standardize mock filesystem setup

### 3. Task Management Functions
- **Task Creation**
  - Issue: Failures in test environment
  - Impact: Core functionality tests affected
  - Workaround: Ensure proper board initialization

- **Event Handling**
  - Issue: Inconsistencies in event propagation
  - Impact: State management tests unreliable
  - Workaround: Mock event system in tests

### 4. Environment Configuration
- **Variable Loading**
  - Issue: Inconsistent environment variable handling
  - Impact: Configuration-dependent tests fail
  - Workaround: Explicitly set required variables

- **Test Mode**
  - Issue: Configuration issues in test mode
  - Impact: Inconsistent test behavior
  - Workaround: Verify test mode settings

## Test Categories

### Unit Tests
- **Coverage**: Core functionality components
- **Location**: `test/unit/`
- **Runner**: `npm run test:unit`
- **Current Status**: 
  - Task management tests: Partially passing
  - Board operations: Stable
  - Utility functions: Good coverage

### Integration Tests
- **Coverage**: Component interactions
- **Location**: `test/integration/`
- **Runner**: `npm run test:integration`
- **Current Status**:
  - AI service integration: Needs improvement
  - File system operations: Partially stable
  - Event system: Needs review

### End-to-End Tests
- **Coverage**: Full workflow scenarios
- **Location**: `test/e2e/`
- **Runner**: `npm run test:e2e`
- **Current Status**:
  - Basic workflows: Implemented
  - Complex scenarios: Need development
  - AI features: Partial coverage

## Running Tests

### Basic Commands
```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with debug output
DEBUG=true npm test
```

### Best Practices
1. Always run tests in isolation
2. Set up required environment variables
3. Use mock data for external services
4. Clean up test artifacts after runs

## Contributing to Tests
1. Follow the test file naming convention: `*.test.js`
2. Add test cases for new features
3. Update mocks when adding external dependencies
4. Document test requirements and setup

## Future Improvements
1. Enhance AI service test coverage
2. Implement better mock systems
3. Add more end-to-end test scenarios
4. Improve test runner configuration 