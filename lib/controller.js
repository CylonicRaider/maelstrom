
/* The core logic */

const fs = require('fs');

const adapter = require('./adapter.js');
const util = require('./util.js');

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

  /* Refresh the on-disk and in-memory representation of channel
   * unconditionally; invoke cb when ready or failed */
  updateChannel(name, cb) {
    const ch = this.channels[name];
    const path = 'data/' + ch.codename + '.rss';
    fs.mkdir('data', 0666, (err) => {
      if (err != null && err.code != 'EEXIST') return cb(err);
      util.download(ch.link, path, (err) => {
        if (err != null) return cb(err);
        adapter.parseFile(path, adapter.rssAdapter, (err, data) => {
          if (err != null) return cb(err);
          this.channelContents[name] = data;
          cb(null);
        });
      });
    });
  }

}
