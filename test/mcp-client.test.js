const QUnit = require('qunit');
const assert = QUnit.assert; // Use QUnit's assertion library
const MCPClient = require('../src/lib/mcp/client');

QUnit.module('MCPClient', hooks => {
  let client;

  hooks.beforeEach(() => {
    client = new MCPClient();
  });

  hooks.afterEach(async () => {
    await client.stopAll();
  });

  QUnit.module('loadConfig', () => {
    QUnit.test('should load valid configuration', async assert => {
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
      assert.strictEqual(client.config, config, 'Client config should match loaded config');
    });

    QUnit.test('should reject invalid configuration', async assert => {
      const config = {
        // Missing mcpServers
      };

      await assert.rejects(
        client.loadConfig(config),
        /No MCP servers configured/,
        'Should reject config without mcpServers'
      );
    });
  });

  QUnit.module('startServer', () => {
    QUnit.test('should start configured server', async assert => {
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
      assert.ok(server, 'Server object should be returned');
      assert.ok(client.servers.has('test'), 'Client should track the started server');
    });

    QUnit.test('should reject unknown server', async assert => {
      const config = {
        mcpServers: {}
      };

      await client.loadConfig(config);
      await assert.rejects(
        client.startServer('unknown'),
        /MCP server "unknown" not found/,
        'Should reject starting an unknown server'
      );
    });
  });
});
