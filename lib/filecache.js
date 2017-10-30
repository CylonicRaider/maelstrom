
/* Static file server with in-memory caching */

const fs = require('fs');
const EventEmitter = require('events');
const { posix } = require('path');
const url = require('url');

const BufferReader = require('./bufreader.js');
const { template } = require('./util.js');

/* Status of a CacheNode */
const NODE_INIT    = 0, // Initialized
      NODE_LOADING = 1, // Loading data
      NODE_READY   = 2, // Data loaded
      NODE_ERROR   = 3; // Error while revalidating. Not usable anymore

/* Time to wait until revalidating a CacheNode */
const DEFAULT_MAX_AGE = 300000; // 5 min

/* Create callback for responding to HTTP requests with a fixed string
 *
 * code is the status code to use; text is the string to send. A Content-Type
 * of "text/plain; charset=utf-8" is set. */
function stringResponder(code, text) {
  return (req, resp) => {
    resp.statusCode = code;
    resp.setHeader('Content-Type', 'text/plain; charset=utf-8');
    resp.end(text);
  };
}

/* What to respond with when a CacheNode failed validation */
const SERVER_ERROR = stringResponder(500, '500 Internal Server Error');

/* An individual entry of a ResponseCache */
class CacheNode extends EventEmitter {

  /* Initialize a new instance
   *
   * path is the (HTTP) path this node represents; maxAge is a number
   * denoting after how many milliseconds this node should be revalidated.
   * An infinite maxAge means that the node will never be revalidated. */
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
   * held by the node, similarly to data. If cb is absent, the data are
   * assumed to be valid indefinitely.
   * Returns the current CacheNode instance. */
  loadDirect(data, cb) {
    if (typeof str == 'string') {
      this._data = Buffer.from(data, 'utf-8');
    } else {
      this._data = data;
    }
    this.expires = Date.now() + this.maxAge;
    this.source = cb;
    this.readyState = NODE_READY;
    process.nextTick(() => this.emit('done', null, this._data));
    return this;
  }

  /* Load this node with data from stream
   *
   * stream is assumed to be a ReadStream procuding Buffer-s.
   * cb has the same semantics as the same-named argument to loadDirect().
   * Returns the current CacheNode instance. */
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
      this.emit('done', null, this._data);
    }).on('error', (err) => {
      this._data = null;
      this.readyState = NODE_ERROR;
      this.emit('done', err);
    });
    return this;
  }

  /* Load this node with the contents of the file at path
   *
   * Differently to loadDirect() or loadStream(), a revalidation callback
   * is supplied internally.
   * Returns the current CacheNode instance. */
  loadFile(path) {
    const reload = () => fs.createReadStream(path);
    return this.loadStream(reload(), reload);
  }

  /* Ensure the node is valid and reload is if not
   *
   * Reloading happens asynchronously.
   * Returns whether the node is still valid. */
  revalidate() {
    if (this.expires < Date.now() && this.source != null) {
      const input = this.source();
      if (typeof input == 'string') {
        this.loadDirect(input, this.source);
      } else if (input instanceof Buffer) {
        this.loadDirect(input, this.source);
      } else if (input instanceof stream.Readable) {
        this.loadStream(input, this.source);
      } else {
        process.nextTick(() => {
          this.emit('done', new Error('Unknown data source: ' + input));
        });
      }
      return false;
    } else {
      return true;
    }
  }

  /* Invoke handler whenever the node is ready or has failed validation
   *
   * If the node has already failed validation or is not currently loading,
   * the handler is invoked immediately (but asynchronously).
   * handler takes one optional parameter, being the error if the node is
   * or becomes not valid. */
  done(handler) {
    if (this.readyState == NODE_ERROR) {
      process.nextTick(handler, new Error('Node not valid'));
    } else if (this.readyState == NODE_LOADING || ! this.revalidate()) {
      this.once('done', handler);
    } else {
      process.nextTick(handler, null, this._data);
    }
  }

}

/* A caching file server */
class FileCache {

  /* Initialize a new instance
   *
   * regex is a RegExp object that matches HTTP paths and whose groupings are
   * inserted into template to generate a FS path to be served as the
   * response to requests of the corresponding HTTP path.
   * If root is not null, the templated path is forced to be a relative one
   * and resolved against root (all using POSIX semantics); this prevents
   * directory traversal attacks. root defaults to ".", i.e. the current
   * directory.
   * Responses are cached (using the FS path as a key) for later re-use.
   * Set the maxAge property to a number to change the expiration time of
   * cache entries from the DEFAULT_MAX_AGE. */
  constructor(regex, template, root = '.') {
    this.regex = regex;
    this.template = template;
    this.root = root;
    this.maxAge = null;
    this.cache = new Map();
  }

  /* Remove everything or the given path from the cache */
  clear(path) {
    if (path != null) {
      this.cache.delete(path);
    } else {
      this.cache.clear(path);
    }
  }

  /* Add the given CacheNode to the cache unconditionally */
  add(node) {
    this.cache.set(node.path, node);
  }

  /* Handle a single request using the given file path */
  _handle(req, resp, fsPath) {
    // Test whether the file is present at all
    // FIXME: Standard race condition
    try {
      fs.accessSync(fsPath, fs.constants.R_OK);
    } catch (e) {
      return false;
    }
    // Try to get cached item
    let item = this.cache.get(fsPath);
    if (item == null) {
      item = new CacheNode(fsPath, this.maxAge);
      item.loadFile(fsPath);
      this.cache.set(fsPath, item);
    }
    // Handle request when cache node is done
    item.done((err, data) => {
      if (err) {
        SERVER_ERROR(req, resp);
      } else {
        new BufferReader(data).pipe(resp);
      }
    });
  }

  /* Handle a single request */
  handle(req, resp, method, path) {
    // Map request to a filesystem path
    if (path === undefined) path = url.parse(req.url).path;
    const m = this.regex.exec(path);
    if (! m || m.index != 0 || m[0].length != path.length)
      return false;
    let fsPath = template(m, this.template);
    // Directory traversal mitigation
    if (this.root != null) {
      // Make relative
      fsPath = posix.relative('/', posix.join('/', fsPath));
      // Join to root
      fsPath = posix.join(this.root, fsPath);
    }
    // Call underlying handler
    return this._handle(req, resp, fsPath);
  }

  /* Return a bound version of handle() for use as a callback */
  makeCallback() {
    return this.handle.bind(this);
  }

}

module.exports.DEFAULT_MAX_AGE = DEFAULT_MAX_AGE;
module.exports.stringResponder = stringResponder;
module.exports.CacheNode = CacheNode;
module.exports.FileCache = FileCache;
