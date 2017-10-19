
const http = require('http');
const router = require('./lib/router.js');

function textSender(code, text) {
  return (req, resp) => {
    resp.statusCode = code;
    resp.setHeader('Content-Type', 'text/plain; charset=utf-8');
    resp.end(text);
  };
}

const r = new router.Router();

r.get('/', textSender(200, 'Hello World!'));

// Catch-all routes
r.route('GET', null, textSender(404, '404 Not Found'));
r.route(null, null, textSender(405, '405 Method Not Allowed'));

http.createServer(r.makeCallback()).listen(8080);
