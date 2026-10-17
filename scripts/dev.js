'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const handler = require('../api/account');
const root = path.resolve(__dirname, '..', 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/account') {
    let data = ''; let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 2_000_000) { res.writeHead(413); res.end(); return; }
      data += chunk;
    }
    req.body = data || '{}'; req.query = Object.fromEntries(url.searchParams);
    res.status = code => { res.statusCode = code; return res; };
    res.json = body => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
    await handler(req, res); return;
  }
  const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.PORT || 8001), '127.0.0.1', () => console.log('Servidor de desenvolvimento iniciado.'));
