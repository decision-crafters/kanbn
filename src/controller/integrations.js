/**
 * Kanbn Integrations Controller
 *
 * Manages integration markdown files and MCP servers for enhancing AI context
 */

const utility = require('../utility');
const chalk = require('chalk');
const path = require('path');
const RAGManager = require('../lib/rag-manager');
const MCPClient = require('../lib/mcp/client');

// Use a more compatible approach for terminal colors
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`
};

// MCP server instance
let mcpClient = null;

/**
 * Get or create MCP client
 * @param {string} boardFolder Path to Kanbn board folder
 * @returns {Promise<MCPClient>} MCP client instance
 */
async function getMCPClient(boardFolder) {
  if (!mcpClient) {
    mcpClient = new MCPClient();
    
    // Load config from kanbn.json
    const configPath = path.join(boardFolder, 'kanbn.json');
    let config;
    try {
      config = require(configPath);
    } catch (error) {
      config = { mcpServers: {} };
    }
    
    await mcpClient.loadConfig(config);
  }
  return mcpClient;
}

/**
 * Main integrations controller module
 * @param {Object} args Command arguments
 * @returns {Promise<string>} Command result
 */
module.exports = async args => {
  try {
    // Debug the args object to help diagnose issues
    if (process.env.DEBUG === 'true') {
      console.log('[DEBUG] Integrations controller args:', JSON.stringify(args));
    }
    
    // Fix for Docker container: Check if this is the 'list' command based on args._ 
    // This handles the case when args.list isn't properly set
    if (args._.includes('list') && !args.list) {
      args.list = true;
      if (process.env.DEBUG === 'true') {
        console.log('[DEBUG] Fixed args.list flag based on args._');
      }
    }

    // Use CommonJS require instead of ES module import to avoid compatibility issues
    const kanbnModule = require('../main');
    // Create a Kanbn instance
    const kanbn = typeof kanbnModule === 'function' ? kanbnModule() : kanbnModule;

    // Check if we're in a Kanbn board
    let boardFolder;
    try {
      // Check if kanbn has been initialised
      if (!await kanbn.initialised()) {
        return 'Not in a Kanbn board. Initialize a board with `kanbn init` first.';
      }

      // Get the main folder
      boardFolder = await kanbn.getMainFolder();
      if (process.env.DEBUG === 'true') {
        console.log(`[DEBUG] Board folder: ${boardFolder}`);
      }
    } catch (error) {
      console.error(`[ERROR] Failed to get board folder: ${error.message}`);
      return 'Not in a Kanbn board. Initialize a board with `kanbn init` first.';
    }

    // Create RAG manager instance
    const ragManager = new RAGManager({paths: {kanbn: boardFolder}});

    // Initialize RAG manager and integrations directory
    await ragManager.initialize();

    // Handle different subcommands
    if (args.list) {
      let result = '';
      
      // List markdown integrations
      const integrations = await ragManager.listIntegrations();
      if (integrations.length > 0) {
        result += 'Markdown Integrations:\n';
        for (const integration of integrations) {
          result += `- ${colors.green(integration)}: ${colors.gray(`${integration}.md`)}\n`;
        }
        result += '\n';
      }

      // List MCP servers
      const mcpClient = await getMCPClient(boardFolder);
      const mcpServers = mcpClient.config?.mcpServers || {};
      if (Object.keys(mcpServers).length > 0) {
        result += 'MCP Servers:\n';
        for (const [name, config] of Object.entries(mcpServers)) {
          const isRunning = mcpClient.servers.has(name);
          const status = isRunning ? colors.green('running') : colors.gray('stopped');
          result += `- ${colors.blue(name)}: ${status} (${config.command} ${config.args.join(' ')})\n`;
        }
        result += '\n';
      }

      if (!result) {
        const message = 'No integrations found. Add integrations with:\n' +
          '- Markdown: kanbn integrations add --name <n> --url <url>\n' +
          '- MCP Server: kanbn integrations add --type mcp --name <n> --command <cmd> --args <args>';
        console.log(message);
        return message;
      }

      console.log(result);
      return result;
    } else if (args.add) {
      // Add a new integration
      if (!args.name) {
        return 'Missing integration name. Usage:\n' +
          '- Markdown: kanbn integrations add --name <n> [--url <url>] [--content <content>]\n' +
          '- MCP Server: kanbn integrations add --type mcp --name <n> --command <cmd> --args <args>';
      }

      if (args.type === 'mcp') {
        // Add MCP server configuration
        if (!args.command) {
          return 'Missing command for MCP server. Usage: kanbn integrations add --type mcp --name <n> --command <cmd> --args <args>';
        }

        // Parse args string into array
        const serverArgs = args.args ? args.args.split(' ') : [];

        // Update kanbn.json
        const configPath = path.join(boardFolder, 'kanbn.json');
        let config;
        try {
          config = require(configPath);
        } catch (error) {
          config = {};
        }

        // Add MCP server configuration
        config.mcpServers = config.mcpServers || {};
        config.mcpServers[args.name] = {
          command: args.command,
          args: serverArgs,
          env: {}
        };

        // Save config
        await utility.writeJson(configPath, config);
        return `Added MCP server integration: ${colors.blue(args.name)}`;
      } else if (args.url) {
        // Add markdown integration from URL
        const { isLikelyHtmlUrl } = require('../utils/html-to-markdown');
        const isHtml = isLikelyHtmlUrl(args.url);

        // Inform the user if we're converting HTML to Markdown
        if (isHtml) {
          utility.debugLog(`URL appears to be an HTML webpage, will convert to Markdown: ${args.url}`);
        }

        const success = await ragManager.addIntegrationFromUrl(args.name, args.url);

        if (success) {
          if (isHtml) {
            // Print directly to console to ensure visibility
            console.log(`Integration '${args.name}' added successfully from URL: ${args.url} (HTML converted to Markdown)`);
            return `Integration '${args.name}' added successfully from URL: ${args.url} (HTML converted to Markdown)`;
          } else {
            // Print directly to console to ensure visibility
            console.log(`Integration '${args.name}' added successfully from URL: ${args.url}`);
            return `Integration '${args.name}' added successfully from URL: ${args.url}`;
          }
        } else {
          // Print directly to console to ensure visibility
          console.error(`Failed to add integration '${args.name}' from URL: ${args.url}`);
          return `Failed to add integration '${args.name}' from URL: ${args.url}`;
        }
      } else if (args.content) {
        // Add integration from content
        const success = await ragManager.addIntegration(args.name, args.content);

        if (success) {
          // Print directly to console to ensure visibility
          console.log(`Integration '${args.name}' added successfully with provided content`);
          return `Integration '${args.name}' added successfully with provided content`;
        } else {
          // Print directly to console to ensure visibility
          console.error(`Failed to add integration '${args.name}' with provided content`);
          return `Failed to add integration '${args.name}' with provided content`;
        }
      } else {
        return 'Missing URL or content. Usage: `kanbn integrations add --name <name> [--url <url>] [--content <content>]`';
      }
    } else if (args.remove) {
      // Remove an integration
      if (!args.name) {
        return 'Missing integration name. Usage: `kanbn integrations remove --name <n>`';
      }

      // Check if it's an MCP server
      const mcpClient = await getMCPClient(boardFolder);
      if (mcpClient.config?.mcpServers?.[args.name]) {
        // Stop server if running
        if (mcpClient.servers.has(args.name)) {
          await mcpClient.stopServer(args.name);
        }

        // Remove from config
        const configPath = path.join(boardFolder, 'kanbn.json');
        const config = require(configPath);
        delete config.mcpServers[args.name];
        await utility.writeJson(configPath, config);
        return `Removed MCP server: ${colors.blue(args.name)}`;
      }

      // Try removing markdown integration
      try {
        await ragManager.removeIntegration(args.name);
        return `Removed integration: ${colors.green(args.name)}`;
      } catch (error) {
        return `Failed to remove integration: ${error.message}`;
      }
    } else if (args.start) {
      // Start MCP server
      if (!args.name) {
        return 'Missing server name. Usage: `kanbn integrations start --name <n>`';
      }

      const mcpClient = await getMCPClient(boardFolder);
      if (!mcpClient.config?.mcpServers?.[args.name]) {
        return `MCP server not found: ${colors.blue(args.name)}`;
      }

      try {
        await mcpClient.startServer(args.name);
        return `Started MCP server: ${colors.blue(args.name)}`;
      } catch (error) {
        return `Failed to start MCP server: ${error.message}`;
      }
    } else if (args.stop) {
      // Stop MCP server
      if (!args.name) {
        return 'Missing server name. Usage: `kanbn integrations stop --name <n>`';
      }

      const mcpClient = await getMCPClient(boardFolder);
      try {
        await mcpClient.stopServer(args.name);
        return `Stopped MCP server: ${colors.blue(args.name)}`;
      } catch (error) {
        return `Failed to stop MCP server: ${error.message}`;
      }
    } else if (args.status) {
      // Show MCP server status
      const mcpClient = await getMCPClient(boardFolder);
      const mcpServers = mcpClient.config?.mcpServers || {};
      
      if (Object.keys(mcpServers).length === 0) {
        return 'No MCP servers configured';
      }

      let result = 'MCP Server Status:\n';
      for (const [name, config] of Object.entries(mcpServers)) {
        const isRunning = mcpClient.servers.has(name);
        const status = isRunning ? colors.green('running') : colors.gray('stopped');
        result += `- ${colors.blue(name)}: ${status}\n`;
        if (isRunning) {
          result += `  Command: ${config.command} ${config.args.join(' ')}\n`;
        }
      }
      return result;
    } else {
      // Show help
      return `${chalk.bold('Kanbn Integrations Commands')}

Manage context integrations and MCP servers:

Markdown Integrations:
- ${chalk.yellow('kanbn integrations list')} - List all integrations and servers
- ${chalk.yellow('kanbn integrations add --name <n> --url <url>')} - Add integration from URL
- ${chalk.yellow('kanbn integrations add --name <n> --content <text>')} - Add integration from text
- ${chalk.yellow('kanbn integrations remove --name <n>')} - Remove an integration

MCP Servers:
- ${chalk.yellow('kanbn integrations add --type mcp --name <n> --command <cmd> --args <args>')} - Add MCP server
- ${chalk.yellow('kanbn integrations start --name <n>')} - Start MCP server
- ${chalk.yellow('kanbn integrations stop --name <n>')} - Stop MCP server
- ${chalk.yellow('kanbn integrations status')} - Show MCP server status

Examples:
  kanbn integrations list
  kanbn integrations add --name docs --url https://example.com/docs
  kanbn integrations add --type mcp --name firecrawl --command npx --args "-y firecrawl-mcp"
  kanbn integrations start --name firecrawl
  kanbn integrations status`;
    }
  } catch (error) {
    utility.error(`Error handling integrations: ${error.message}`, true);
    return `Error handling integrations: ${error.message}`;
  }
};
