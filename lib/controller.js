
/* The core logic */

const fs = require('fs');

const adapter = require('./adapter.js');
const util = require('./util.js');

/* Time to wait until updating a feed */
const DEFAULT_UPDATE_PERIOD = 3600000; // 1 h

/* Container for application state */
class Maelstrom {

  /* Initialize a new instance */
  constructor() {
    this.config = null;
    this.channels = null;
    this.channelContents = null;
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
      cb(null);
    });
  }

  /* Refresh the on-disk and in-memory representation of channel if notAfter
   * is null or the file's mtime in milliseconds since the UNIX epoch is no
   * greater than notAfter; invoke cb when done or failed */
  updateChannel(name, notAfter, cb) {
    const ch = this.channels[name];
    const path = 'data/' + ch.codename + '.rss';
    fs.mkdir('data', 0666, (err) => {
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
        if (++done == this.config.channels.length) cb(null, updateCount);
      });
    });
  }

}

module.exports.DEFAULT_UPDATE_PERIOD = DEFAULT_UPDATE_PERIOD;
module.exports.Maelstrom = Maelstrom;
