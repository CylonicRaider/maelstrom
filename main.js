
const http = require('http');

const { Router } = require('./lib/router.js');
const { stringResponder } = require('./lib/static.js');

const r = new Router();

r.get('/', stringResponder(200, 'Hello World!'));
r.getStatic(/\/static\/(.*)/, '$1', 'static');

// Catch-all routes
r.route('GET', null, stringResponder(404, '404 Not Found'));
r.route(null, null, stringResponder(405, '405 Method Not Allowed'));

http.createServer(r.makeCallback()).listen(8080);
