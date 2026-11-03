// Servidor estático da demo: serve project/ sem alterá-lo e acrescenta /support.js.
// Uso: node demo/serve.js  (porta padrão 4173, ou defina PORT)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PROJECT = path.resolve(__dirname, '..', 'project');
const PORT = Number(process.env.PORT) || 4173;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };

http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (url === '/') { res.writeHead(302, { Location: '/Main.dc.html' }); return res.end(); }
  if (url === '/favicon.ico') { res.writeHead(204); return res.end(); }
  const file = url === '/support.js' ? path.join(__dirname, 'support.js') : path.join(PROJECT, url);
  if (url !== '/support.js' && !file.startsWith(PROJECT + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Não encontrado'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(PORT, '127.0.0.1', () => console.log('Demo em http://localhost:' + PORT));
