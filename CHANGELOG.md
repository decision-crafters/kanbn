# Changelog

All notable changes to this project will be documented in this file.

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
