/**
 * AI Service Module
 *
 * Provides an abstraction layer for AI services (OpenRouter, Ollama)
 * with automatic fallback and error handling
 */

const fs = require('fs');
const path = require('path');
const { OpenRouterClient } = require('../ai');
const { normaliseAiError, RateLimitError } = require('../errors/AiError');
const { OllamaClient } = require('../ai');
const utility = require('../utility');

class AIService {
  /**
   * Create a new AI Service
   * @param {Object} options Configuration options
   * @param {string} options.apiKey OpenRouter API key (optional if using Ollama)
   * @param {string} options.model OpenRouter model to use
   * @param {string} options.ollamaModel Ollama model to use
   * @param {string} options.ollamaUrl Ollama API URL
   */
  constructor(options = {}) {
    // Force IPv4 by replacing localhost with 127.0.0.1 in Ollama URL
    let ollamaUrl = options.ollamaUrl || process.env.OLLAMA_HOST || process.env.OLLAMA_URL || 'http://localhost:11434';
    ollamaUrl = ollamaUrl.replace('localhost', '127.0.0.1');

    this.options = {
      apiKey: options.apiKey || process.env.OPENROUTER_API_KEY || null,
      model: options.model || process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo',
      ollamaModel: options.ollamaModel || process.env.OLLAMA_MODEL || '',
      ollamaUrl: ollamaUrl
    };

    // Debug mode flag
    this.debug = process.env.DEBUG === 'true';

    if (this.debug) {
      console.debug(`Using Ollama URL: ${this.options.ollamaUrl}`);
    }

    // Create clients
    if (this.options.apiKey) {
      this.openRouterClient = new OpenRouterClient(this.options.apiKey, this.options.model);
    }

    this.ollamaClient = new OllamaClient(this.options.ollamaModel, this.options.ollamaUrl);
  }

  /**
   * Log debug messages when debug mode is enabled
   * @param {string} message Debug message to log
   */
  debugLog(message) {
    utility.debugLog(message);
  }

  /**
   * Chat completion with automatic fallback
   * @param {Array} messages Array of message objects with role and content
   * @param {Object} options Additional options
   * @param {Function} options.streamCallback Optional callback for streaming responses
   * @param {Function} options.logCallback Optional callback for logging
   * @returns {Promise<string>} AI response
   */
  async chatCompletion(messages, options = {}) {


    // helper with simple exponential back-off for rate-limit
    const execWithRetry = async (fn) => {
      let delay = 500;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          return await fn();
        } catch (err) {
          const aiErr = normaliseAiError(err);
          if (aiErr instanceof RateLimitError && attempt < 2) {
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
            continue;
          }
          throw aiErr;
        }
      }
    };


    // Try OpenRouter first if API key is available
    if (this.options.apiKey) {
      try {
        if (logCallback) logCallback('request', { service: 'openrouter', model: this.options.model, messages });
        this.debugLog('Attempting to use OpenRouter API...');

        const response = await this.openRouterClient.chatCompletion(messages, streamCallback);

        if (logCallback) logCallback('response', { service: 'openrouter', response });
        return response;
      } catch (error) {
        this.debugLog(`OpenRouter API failed, trying Ollama: ${error.message}`);
      }
    }

    // Try Ollama as fallback
    try {
      // Check if Ollama is available
      const ollamaAvailable = await this.ollamaClient.isAvailable();
      if (!ollamaAvailable) {
        throw new Error('Ollama is not available. Please ensure Ollama is installed and running.');
      }

      if (logCallback) logCallback('request', { service: 'ollama', model: this.options.ollamaModel, messages });
      console.log(`Using Ollama with model: ${this.options.ollamaModel}`);

      const response = await this.ollamaClient.chatCompletion(messages, streamCallback);

      if (logCallback) logCallback('response', { service: 'ollama', response });
      return response;
    } catch (error) {
      console.error('Error using Ollama:', error);

      // If both OpenRouter and Ollama fail, provide a clear error message
      throw new Error(
        'AI services are not available. Please ensure either:\n' +
        '1. Set OPENROUTER_API_KEY environment variable, or\n' +
        '2. Install and run Ollama (https://ollama.com)\n' +
        '\nError details: ' + error.message
      );
    }
  }

  /**
   * Save conversation history
   * @param {string} boardFolder The board folder path
   * @param {string} conversationId Conversation ID
   * @param {Array} history Conversation history
   * @param {Object} userMessage User message to add to history
   * @param {string} response AI response to add to history
   */
  async saveConversationHistory(boardFolder, conversationId, history, userMessage, response) {
    try {
      // Add messages to history
      history.push(userMessage);
      history.push({
        role: 'assistant',
        content: response
      });

      // Keep only the last 20 messages
      if (history.length > 20) {
        history = history.slice(history.length - 20);
      }

      // Save conversation history
      const conversationDir = path.join(boardFolder, '.kanbn', 'conversations');
      if (!fs.existsSync(conversationDir)) {
        fs.mkdirSync(conversationDir, { recursive: true });
      }

      fs.writeFileSync(
        path.join(conversationDir, `${conversationId}.json`),
        JSON.stringify(history, null, 2)
      );

      return history;
    } catch (error) {
      console.error(`Error saving conversation history for ${conversationId}:`, error);
      return history;
    }
  }

  /**
   * Load conversation history
   * @param {string} boardFolder The board folder path
   * @param {string} conversationId Conversation ID
   * @returns {Array} Conversation history
   */
  loadConversationHistory(boardFolder, conversationId) {
    try {
      const conversationFile = path.join(boardFolder, '.kanbn', 'conversations', `${conversationId}.json`);
      if (fs.existsSync(conversationFile)) {
        const conversationData = fs.readFileSync(conversationFile, 'utf8');
        return JSON.parse(conversationData);
      }
      return [];
    } catch (error) {
      console.error(`Error loading conversation history for ${conversationId}:`, error);
      return [];
    }
  }
}

module.exports = AIService;
