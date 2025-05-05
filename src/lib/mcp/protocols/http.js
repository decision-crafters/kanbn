/**
 * HTTP Protocol Handler
 * Handles HTTP/HTTPS communication with MCP servers
 */

const http = require('http');
const https = require('https');
const BaseProtocolHandler = require('./base');

class HTTPProtocolHandler extends BaseProtocolHandler {
  constructor(config) {
    super(config);
    this.baseUrl = config.baseUrl || 'http://localhost:3000';
    this.client = this.baseUrl.startsWith('https') ? https : http;
    this.headers = {
      'Content-Type': 'application/json'
    };
  }

  /**
   * Initialize the protocol handler
   */
  async initialize() {
    // Verify server is reachable
    return this.checkHealth();
  }

  /**
   * Send a request to the MCP server with retry logic
   * @param {string} method The request method
   * @param {string} path The request path
   * @param {Object} data The request data
   * @returns {Promise<Object>} The response data
   */
  async request(method, path, data) {
    let lastError;
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        return await this._makeRequest(method, path, data);
      } catch (error) {
        lastError = error;
        if (attempt < this.retries) {
          // Wait before retrying, using exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }
    throw lastError;
  }

  /**
   * Make a single HTTP request
   * @private
   */
  _makeRequest(method, path, data) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        method: method.toUpperCase(),
        headers: this.headers,
        timeout: this.timeout
      };

      const req = this.client.request(url, options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const jsonData = JSON.parse(responseData);
              resolve(jsonData);
            } catch (error) {
              reject(new Error(`Invalid JSON response: ${error.message}`));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${this.timeout}ms`));
      });

      req.on('error', (error) => {
        if (!req.destroyed) {
          reject(new Error(`Request failed: ${error.message}`));
        }
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  /**
   * Check if the server is healthy
   * @returns {Promise<boolean>} True if server is healthy
   */
  async checkHealth() {
    try {
      const healthPath = this.config.healthCheck || '/health';
      await this.request('GET', healthPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Close any open connections
   */
  async close() {
    // HTTP is stateless, no connections to close
  }
}

module.exports = HTTPProtocolHandler;
