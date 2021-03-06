
/* Miscellaneous utilities */

const fs = require('fs');
const http = require('http');

/* Download a resource from url to path, and invoke cb in the end. */
function download(url, path, cb) {
  const tempPath = `${path}.${Math.floor(Math.random() * 1e12)}`;
  http.get(url, (res) => {
    const code = res.statusCode;
    if (code != 200) {
      res.resume();
      cb(new Error(`Download of ${url} failed (status ${code})`));
      return;
    }
    res.pipe(fs.createWriteStream(tempPath));
    res.on('end', () => {
      fs.rename(tempPath, path, err => cb(err));
    });
  }).on('error', err => cb(err));
}

/* Take this! */
function leftpad(x, n, p = ' ') {
  x = x.toString();
  while (x.length < n) x = p + x;
  return x;
}

/* Return a regular expression that matches only str */
function literalRE(str) {
  return new RegExp(`^${str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}

/* Replace references to properties of match in template
 *
 * References are defined using as per the following regular expression
 *    /\$(\$|\d|\{[^}]*\})/g,
 * and are replaced by literal dollar signs (if the capturing parentheses
 * matched a dollar sign), or object properties (named by the substring
 * matched by the capturing parenthesis, stripping surrounding braces)
 * otherwise.
 * Despite their names, match must not necessarily be a regular expression
 * match result, and template should *not* be a template string literal (as
 * that would have been processed by the language before this function could
 * do that). */
function template(match, template) {
  return template.replace(/\$(\$|\d|\{[^}]*\})/g,
    m => (m[1] == '$') ? '$' : match[m[1].replace(/^\{(.*)\}$/, '$1')]);
}

module.exports.download = download;
module.exports.leftpad = leftpad;
module.exports.literalRE = literalRE;
module.exports.template = template;
