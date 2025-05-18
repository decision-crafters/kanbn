const dotenv = require('dotenv');
const utility = require('../utility');

class McpConfig {
  constructor() {
    dotenv.config();
    this.port = process.env.MCP_PORT || 11434;
    this.model = process.env.MCP_DEFAULT_MODEL || 'google/gemma-3-4b-it:free';
    this.allowedOrigins = process.env.MCP_ALLOWED_ORIGINS 
      ? process.env.MCP_ALLOWED_ORIGINS.split(',') 
      : [];
    this.apiKey = process.env.MCP_API_KEY;
    
    this.validate();
  }

  validate() {
    if (!Number.isInteger(Number(this.port))) {
      utility.error('MCP_PORT must be a valid integer');
    }
    // Add more validation as needed
  }
}

module.exports = new McpConfig();
