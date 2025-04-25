/**
 * Ollama API Client for Kanbn
 * 
 * Provides a local LLM fallback option when OpenRouter API key is not available
 */

const axios = require('axios');
const { exec } = require('child_process');
const MemoryManager = require('./memory-manager');

class OllamaClient {
  /**
   * Create a new Ollama client
   * @param {string} model The model to use (default: llama3)
   * @param {string} baseUrl The base URL for the Ollama API
   * @param {MemoryManager} memoryManager Optional memory manager
   */
  constructor(model = 'llama3', baseUrl = 'http://localhost:11434', memoryManager = null) {
    this.model = model;
    this.baseUrl = baseUrl;
    this.memoryManager = memoryManager;
  }

  /**
   * Check if Ollama is available
   * @returns {Promise<boolean>} True if Ollama is available, false otherwise
   */
  async isAvailable() {
    try {
      // Check if Ollama is running by making a simple request
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 2000 // 2 second timeout
      });
      
      // If we get a response, check if the requested model is available
      if (response.status === 200 && response.data && response.data.models) {
        const modelAvailable = response.data.models.some(m => m.name === this.model);
        if (!modelAvailable) {
          // Only show warning if not in quiet mode
          if (process.env.KANBN_QUIET !== 'true') {
            console.warn(`Ollama is available but model '${this.model}' is not installed. Using default model.`);
          }
          // Find the first available model
          if (response.data.models.length > 0) {
            this.model = response.data.models[0].name;
            console.info(`Using model: ${this.model}`);
          }
        }
        return true;
      }
      return false;
    } catch (error) {
      // If we get a connection error, Ollama is likely not running
      console.debug('Ollama is not available:', error.message);
      return false;
    }
  }

  /**
   * Generate a completion from Ollama
   * @param {Array} messages The messages to send to Ollama
   * @param {Function} streamCallback Optional callback for streaming responses
   * @returns {Promise<string>} The completion
   */
  async chatCompletion(messages, streamCallback = null) {
    try {
      // Check if Ollama is available
      const available = await this.isAvailable();
      if (!available) {
        throw new Error('Ollama is not available. Make sure it is installed and running.');
      }

      // Prepare the request body
      const requestBody = {
        model: this.model,
        messages: messages,
        stream: !!streamCallback
      };

      if (streamCallback) {
        // If streaming is requested, handle it with a proper stream
        const response = await axios.post(
          `${this.baseUrl}/api/chat`,
          requestBody,
          {
            responseType: 'stream'
          }
        );

        let fullContent = '';
        return new Promise((resolve, reject) => {
          response.data.on('data', (chunk) => {
            try {
              const lines = chunk.toString().split('\n').filter(line => line.trim());
              for (const line of lines) {
                const data = JSON.parse(line);
                if (data.message?.content) {
                  fullContent += data.message.content;
                  if (streamCallback) streamCallback(data.message.content);
                }
              }
            } catch (error) {
              console.error('Error parsing streaming response:', error);
            }
          });

          response.data.on('end', () => {
            // Update memory if available
            if (this.memoryManager) {
              this.memoryManager.addMessage('assistant', fullContent, 'chat')
                .catch(error => console.error('Error adding assistant message to memory:', error));
            }
            
            resolve(fullContent);
          });

          response.data.on('error', (error) => {
            reject(error);
          });
        });
      } else {
        // For non-streaming requests
        const response = await axios.post(`${this.baseUrl}/api/chat`, requestBody);
        
        if (response.data && response.data.message && response.data.message.content) {
          // Update memory if available
          if (this.memoryManager) {
            await this.memoryManager.addMessage('assistant', response.data.message.content, 'chat');
          }
          
          return response.data.message.content;
        } else {
          throw new Error('Invalid response from Ollama');
        }
      }
    } catch (error) {
      console.error('Error in Ollama API:', error);
      throw error;
    }
  }

  /**
   * Get the models available in Ollama
   * @returns {Promise<Array>} The available models
   */
  async getAvailableModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      if (response.status === 200 && response.data && response.data.models) {
        return response.data.models.map(m => m.name);
      }
      return [];
    } catch (error) {
      console.error('Error getting Ollama models:', error);
      return [];
    }
  }
}

module.exports = OllamaClient;
