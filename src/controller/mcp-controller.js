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
    
    // Initialize and start the server
    const started = await server.start();
    
    if (!started) {
      throw new Error('Failed to start MCP server');
    }
    
    console.log(`🚀 MCP server running on port ${McpConfig.port}`);
    console.log(`💡 Use 'Ctrl+C' to stop the server`);
    
    process.on('SIGINT', async () => {
      console.log('\n🛑 Stopping MCP server...');
      await server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    utility.error(`MCP server failed: ${error.message}`);
    process.exit(1);
  }
};
