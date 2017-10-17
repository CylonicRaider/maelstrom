const http = require('http');
const url = require('url');

function sendText(resp, text) {
  resp.setHeader('Content-Type', 'text/plain; charset=utf-8');
  resp.end(text);
}

http.createServer((req, resp) => {
  const method = req.method;
  const { pathname } = url.parse(req.url);
  if (method != 'GET') {
    resp.statusCode = 405;
    sendText(resp, '405 Method Not Allowed');
  } else if (pathname == '/') {
    resp.statusCode = 200;
    sendText(resp, 'Hello World!');
  } else {
    resp.statusCode = 404;
    sendText(resp, '404 Not Found');
  }
}).listen(8080);
