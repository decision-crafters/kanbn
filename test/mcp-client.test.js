const MCPClient = require('../src/lib/mcp/client');

jest.setTimeout(30000); // Increase timeout to 30 seconds

// Mock protocol handler
const mockHandler = {
  initialize: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined)
};

const mockProtocolFactory = {
  getHandler: jest.fn().mockReturnValue(mockHandler),
  closeAll: jest.fn().mockResolvedValue(undefined)
};

describe('MCPClient', () => {
  let client;

  beforeEach(() => {
    client = new MCPClient();
    client.protocolFactory = mockProtocolFactory;
  });

  afterEach(async () => {
    await client.stopAll();
  });

  describe('loadConfig', () => {
    test('should load valid configuration', async () => {
      const config = {
        mcpServers: {
          test: {
            command: 'echo',
            args: ['test'],
            env: {
              TEST_KEY: '${TEST_VALUE}'
            }
          }
        }
      };

      await client.loadConfig(config);
      expect(client.config).toBe(config);
    });

    test('should reject invalid configuration', async () => {
      const config = {
        // Missing mcpServers
      };

      await expect(client.loadConfig(config)).rejects.toThrow('No MCP servers configured');
    });
  });

  describe('startServer', () => {
    test('should start configured server', async () => {
      const config = {
        mcpServers: {
          test: {
            command: 'sleep',
            args: ['1']
          }
        }
      };

      await client.loadConfig(config);
      const server = await client.startServer('test');
      expect(server).toBeDefined();
      
      // Wait for server to be initialized
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(client.servers.has('test')).toBe(true);
    });

    test('should reject unknown server', async () => {
      const config = {
        mcpServers: {}
      };

      await client.loadConfig(config);
      await expect(client.startServer('unknown')).rejects.toThrow('MCP server "unknown" not found');
    });
  });
});
