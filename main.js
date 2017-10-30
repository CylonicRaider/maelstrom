
const http = require('http');

const { Router } = require('./lib/router.js');
const { stringResponder } = require('./lib/filecache.js');

const r = new Router();

// Landing page
r.get('/', stringResponder(200, 'Hello World!'));

// Statics
r.alias('/favicon.ico', '/static/icon.ico');
r.getStatic(/\/static\/(.*)/, '$1', 'static');

// Catch-all routes
r.route('GET', null, stringResponder(404, '404 Not Found'));
r.route(null, null, stringResponder(405, '405 Method Not Allowed'));

http.createServer(r.makeCallback()).listen(8080);
