# Changelog

All notable changes to this project will be documented in this file.

## [0.14.0] - 2025-05-03

### Added
- Added IPv4 compatibility mode for Ollama connections to improve container environment reliability
- Added detailed debugging for Ollama connectivity in container environments
- Enhanced test scripts with better error handling and diagnostic output
- Added automatic fallback to hash-based embeddings when using OpenRouter

### Fixed
- Fixed IPv6/IPv4 connectivity issues with Ollama in container environments
- Fixed module import error in integrations controller
- Improved Docker network configuration for better host-container communication
- Enhanced error handling in CI/CD workflows to properly fail on test errors
- Fixed "Error creating vector store: fetch failed" when using OpenRouter with integrations
- Fixed RAG manager to prioritize hash-based embeddings when OpenRouter is configured

### Changed
- Updated Ollama client to explicitly use IPv4 addresses for all API calls
- Improved test scripts to better handle Ollama connectivity issues
- Enhanced CI/CD workflow to provide more detailed diagnostic information
- Improved vector store creation with better error handling and fallback mechanisms

## [0.13.0] - 2025-05-05

### Added
- Added Ollama as a model option in the bootstrap process with qwen3 as the default model
- Added repository context integration test script for better testing of AI context awareness
- Added repository context test to GitHub workflow for automated testing

### Fixed
- Fixed duplicate response issue in chat-controller.js by removing direct console.log
- Improved integration testing scripts to properly test repository context awareness
- Enhanced test scripts for Docker, Ollama, and OpenRouter RAG integrations

### Changed
- Updated bootstrap.sh to offer Ollama as an alternative to OpenRouter
- Improved test scripts to add repository content as integrations
- Enhanced GitHub workflow to include repository context testing

## [0.12.0] - 2025-04-27

### Added
- Enhanced AI integration with OpenRouter and Ollama support
- Improved test infrastructure and coverage
- Added comprehensive test documentation
- Added community contribution guidelines for testing
- Added architecture diagrams and documentation improvements
- Enhanced project memory system
- Added RAG capabilities for improved AI interactions

### Changed
- Updated dependencies to latest versions
- Improved error handling in AI service integrations
- Enhanced test environment configuration
- Improved documentation structure and organization

### Fixed
- Resolved AI service integration issues
- Fixed test environment setup and cleanup
- Improved task management function reliability
- Enhanced project context handling
- Fixed environment variable management

## [0.11.1] - 2023-06-20

### Added
- Added `--api-key` option to chat command for specifying OpenRouter API key directly
- Added `--model` option to chat command for specifying OpenRouter model to use
- Added streaming responses to chat functionality for better user experience
- Added model information display in chat output
- Added comprehensive tests for streaming responses and model selection
- Added centralized OpenRouter configuration module for consistent settings
- Added OpenRouterClient class to encapsulate API communication
- Added dedicated API key verification script
- Added response validation to OpenRouter API tests
- Added comprehensive tests for chat command with various options

### Fixed
- Fixed circular dependency issue with eventBus in chat module
- Fixed "Cannot read properties of undefined (reading 'join')" error in tag filtering
- Fixed chat functionality to properly use OpenRouter API when API key is set
- Added comprehensive event communication tests
- Improved test coverage for event emission and handling
- Fixed environment variable loading from .env files
- Improved API key validation and error reporting

## [0.11.0] - 2023-06-15

### Added
- Added task references feature to store URLs and external resources
- Added CLI commands for adding, removing, and managing references
- Added support for including references in AI features (chat and decompose)
- Added comprehensive test suite for references feature

## [0.10.9] - 2025-04-20

### Fixed
- Fixed issues with Kanbn constructor in controller files
- Updated version references in package.json and package-lock.json
- Improved error handling in controller files

### Changed
- Updated dependencies to latest versions
- Improved code organization and structure

## [0.10.8] - Previous version

Initial release with basic functionality.
