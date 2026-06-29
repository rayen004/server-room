const http = require('http');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

http
  .createServer((request, response) => {
    const requestPath = (request.url || '/').split('?')[0];
    const filePath =
      requestPath === '/' || !path.extname(requestPath)
        ? path.join(root, 'index.html')
        : path.join(root, requestPath);

    fs.readFile(filePath, (error, data) => {
      if (error) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }

      response.writeHead(200, {
        'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      });
      response.end(data);
    });
  })
  .listen(5173, '127.0.0.1', () => {
    console.log('listening on 5173');
  });
