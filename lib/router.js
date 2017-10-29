
/* A bare-bones HTTP request router */

const url = require('url');

const { FileCache } = require('./static.js');

/* The request router class */
class Router {

  /* Initialize a new instance */
  constructor() {
    this.handlers = [];
  }

  /* Install a generic handler
   *
   * For each request, handlers are processed in order of addition, with the
   * first to pass all tests being actually invoked. The tests are performed
   * in the order the options driving them are described below.
   *
   * Options are (named parameters override the corresponding values in
   * options uncontitonally, even if undefined):
   * method : A string that must match the request method for the handler to
   *          pass.
   * path   : A string or regular expression that must match the request path
   *          (not including the query string if any) for the handler to
   *          pass. A string matches the request path if it is identical to
   *          it.
   * handler: The handler function to invoke if all tests pass. The function
   *          is passed the request and response object as provided by the
   *          http module. If it returns null (or undefined) or a truthy
   *          value, the invocation counts as successful; otherwise, other
   *          handlers are attempted.
   *
   * NOTE: If options is passed, it is modified in-place and stored; in
   *       particular, the callback can access it as the this object when
   *       invoked. Do not modify it unintentionally. */
  route(method, path, handler, options) {
    if (typeof path == 'string')
      path = new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
    if (options == null)
      options = {};
    options.method = method;
    options.path = path;
    options.handler = handler;
    this.handlers.push(options);
  }

  /* Install a handler for a GET request
   *
   * If a request path matches the path parameter (which can be either a
   * regular expression or a string that matches itself only), handler is
   * invoked with the request and response objects as provided by the http
   * module. */
  get(path, handler) {
    this.route('GET', path, handler);
  }

  /* Install a handler serving static files
   *
   * Only files matching path are served; it and any additional arguments are
   * passed on to the FileCache constructor.
   * Returns the FileCache instance created.
   */
  getStatic(path, ...args) {
    const ret = new FileCache(path, ...args);
    this.route('GET', path, ret.makeCallback());
    return ret;
  }

  /* Actually handle a request
   *
   * Returns whether the request was actually handled by any handler. */
  handle(req, resp) {
    const { method } = req;
    const { path } = url.parse(req.url);
    return this.handlers.some(ent => {
      if (ent.method && method != ent.method) return;
      if (ent.path && ! ent.path.test(path)) return;
      const res = ent.handler(req, resp);
      return (res == null || res);
    });
  }

  /* Return a bound version of handle() for use as a callback */
  makeCallback() {
    return this.handle.bind(this);
  }

}

module.exports.Router = Router;
