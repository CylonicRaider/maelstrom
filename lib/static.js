
/* Static file server with in-memory caching */

const EventEmitter = require('events');

/* Status of a CacheNode */
const NODE_INIT    = 0, // Initialized
      NODE_LOADING = 1, // Loading data
      NODE_READY   = 2, // Data loaded
      NODE_ERROR   = 3; // Error while revalidating. Not usable anymore

/* Time to wait until revalidating a CacheNode */
const DEFAULT_MAX_AGE = 300000; // 5 min

class CacheNode extends EventEmitter {

  /* Initialize a new instance
   *
   * path is the (HTTP) path this node represents; maxAge is a number
   * denoting after how many milliseconds this node should be revalidated.
   * An infinite maxAge means that the node will never be revalidated.
   */
  constructor(path, maxAge) {
    super();
    if (maxAge == null) maxAge = DEFAULT_MAX_AGE;
    this.path = path;
    this.maxAge = maxAge;
    this.expires = -Infinity;
    this.source = null;
    this.readyState = NODE_INIT;
    this._data = null;
  }

  /* Load this node with the given data
   *
   * If data is a string, it is encoded using UTF-8; otherwise, it is
   * assumed to be a buffer and used without modification.
   * cb, if given, is a function that is invoked when the cache node
   * expires. It is given no arguments and returns the new data to be
   * held by the node, similarly to str. If cb is absent, the data are
   * assumed to be valid indefinitely.
   * Returns the current CacheNode instance.
   */
  loadDirect(data, cb) {
    if (typeof str == 'string') {
      this._data = Buffer.from(data, 'utf-8');
    } else {
      this._data = data;
    }
    this.expires = Date.now() + this.maxAge;
    this.source = cb;
    this.readyState = NODE_READY;
    process.nextTick(() => this.emit('ready'));
    return this;
  }

  /* Load this node with data from stream
   *
   * stream is assumed to be a ReadStream procuding Buffer-s.
   * cb has the same semantics as the same-named argument to loadDirect().
   * Returns the current CacheNode instance.
   */
  loadStream(stream, cb) {
    this.expires = Date.now() + this.maxAge;
    this.source = cb;
    this.readyState = NODE_LOADING;
    this._data = [];
    stream.on('data', (item) => {
      this._data.push(item);
    }).on('end', () => {
      this._data = Buffer.concat(this._data);
      this.readyState = NODE_READY;
      this.emit('ready');
    }).on('error', (err) => {
      this._data = null;
      this.readyState = NODE_ERROR;
      this.emit('error', err);
    });
    return this;
  }

  /* Load this node with the contents of the file at path
   *
   * Differently to loadDirect() or loadStream(), a revalidation callback
   * is supplied internally.
   * Returns the current CacheNode instance.
   */
  loadFile(path) {
    const reload = () => fs.createReadStream(path);

    return this.loadStream(reload(), reload);
  }

}