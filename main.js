
const http = require('http');

const httplog = require('./lib/httplog.js');
const { Router } = require('./lib/router.js');

const r = new Router();

// Landing page
r.getString('/', 200, 'Hello World!');

// Statics
r.alias('/favicon.ico', '/static/icon.ico');
r.getStatic(/\/static\/(.*)/, '$1', 'static');

// Catch-all routes
r.routeString('GET', null, 404, '404 Not Found');
r.routeString(null, null, 405, '405 Method Not Allowed');

http.createServer(httplog.wrap(r.makeCallback())).listen(8080);
