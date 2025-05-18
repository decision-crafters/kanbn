/**
 * MCP Server Configuration
 */

module.exports = {
  // Default port for MCP server
  port: process.env.MCP_PORT || 11434,
  
  // Default model for MCP server
  model: process.env.MCP_DEFAULT_MODEL || 'llama3',
  
  // CORS allowed origins
  allowedOrigins: process.env.MCP_ALLOWED_ORIGINS || 'http://localhost:3000',
  
  // Test mode flag
  testMode: process.env.MCP_TEST_MODE === 'true',
  
  // Debug mode flag
  debug: process.env.DEBUG === 'true'
};