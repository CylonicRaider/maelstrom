
/* The core logic */

const fs = require('fs');
const http = require('http');

const adapter = require('./adapter.js');
const httplog = require('./httplog.js');
const Router = require('./router.js');
const util = require('./util.js');

/* Time to wait until updating a feed */
const DEFAULT_UPDATE_PERIOD = 3600000; // 1 h

/* Default listening address */
const DEFAULT_HOST = null;
const DEFAULT_PORT = 8080;

/* Container for application state */
class Maelstrom {

  /* Initialize a new instance */
  constructor() {
    this.config = null;
    this.channels = null;
    this.channelContents = null;
    this.mainChannel = null;
    this.serverConfig = {host: DEFAULT_HOST, port: DEFAULT_PORT};
    this.router = null;
    this.server = null;
  }

  /* Update the server configuration with those values from cfg which are
   * not undefined */
  updateServerConfig(cfg) {
    if (cfg.host !== undefined) this.serverConfig.host = cfg.host;
    if (cfg.port !== undefined) this.serverConfig.port = cfg.port;
  }

  /* Load configuration from filename; invoke cb when ready or failed */
  loadConfig(filename, cb) {
    this.adapter.parseFile(filename, adapter.configAdapter, (err, data) => {
      if (err != null) return cb(err);
      this.config = data;
      this.channels = {};
      this.channelContents = {};
      this.config.channels.forEach((ch) => {
        this.channels[ch.codename] = ch;
      });
      this.mainChannel = this.config.mainChannel;
      cb(null);
    });
  }

  /* Refresh the on-disk and in-memory representation of channel if notAfter
   * is null or the file's mtime in milliseconds since the UNIX epoch is no
   * greater than notAfter; invoke cb when done or failed */
  updateChannel(name, notAfter, cb) {
    const ch = this.channels[name];
    const path = 'data/' + ch.codename + '.rss';
    fs.mkdir('data', 0o666, (err) => {
      if (err != null && err.code != 'EEXIST') return cb(err);
      fs.stat(path, (err, stats) => {
        if (err != null && err.code != 'ENOENT') {
          return cb(err);
        } else if (notAfter != null && err == null &&
                   stats.mtimeMs > notAfter) {
          return cb(null, false);
        }
        util.download(ch.link, path, (err) => {
          if (err != null) return cb(err);
          adapter.parseFile(path, adapter.rssAdapter, (err, data) => {
            if (err != null) return cb(err);
            this.channelContents[name] = data;
            cb(null, true);
          });
        });
      });
    });
  }

  /* Update the main channel */
  updateMainChannel(cb) {
    try {
      this.mainChannel.updateItems();
    } catch (e) {
      return cb(e);
    }
    cb(null);
  }

  /* Update those channels that are stale (force is false) or all channels
   * unconditionally (force is true); invoke cb when done or failed */
  update(force, cb) {
    const notAfter = (force) ? null : Date.now() - DEFAULT_UPDATE_PERIOD;
    let done = 0, updateCount = 0, errorReported = false;
    this.config.channels.forEach((ch) => {
      this.updateChannel(ch.codename, notAfter, (err, updated) => {
        if (err != null) {
          if (errorReported) return;
          errorReported = true;
          return cb(err);
        }
        if (updated) updateCount++;
        if (++done != this.config.channels.length) return;
        this.updateMainChannel((err) => {
          if (err != null) return cb(err);
          cb(null, updateCount);
        });
      });
    });
  }

  /* Return a Router instance for this controller */
  makeRouter() {
    if (this.router != null) return this.router;
    this.router = new Router();
    return this.router;
  }

  /* Return a fully prepared http.Server instance */
  makeServer() {
    if (this.server != null) return this.server;
    this.makeRouter();
    // Statics
    this.router.alias('/favicon.ico', '/static/icon.ico');
    this.router.getStatic(/\/static\/(.*)/, '$1', 'static');
    // Catch-all routes
    this.router.routeString('GET', null, 404, '404 Not Found');
    this.router.routeString(null, null, 405, '405 Method Not Allowed');
    // Done
    const cb = httplog.wrap(this.router.makeCallback());
    this.server = http.createServer(cb);
    return this.server;
  }

  /* Create a HTTP server and make it listen on the configured address
   *
   * The server is returned. */
  listen() {
    const srv = this.makeServer();
    srv.listen(this.serverConfig.port, this.serverConfig.host);
    return srv;
  }

}

module.exports.DEFAULT_UPDATE_PERIOD = DEFAULT_UPDATE_PERIOD;
module.exports.DEFAULT_HOST = DEFAULT_HOST;
module.exports.DEFAULT_PORT = DEFAULT_PORT;
module.exports.Maelstrom = Maelstrom;
