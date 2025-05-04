const assert = require('assert');
const MCPClient = require('../src/lib/mcp/client');

describe('MCPClient', () => {
  let client;

  beforeEach(() => {
    client = new MCPClient();
  });

  afterEach(async () => {
    await client.stopAll();
  });

  describe('loadConfig', () => {
    it('should load valid configuration', async () => {
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
      assert.strictEqual(client.config, config);
    });

    it('should reject invalid configuration', async () => {
      const config = {
        // Missing mcpServers
      };

      await assert.rejects(
        async () => await client.loadConfig(config),
        /No MCP servers configured/
      );
    });
  });

  describe('startServer', () => {
    it('should start configured server', async () => {
      const config = {
        mcpServers: {
          test: {
            command: 'echo',
            args: ['test']
          }
        }
      };

      await client.loadConfig(config);
      const server = await client.startServer('test');
      assert(server);
      assert(client.servers.has('test'));
    });

    it('should reject unknown server', async () => {
      const config = {
        mcpServers: {}
      };

      await client.loadConfig(config);
      await assert.rejects(
        async () => await client.startServer('unknown'),
        /MCP server "unknown" not found/
      );
    });
  });
});
