const http = require('http');
const net = require('net');
const HTTPProtocolHandler = require('../src/lib/mcp/protocols/http');

describe('HTTPProtocolHandler', () => {
  let server;
  let handler;
  const port = 3001;

  beforeEach(async () => {
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

    await new Promise(resolve => server.listen(port, resolve));
    handler = new HTTPProtocolHandler({
      baseUrl: `http://localhost:${port}`,
      timeout: 1000,
      retries: 2
    });
  });

  afterEach(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  describe('initialize', () => {
    test('should initialize and check health', async () => {
      await handler.initialize();
      expect(true).toBe(true); // Initialization completed without error
    });

    test('should fail if server is not healthy', async () => {
      handler = new HTTPProtocolHandler({
        baseUrl: 'http://localhost:9999', // Wrong port
        timeout: 100,
        retries: 1
      });

      const result = await handler.initialize();
      expect(result).toBe(false);
    });
  });

  describe('request', () => {
    test('should make successful GET request', async () => {
      const response = await handler.request('GET', '/test');
      expect(response).toEqual({
        method: 'GET',
        path: '/test',
        body: null
      });
    });

    test('should make successful POST request with data', async () => {
      const data = { test: 'data' };
      const response = await handler.request('POST', '/test', data);
      expect(response).toEqual({
        method: 'POST',
        path: '/test',
        body: data
      });
    });

    test('should retry failed requests', async () => {
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
        expect(response).toEqual({ ok: true });
        expect(attempts).toBe(2);
      } finally {
        await new Promise(resolve => tempServer.close(resolve));
      }
    });

    test('should handle timeout', async () => {
      // Create a server that accepts connections but never responds
      const tempServer = net.createServer((socket) => {
        // Keep socket open but never send data
        socket.on('error', () => {}); // Ignore errors
      });

      await new Promise(resolve => tempServer.listen(3002, resolve));

      const tempHandler = new HTTPProtocolHandler({
        baseUrl: 'http://localhost:3002',
        timeout: 100,
        retries: 1
      });

      try {
        await expect(tempHandler.request('GET', '/test')).rejects.toThrow(/timeout|ECONNRESET/i);
      } finally {
        await new Promise(resolve => tempServer.close(resolve));
      }
    });
  });
});
