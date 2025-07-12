import express from 'express';
import toolAiChat from './mcp/tools/aiChat.mjs';
import http from 'http';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// 1. Create a new MCP Server instance
const server = new McpServer(
  {
    name: "Kanbn",
    version: "0.14.0",
  },
  {
    capabilities: {
      logging: {},
    },
    tools: {
      aiChat: toolAiChat
    }
  }
);

// 2. Start the server
const port = process.env.MCP_PORT || 3000;
server.listen(port, () => {
  console.log(`MCP Server listening on http://localhost:${port}`);
});

// 3. Define placeholder tool handlers
// Health check endpoint
server.setRequestHandler('health', async () => ({ ok: true }));

// This is where we will list the tools Kanbn provides.
// For now, it returns an empty list.
server.setRequestHandler('tools/list', async () => {
  console.log('Received tools/list request');
  return { tools: [] };
});

// This is where we will handle calls to our tools.
// For now, it throws a 'not found' error.
server.setRequestHandler('tools/call', async (request) => {
  console.log(`Received tools/call request for: ${request.params.name}`);
  throw new Error(`Tool not found: ${request.params.name}`);
});

// 4. Attach the MCP server to the Express app
const transport = new HttpServerTransport({
  app,
  server: mcpServer,
});

// 5. Start the Express server
app.listen(port, () => {
  console.log(`Kanbn MCP server listening on http://localhost:${port}`);
  console.log('MCP transport attached to /mcp');
});
