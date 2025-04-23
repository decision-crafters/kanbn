/**
 * OpenRouter API client
 * Handles all communication with the OpenRouter API
 */

const fetch = require('node-fetch');
const axios = require('axios');
const openRouterConfig = require('../config/openrouter');

class OpenRouterClient {
  /**
   * Create a new OpenRouterClient
   * @param {string|null} apiKeyOverride Optional API key override
   * @param {string|null} modelOverride Optional model override
   */
  constructor(apiKeyOverride = null, modelOverride = null) {
    this.apiKey = openRouterConfig.getApiKey(apiKeyOverride);
    this.model = openRouterConfig.getModel(modelOverride);
    this.useStreaming = openRouterConfig.useStreaming();
    this.baseUrl = openRouterConfig.getApiBaseUrl();
  }

  /**
   * Validate that the client has a valid API key
   * @throws {Error} If the API key is not found
   */
  validateApiKey() {
    return openRouterConfig.validateApiKey(this.apiKey);
  }

  /**
   * Get the API headers
   * @returns {Object} The headers to use for API requests
   */
  getHeaders() {
    return openRouterConfig.getApiHeaders(this.apiKey);
  }

  /**
   * Send a chat completion request to the OpenRouter API
   * @param {Array} messages The messages to send
   * @param {Function} onChunk Optional callback for streaming responses
   * @returns {Promise<string>} The response content
   */
  async chatCompletion(messages, onChunk = null) {
    this.validateApiKey();
    
    // Log which model is being used
    console.log(`Making API call to OpenRouter using model: ${this.model}...`);
    
    // Debug log to verify API key is being used (only show prefix for security)
    if (this.apiKey) {
      console.log(`API call using key: ${this.apiKey.substring(0, 5)}... (${this.apiKey.length} chars)`);
    }

    if (this.useStreaming && onChunk) {
      return this.streamingChatCompletion(messages, onChunk);
    } else {
      return this.standardChatCompletion(messages);
    }
  }

  /**
   * Send a streaming chat completion request
   * @param {Array} messages The messages to send
   * @param {Function} onChunk Callback for each chunk of the response
   * @returns {Promise<string>} The full response content
   */
  async streamingChatCompletion(messages, onChunk) {
    console.log('Using streaming response...');

    // Use fetch for streaming
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Append new chunk to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines from buffer
        while (true) {
          const lineEnd = buffer.indexOf('\n');
          if (lineEnd === -1) break;

          const line = buffer.slice(0, lineEnd).trim();
          buffer = buffer.slice(lineEnd + 1);

          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0].delta.content;
              if (content) {
                onChunk(content);
                fullContent += content;
              }
            } catch (e) {
              // Ignore invalid JSON
            }
          }
        }
      }

      return fullContent;
    } finally {
      reader.cancel();
    }
  }

  /**
   * Send a standard (non-streaming) chat completion request
   * @param {Array} messages The messages to send
   * @returns {Promise<string>} The response content
   */
  async standardChatCompletion(messages) {
    console.log('Using standard (non-streaming) response...');
    
    // Use axios for non-streaming response
    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: this.model,
        messages: messages
      },
      {
        headers: this.getHeaders()
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * Test the API key with a simple request
   * @returns {Promise<boolean>} True if the API key is valid
   */
  async testApiKey() {
    try {
      this.validateApiKey();
      
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [{ role: 'user', content: 'Hello' }]
        },
        {
          headers: this.getHeaders()
        }
      );
      
      return response.data && response.data.choices && response.data.choices.length > 0;
    } catch (error) {
      console.error('Error testing API key:', error.message);
      return false;
    }
  }
}

module.exports = OpenRouterClient;
