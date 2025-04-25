/**
 * Kanbn Chat Module
 * 
 * This module serves as a clean entry point to the chat functionality,
 * delegating to the modular chat-controller.
 * 
 * The chat system is composed of several modules:
 * - chat-controller.js - Main entry point with command handling
 * - ai-service.js - AI service abstraction that handles different providers
 *   (OpenRouter as default, with Ollama as fallback)
 * - project-context.js - Logic for gathering project context
 * - interactive-chat.js - Interactive chat session handling
 * - ai-logging.js - AI interaction logging
 */

/**
 * Chat commands.
 * @module controller/chat
 *
 * This module provides chat commands for interacting with the task board using natural language.
 *
 * The chat controller uses the following dependencies:
 * - chat-handler.js - Handles chat message processing
 * - prompt-loader.js - Loads system prompts for AI
 * - memory-manager.js - Manages chat memory/history
 * - ai-service.js - Service for interacting with AI models
 * - project-context.js - Provides project context to the chat
 * - ai-logging.js - AI interaction logging
 */

const ContextSerializer = require('../lib/context-serializer');
const { debugLog } = require('../utility');
const chatController = require('./chat-controller');

// Export the chat controller as the main module
module.exports = chatController;
