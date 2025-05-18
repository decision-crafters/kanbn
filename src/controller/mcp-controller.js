const KanbnMcpServer = require('../lib/mcp-server');
const McpConfig = require('../config/mcp-config');
const utility = require('../utility');

module.exports = async (kanbn, args) => {
  try {
    utility.debugLog('Starting MCP server with config:', McpConfig);
    
    const server = new KanbnMcpServer(kanbn, {
      port: McpConfig.port,
      model: McpConfig.model,
      debug: process.env.DEBUG === 'true'
    });
    
    await server.start();
    
    process.on('SIGINT', async () => {
      await server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    utility.error(`MCP server failed: ${error.message}`);
    process.exit(1);
  }
};
