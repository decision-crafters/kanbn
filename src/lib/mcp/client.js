/**
 * MCP Client Manager
 * Manages MCP server configurations, lifecycle, and communication
 */

const debug = require('debug')('kanbn:mcp');
const path = require('path');
const { spawn } = require('child_process');
const mcpServerSchema = require('./schema');

class MCPClient {
  constructor() {
    this.servers = new Map();
    this.config = null;
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

    this.servers.set(serverName, server);
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

    // TODO: Wait for server to be ready (health check)
    return server;
  }

  /**
   * Stop an MCP server
   * @param {string} serverName Name of the server to stop
   */
  async stopServer(serverName) {
    const server = this.servers.get(serverName);
    if (server) {
      server.kill();
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
  }
}

module.exports = MCPClient;
