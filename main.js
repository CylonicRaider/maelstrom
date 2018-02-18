
/* Maelstrom main file */

const http = require('http');
const path = require('path');

const minimist = require('minimist');

const httplog = require('./lib/httplog.js');
const Router = require('./lib/router.js');

const DEFAULT_PORT = 8080;

/* Parse command-line arguments */
function parseArgs() {
  const values = minimist(process.argv.slice(2));
  const ret = {port: DEFAULT_PORT};

  try {
    // Currently not accepting positional arguments
    if (values._.length)
      throw 'No positional parameters expected';

    // Help
    if (values.help) {
      console.info('USAGE: %s %s [--help] [--port port]',
        path.basename(process.argv[0]), path.basename(process.argv[1]));
      process.exit(0);
    }

    // HTTP port
    if (values.port) {
      if (typeof values.port != 'number' || ! Number.isInteger(values.port))
        throw 'Port must be an integer';
      ret.port = values.port;
    }
  } catch (e) {
    // Error handling
    console.error('ERROR:', e);
    process.exit(1);
  }

  return ret;
}

/* Create and configure a HTTP server */
function makeServer() {
  const r = new Router();

  // Landing page
  r.getString('/', 200, 'Hello World!');

  // Statics
  r.alias('/favicon.ico', '/static/icon.ico');
  r.getStatic(/\/static\/(.*)/, '$1', 'static');

  // Catch-all routes
  r.routeString('GET', null, 404, '404 Not Found');
  r.routeString(null, null, 405, '405 Method Not Allowed');

  return http.createServer(httplog.wrap(r.makeCallback()));
}

const args = parseArgs();
makeServer().listen(args.port);
