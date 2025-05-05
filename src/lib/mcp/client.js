/**
 * MCP Client Manager
 * Manages MCP server configurations, lifecycle, and communication
 */

const debug = require('debug')('kanbn:mcp');
const path = require('path');
const { spawn } = require('child_process');
const mcpServerSchema = require('./schema');
const ProtocolFactory = require('./protocols/factory');

class MCPClient {
  constructor() {
    this.servers = new Map();
    this.config = null;
    this.protocolFactory = new ProtocolFactory();
  }

  /**
   * Load MCP server configurations from kanbn.json
   * @param {Object} config Configuration object from kanbn.json
   */
  async loadConfig(config) {
    // Validate config against schema
    this.validateConfig(config);
    
    this.config = config;
    debug('Loaded MCP configuration:', config);
  }

  /**
   * Validate MCP server configuration
   * @param {Object} config Configuration to validate
   * @throws {Error} If configuration is invalid
   */
  validateConfig(config) {
    // TODO: Implement JSON schema validation
    if (!config.mcpServers) {
      throw new Error('No MCP servers configured');
    }
  }

  /**
   * Start an MCP server
   * @param {string} serverName Name of the server to start
   */
  async startServer(serverName) {
    if (!this.config?.mcpServers?.[serverName]) {
      throw new Error(`MCP server "${serverName}" not found in configuration`);
    }

    const serverConfig = this.config.mcpServers[serverName];
    debug('Starting MCP server:', serverName, serverConfig);

    // Resolve environment variables
    const env = {};
    if (serverConfig.env) {
      for (const [key, value] of Object.entries(serverConfig.env)) {
        if (value.startsWith('${') && value.endsWith('}')) {
          const envVar = value.slice(2, -1);
          env[key] = process.env[envVar];
        } else {
          env[key] = value;
        }
      }
    }

    // Start the server process
    const server = spawn(serverConfig.command, serverConfig.args, {
      env: { ...process.env, ...env },
      stdio: 'pipe'
    });

    this.servers.set(serverName, {
      process: server,
      handler: this.protocolFactory.getHandler(serverName, serverConfig)
    });

    debug('Started MCP server:', serverName);

    // Handle server output
    server.stdout.on('data', (data) => {
      debug(`[${serverName}] stdout:`, data.toString());
    });

    server.stderr.on('data', (data) => {
      debug(`[${serverName}] stderr:`, data.toString());
    });

    server.on('close', (code) => {
      debug(`[${serverName}] exited with code ${code}`);
      this.servers.delete(serverName);
    });

    // Initialize protocol handler and wait for server to be ready
    const handler = this.servers.get(serverName).handler;
    await handler.initialize();

    return server;
  }

  /**
   * Send a request to an MCP server
   * @param {string} serverName Name of the server
   * @param {string} method HTTP method
   * @param {string} path Request path
   * @param {Object} data Request data
   * @returns {Promise<Object>} Response data
   */
  async request(serverName, method, path, data) {
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`MCP server "${serverName}" not running`);
    }

    return server.handler.request(method, path, data);
  }

  /**
   * Stop an MCP server
   * @param {string} serverName Name of the server to stop
   */
  async stopServer(serverName) {
    const server = this.servers.get(serverName);
    if (server) {
      if (server.handler) {
        await server.handler.close();
      }
      server.process.kill();
      this.servers.delete(serverName);
      debug('Stopped MCP server:', serverName);
    }
  }

  /**
   * Stop all running MCP servers
   */
  async stopAll() {
    for (const serverName of this.servers.keys()) {
      await this.stopServer(serverName);
    }
    await this.protocolFactory.closeAll();
  }
}

module.exports = MCPClient;
