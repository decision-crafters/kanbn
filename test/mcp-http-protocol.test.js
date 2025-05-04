const assert = require('assert');
const http = require('http');
const HTTPProtocolHandler = require('../src/lib/mcp/protocols/http');

describe('HTTPProtocolHandler', () => {
  let server;
  let handler;
  const port = 3001;

  beforeEach((done) => {
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
      done();
    });
  });

  afterEach((done) => {
    server.close(done);
  });

  describe('initialize', () => {
    it('should initialize and check health', async () => {
      await handler.initialize();
    });

    it('should fail if server is not healthy', async () => {
      handler = new HTTPProtocolHandler({
        baseUrl: 'http://localhost:9999', // Wrong port
        timeout: 100,
        retries: 1
      });

      await assert.rejects(
        async () => await handler.initialize(),
        /ECONNREFUSED/
      );
    });
  });

  describe('request', () => {
    it('should make successful GET request', async () => {
      const response = await handler.request('GET', '/test');
      assert.deepStrictEqual(response, {
        method: 'GET',
        path: '/test',
        body: null
      });
    });

    it('should make successful POST request with data', async () => {
      const data = { test: 'data' };
      const response = await handler.request('POST', '/test', data);
      assert.deepStrictEqual(response, {
        method: 'POST',
        path: '/test',
        body: data
      });
    });

    it('should retry failed requests', async () => {
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

      await new Promise(resolve => tempServer.listen(3002, resolve));

      const tempHandler = new HTTPProtocolHandler({
        baseUrl: 'http://localhost:3002',
        timeout: 1000,
        retries: 2
      });

      try {
        const response = await tempHandler.request('GET', '/test');
        assert.deepStrictEqual(response, { ok: true });
        assert.strictEqual(attempts, 2);
      } finally {
        await new Promise(resolve => tempServer.close(resolve));
      }
    });

    it('should handle timeout', async () => {
      const tempServer = http.createServer((req, res) => {
        // Never respond
      });

      await new Promise(resolve => tempServer.listen(3002, resolve));

      const tempHandler = new HTTPProtocolHandler({
        baseUrl: 'http://localhost:3002',
        timeout: 100,
        retries: 1
      });

      try {
        await assert.rejects(
          async () => await tempHandler.request('GET', '/test'),
          /timeout/i
        );
      } finally {
        await new Promise(resolve => tempServer.close(resolve));
      }
    });
  });
});
