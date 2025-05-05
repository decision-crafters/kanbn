const QUnit = require('qunit');
const assert = QUnit.assert; // Use QUnit's assertion library
const http = require('http');
const HTTPProtocolHandler = require('../src/lib/mcp/protocols/http');

QUnit.module('HTTPProtocolHandler', hooks => {
  let server;
  let handler;
  const port = 3001;

  hooks.beforeEach(async assert => { // Use async hooks for setup/teardown
    const done = assert.async(); // QUnit way to handle async setup
    // Create a test HTTP server
    server = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }

      if (req.url === '/test') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            method: req.method,
            path: req.url,
            body: body ? JSON.parse(body) : null
          }));
        });
        return;
      }

      res.writeHead(404);
      res.end();
    });

    server.listen(port, () => {
      handler = new HTTPProtocolHandler({
        baseUrl: `http://localhost:${port}`,
        timeout: 1000,
        retries: 2
      });
      done(); // Signal async setup complete
    });
  });

  hooks.afterEach(async assert => {
    const done = assert.async();
    server.close(done);
  });

  QUnit.module('initialize', () => {
    QUnit.test('should initialize and check health', async assert => {
      await handler.initialize();
      assert.ok(true, 'Initialization should complete without error'); // Add an assertion
    });

    QUnit.test('should fail if server is not healthy', async assert => {
      handler = new HTTPProtocolHandler({
        baseUrl: 'http://localhost:9999', // Wrong port
        timeout: 100,
        retries: 1
      });

      await assert.rejects(
        handler.initialize(),
        /ECONNREFUSED/,
        'Initialization should fail with connection refused'
      );
    });
  });

  QUnit.module('request', () => {
    QUnit.test('should make successful GET request', async assert => {
      const response = await handler.request('GET', '/test');
      assert.deepStrictEqual(response, {
        method: 'GET',
        path: '/test',
        body: null
      }, 'GET response should match expected structure');
    });

    QUnit.test('should make successful POST request with data', async assert => {
      const data = { test: 'data' };
      const response = await handler.request('POST', '/test', data);
      assert.deepStrictEqual(response, {
        method: 'POST',
        path: '/test',
        body: data
      }, 'POST response should match expected structure with body');
    });

    QUnit.test('should retry failed requests', async assert => {
      // Create a server that fails first request
      let attempts = 0;
      const tempServer = http.createServer((req, res) => {
        attempts++;
        if (attempts === 1) {
          res.writeHead(500);
          res.end();
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        }
      });

      const doneListen = assert.async();
      await new Promise(resolve => tempServer.listen(3002, resolve)).then(doneListen);

      const tempHandler = new HTTPProtocolHandler({
        baseUrl: 'http://localhost:3002',
        timeout: 1000,
        retries: 2
      });

      try {
        const response = await tempHandler.request('GET', '/test');
        assert.deepStrictEqual(response, { ok: true }, 'Response after retry should be ok');
        assert.strictEqual(attempts, 2, 'Should have made 2 attempts');
      } finally {
        const doneClose = assert.async();
        await new Promise(resolve => tempServer.close(resolve)).then(doneClose);
      }
    });

    QUnit.test('should handle timeout', async assert => {
      const tempServer = http.createServer((req, res) => {
        // Never respond
      });

      const doneListen = assert.async();
      await new Promise(resolve => tempServer.listen(3002, resolve)).then(doneListen);

      const tempHandler = new HTTPProtocolHandler({
        baseUrl: 'http://localhost:3002',
        timeout: 100,
        retries: 1
      });

      try {
        await assert.rejects(
          tempHandler.request('GET', '/test'),
          /timeout/i,
          'Request should reject with timeout error'
        );
      } finally {
        const doneClose = assert.async();
        await new Promise(resolve => tempServer.close(resolve)).then(doneClose);
      }
    });
  });
});
