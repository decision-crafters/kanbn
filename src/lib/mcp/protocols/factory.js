/**
 * Protocol Factory
 * Creates and manages protocol handlers for MCP servers
 */

const debug = require('debug')('kanbn:mcp:factory');
const HTTPProtocolHandler = require('./http');

class ProtocolFactory {
  constructor() {
    this.handlers = new Map();
  }

  /**
   * Get or create a protocol handler for a server
   * @param {string} serverName Name of the server
   * @param {Object} config Server configuration
   * @returns {BaseProtocolHandler} Protocol handler instance
   */
  getHandler(serverName, config) {
    if (this.handlers.has(serverName)) {
      return this.handlers.get(serverName);
    }

    const protocol = config.protocol || 'http';
    let handler;

    switch (protocol) {
      case 'http':
      case 'https':
        handler = new HTTPProtocolHandler(config);
        break;
      case 'websocket':
        // TODO: Implement WebSocket handler
        throw new Error('WebSocket protocol not yet implemented');
      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }

    this.handlers.set(serverName, handler);
    debug('Created protocol handler:', serverName, protocol);
    return handler;
  }

  /**
   * Close all protocol handlers
   */
  async closeAll() {
    for (const [serverName, handler] of this.handlers) {
      debug('Closing handler:', serverName);
      await handler.close();
    }
    this.handlers.clear();
  }
}

module.exports = ProtocolFactory;
