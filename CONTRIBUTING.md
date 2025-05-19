# Contributing to Kanbn

Thank you for your interest in contributing to Kanbn! We're excited to welcome you to our community. This guide will help you understand how you can contribute to improving our testing infrastructure and overall project quality.

## Project Overview

Kanbn is a command-line task management tool with AI capabilities. It helps teams manage tasks, track progress, and maintain project documentation effectively. The project uses:

- Node.js for the core functionality
- AI integration through OpenRouter API
- Local AI support via Ollama
- Comprehensive test suite for reliability

### Current Testing Infrastructure

Our testing setup includes:
- Unit tests for core components
- Integration tests for service interactions
- End-to-end tests for workflow validation
- Custom test runner (`scripts/run-tests.js`)

### Known Challenges

We've identified several areas where we need community help:
1. AI Service Integration Testing
2. Test Environment Management
3. Mock System Implementation
4. Test Coverage Expansion

## Contribution Opportunities

### 1. Test Infrastructure Improvements

#### High Priority
- Environment variable handling
- Test directory management
- AI service integration
- Project context handling

#### Medium Priority
- Mock system implementation
- Task management functions
- Configuration management
- Integration test coverage

#### Low Priority
- End-to-end testing
- Performance testing
- Documentation improvements

### 2. Test Coverage Expansion

Help us improve our test coverage by:
- Adding missing test cases
- Implementing edge case scenarios
- Creating integration tests
- Developing end-to-end tests

### 3. Documentation Enhancements

Contribute to our testing documentation:
- Test setup guides
- Troubleshooting guides
- Best practices documentation
- Example test cases

## Getting Started

### Development Environment Setup

1. **Prerequisites**
   ```bash
   # Required software
   - Node.js 18 or higher (LTS version recommended)
   - Git
   - npm or yarn
   ```

2. **Repository Setup**
   ```bash
   # Clone the repository
   git clone https://github.com/your-username/kanbn.git
   cd kanbn

   # Install dependencies
   npm install

   # Set up test environment
   cp .env.test.example .env.test
   ```

3. **Environment Configuration**
   - Set `KANBN_ENV=test` for test execution
   - Configure `OPENROUTER_API_KEY` for AI tests
   - Review other required variables in `.env.test`

### Running Tests

```bash
# Run all tests (Jest and legacy QUnit)
npm run test:all

# Run Jest tests (recommended)
npm run test:jest

# Run Jest unit tests
npm run test:jest:unit

# Run Jest integration tests
npm run test:jest:integration

# Run Jest tests with coverage report
npm run test:jest:coverage

# Run Jest tests in watch mode (development)
npm run test:jest:watch

# Run legacy QUnit tests (will be deprecated)
npm test
npm run test:unit
npm run test:integration

# Run MCP server tests
npm run test:mcp
npm run test:mcp:resources
npm run test:mcp:tools

# Run with debug output
DEBUG=true npm test
```

## Contribution Guidelines

### 1. Test File Organization
- Place unit tests in `test/unit/`
- Place integration tests in `test/integration/`
- Place end-to-end tests in `test/e2e/`
- Place MCP tests in `test/mcp/`
- Use `*.test.js` naming convention for all test files
- Jest is the preferred testing framework for new tests

### 2. Writing Tests
- Use Jest for new tests (`describe`, `test`, `expect` syntax)
- Follow existing test patterns
- Include clear test descriptions
- Add comments for complex logic
- Use appropriate assertions
- Group related tests in describe blocks
- Use beforeEach/afterEach for test setup and teardown

### 3. Test Quality Standards
- Ensure tests are isolated
- Mock external dependencies
- Handle asynchronous operations
- Clean up test artifacts

### 4. Documentation Requirements
- Update test documentation
- Add test case descriptions
- Document any new test utilities
- Include setup instructions

## Submission Process

1. **Fork and Clone**
   - Fork the repository
   - Clone your fork locally
   - Create a feature branch

2. **Development**
   - Write your tests
   - Update documentation
   - Run the test suite
   - Make necessary adjustments

3. **Pull Request**
   - Submit a pull request
   - Describe your changes
   - Reference related issues
   - Await review feedback

## Need Help?

- Review existing test files for examples
- Check our [testing documentation](docs/testing.md)
- Review our [test improvements plan](docs/test-improvements.md)
- Join our community discussions
- Ask questions in issues

## Recognition

Contributors will be:
- Credited in release notes
- Added to contributors list
- Recognized in documentation
- Appreciated by the community

Thank you for helping make Kanbn better! Your contributions to our testing infrastructure are valuable and appreciated.

## Development Process

- Work on feature branches, not directly on `main`
- Keep pull requests focused on a single change
- Write clear commit messages explaining the "why" behind changes
- Follow existing code style and formatting conventions
- Add tests for new features or bug fixes
- Update documentation as needed

## Pull Request Process

1. Fill out the pull request template completely
2. Update the README.md with details of significant changes
3. Add any new dependencies to package.json
4. The PR will be merged once you have the approval of maintainers

## Coding Standards

- Use consistent indentation (2 spaces)
- Follow JavaScript Standard Style
- Write clear, descriptive variable and function names
- Comment complex code sections
- Keep functions focused and modular

## Testing

- Write unit tests for new functionality
- Ensure all tests pass before submitting PRs
- Follow existing test patterns
- Include both positive and negative test cases

## Documentation

- Update documentation for new features
- Write clear, concise documentation
- Include code examples where appropriate
- Check for spelling and grammar

## Community Guidelines

- Be respectful and inclusive
- Welcome newcomers
- Help others learn and grow
- Provide constructive feedback
- Follow our Code of Conduct

## Questions or Problems?

Feel free to:
- Open an issue for questions or problems
- Join discussions in existing issues
- Reach out to maintainers if you need help

## License

By contributing to Kanbn, you agree that your contributions will be licensed under the project's license.

Thank you for contributing to Kanbn!
