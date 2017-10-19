
const http = require('http');
const router = require('./lib/router.js');

function sendText(resp, text) {
  resp.setHeader('Content-Type', 'text/plain; charset=utf-8');
  resp.end(text);
}

const r = new router.Router();

r.get('/', (req, resp) => {
  resp.statusCode = 200;
  sendText(resp, 'Hello World!');
});

// Catch-all routes
r.route('GET', null, (req, resp) => {
  resp.statusCode = 404;
  sendText(resp, '404 Not Found');
});
r.route(null, null, (req, resp) => {
  resp.statusCode = 405;
  sendText(resp, '405 Method Not Allowed');
});

http.createServer(r.makeCallback()).listen(8080);
