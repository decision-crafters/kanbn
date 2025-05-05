/**
 * MCP Server Configuration Schema
 * Defines the JSON schema for MCP server configurations in kanbn.json
 */

const mcpServerSchema = {
  type: 'object',
  properties: {
    mcpServers: {
      type: 'object',
      patternProperties: {
        '^[a-zA-Z0-9-_]+$': {
          type: 'object',
          properties: {
            command: { type: 'string' },
            args: {
              type: 'array',
              items: { type: 'string' }
            },
            env: {
              type: 'object',
              additionalProperties: { type: 'string' }
            },
            protocol: {
              type: 'string',
              enum: ['http', 'websocket']
            },
            healthCheck: { type: 'string' },
            timeout: { type: 'number' },
            retries: { type: 'number' }
          },
          required: ['command', 'args']
        }
      },
      additionalProperties: false
    }
  }
};

module.exports = mcpServerSchema;
