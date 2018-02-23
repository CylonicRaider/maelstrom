
/* HTTP request logger */

const { leftpad } = require('./util.js');

/* Escape sequence table */
const ESCAPES = {'\\': '\\x5C', '\r': '\\x0D', '\n': '\\x0A', '"': '\\x22',
                 ' ': '\\x20'};

/* Month names */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* Surround s by quotes and escape certain characters */
function quote(s) {
  if (s == null) return '-';
  return '"' + s.replace(/[\\\r\n"]/g, x => ESCAPES[x]) + '"';
}

/* Escape certain characters in s */
function escape(s) {
  if (s == null) return '-';
  return s.replace(/[\\\r\n ]/g, x => ESCAPES[x]);
}

/* Format an IP address */
function formatAddress(s) {
  return s.replace(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/, '$1');
}

/* Format a number */
function formatNumber(n) {
  if (n == null) return '-';
  return n.toString();
}

/* Format a log entry corresponding to req and resp
 *
 * NOTE that the response must be finished; otherwise, some fields may be
 *      missing values. */
function formatLog(req, resp) {
  const pad2 = x => leftpad(x, 2, '0');

  const now = new Date();
  const tzo = now.getTimezoneOffset();
  const tzs = (tzo < 0) ? '+' : '-', tzd = Math.abs(tzo);
  const date = `${pad2(now.getDate())}/${MONTHS[now.getMonth()]}/` +
      `${now.getFullYear()}:${pad2(now.getHours())}:` +
      `${pad2(now.getMinutes())}:${pad2(now.getSeconds())} ` +
      `${tzs}${pad2(tzd / 60 | 0)}${pad2(tzd % 60)}`;

  const reqLine = `${req.method} ${req.url} HTTP/${req.httpVersion}`;
  const contentLength = formatNumber(resp.getHeader('content-length'));

  return `${formatAddress(req.connection.remoteAddress)} - - [${date}] ` +
      `${quote(reqLine)} ${resp.statusCode} ${contentLength} ` +
      `${quote(req.headers['referer'])} ${quote(req.headers['user-agent'])}`;
}

/* Schedule HTTP logs to be written for req and resp whenever appropriate
 *
 * The log entry will be formatted on the 'finish' event of resp and written
 * using console.info(). */
function handleLog(req, resp) {
  resp.on('finish', () => console.info(formatLog(req, resp)));
}

/* Return a function that schedules HTTP log writing and calls callback */
function wrap(callback) {
  return (req, resp) => {
    handleLog(req, resp);
    callback(req, resp);
  };
}

module.exports.formatLog = formatLog;
module.exports.handleLog = handleLog;
module.exports.wrap = wrap;
