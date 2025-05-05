/**
 * Base Protocol Handler
 * Abstract base class for MCP protocol implementations
 */

class BaseProtocolHandler {
  constructor(config) {
    this.config = config;
    this.retries = config.retries || 3;
    this.timeout = config.timeout || 30000;
  }

  /**
   * Initialize the protocol handler
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Send a request to the MCP server
   * @param {string} _method The request method
   * @param {string} _path The request path
   * @param {Object} _data The request data
   * @returns {Promise<Object>} The response data
   */
  async request(_method, _path, _data) {
    throw new Error('request() must be implemented by subclass');
  }

  /**
   * Check if the server is healthy
   * @returns {Promise<boolean>} True if server is healthy
   */
  async checkHealth() {
    throw new Error('checkHealth() must be implemented by subclass');
  }

  /**
   * Close any open connections
   */
  async close() {
    throw new Error('close() must be implemented by subclass');
  }
}

module.exports = BaseProtocolHandler;
