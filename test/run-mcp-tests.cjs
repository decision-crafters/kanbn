#!/usr/bin/env node

/**
 * CommonJS wrapper to run the MCP tests
 * This helps with module compatibility issues
 */

console.log('Starting MCP test runner...');

// Set environment variables for testing
process.env.MCP_TEST_MODE = 'true';
process.env.DEBUG = 'true';

// Create a substitute for dynamic import in CommonJS
global.importMcp = async function() {
  try {
    return { 
      McpClient: { 
        create: () => ({
          serverUrl: () => ({
            build: () => ({
              getResource: async () => ({ name: 'Test Board', columns: { 'Backlog': [], 'Done': [] } }),
              invokeTool: async () => ({ success: true })
            })
          })
        })
      } 
    };
  } catch (error) {
    console.error('Error importing MCP Client:', error);
    throw error;
  }
};

// We need a mock implementation for the ES module issues during testing
global.import = async function(specifier) {
  console.log(`Mock importing: ${specifier}`);
  if (specifier.includes('mcp') || specifier.includes('sdk')) {
    return { 
      McpServer: {
        create: () => ({
          serverInfo: () => ({
            capabilities: () => ({
              build: () => ({
                use: () => {},
                addResource: () => {},
                addTool: () => {},
                addPrompt: () => {},
                start: async () => {},
                stop: async () => {}
              })
            })
          })
        })
      },
      McpClient: {
        create: () => ({
          serverUrl: () => ({
            build: () => ({
              getResource: async () => ({ name: 'Test Board', columns: { 'Backlog': [], 'Done': [] } }),
              invokeTool: async () => ({ success: true })
            })
          })
        })
      }
    };
  }
  throw new Error(`Unsupported import: ${specifier}`);
};

try {
  // Run the tests with mocks
  require('./mcp-test-tool.js');
} catch (error) {
  console.error('Failed to run MCP tests:', error.stack || error);
  process.exit(1);
}
