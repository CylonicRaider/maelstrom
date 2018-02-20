
/* Maelstrom main file */

const http = require('http');
const path = require('path');

const minimist = require('minimist');

const { Maelstrom } = require('./lib/controller.js');

/* Parse command-line arguments */
function parseArgs() {
  const values = minimist(process.argv.slice(2));
  const ret = {port: undefined, host: undefined};

  try {
    // Currently not accepting positional arguments
    if (values._.length)
      throw 'No positional parameters expected';

    // Help
    if (values.help) {
      console.info('USAGE: %s %s [--help] [--host host] [--port port]',
        path.basename(process.argv[0]), path.basename(process.argv[1]));
      process.exit(0);
    }

    // HTTP host
    if (values.host) {
      ret.host = values.host;
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

const args = parseArgs();
const main = new Maelstrom();
main.updateServerConfig(args);
main.makeRouter().getString('/', 200, 'Hello World!');
main.makeServer();
main.listen();
