const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, 'public');
const port = Number(process.env.PORT || 3000);

const mime = {
  '.html':'text/html; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.png':'image/png',
  '.webp':'image/webp',
  '.svg':'image/svg+xml',
  '.ico':'image/x-icon'
};

function safePath(urlPath) {
  const clean = decodeURIComponent((urlPath || '/').split('?')[0]);
  const requested = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '');
  const resolved = path.resolve(root, requested);
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return resolved;
}
const server = http.createServer((req, res) => {
  let file = safePath(req.url);
  if (!file) {
    res.writeHead(400);
    return res.end('Bad request');
  }

  fs.stat(file, (err, stat) => {
    if (!err && stat.isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (readErr, data) => {
      if (readErr) {
        res.writeHead(readErr.code === 'ENOENT' ? 404 : 500, {
          'Content-Type':'text/plain; charset=utf-8'
        });
        return res.end(readErr.code === 'ENOENT' ? 'Not found' : 'Server error');
      }
      res.writeHead(200, {
        'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': path.extname(file) === '.html' ? 'no-cache' : 'public, max-age=3600'
      });
      res.end(data);
    });
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log('Krakow clothes sale listening on port ' + port);
});
