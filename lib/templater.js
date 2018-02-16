
/* A simple HTML templating engine */

/* Do not confuse with template() from util.js. */

const url = require('url');

/* Entities for some characters reserved in HTML */
const HTML_ESCAPES = {'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;',
                      "'": '&#39;'};

/* An identifier */
const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*/;

/* Dot-delimited sequence of identifiers */
const NESTED_IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;

/* Ensure s is a string or number, and return its string representation */
function ensureString(s) {
  if (typeof s != 'string' && typeof s != 'number')
    throw new Error('Bad substitution value type: ' + s);
  return s.toString();
}

/* Escape s to be used in HTML */
function escapeHTML(s) {
  return ensureString(s).replace(/[<>&"']/g, c => HTML_ESCAPES[c]);
}

/* Escape s to be used in a URL */
function escapeURL(s) {
  return encodeURIComponent(ensureString(s)).replace(/'/g, '%27');
}

/* Curried version of template() */
// Although this function does the actual work, it is easier to document the
// other way round.
function compile(input) {
  function checkConstSubs() {
    if (tokens.length != 1)
      throw new Error('Invalid substitution (need 1 token): ' + part);
  }
  function checkVarSubs() {
    if (tokens.length != 2)
      throw new Error('Invalid substitution (need 2 tokens): ' + part);
    if (! NESTED_IDENT.test(tokens[1]))
      throw new Error('Invalid nested identifier: ' + tokens[1]);
  }
  function checkStack(expected, replace = expected) {
    const idx = stack.length - 1;
    if (stack[idx] != expected)
      throw new Error('Invalid substitution: Misplaced ' + part);
    stack[idx] = replace;
  }
  function checkLoopSubs() {
    if (tokens.length != 3)
      throw new Error('Invalid substitution (need 3 tokens): ' + part);
    if (! IDENT.test(tokens[1]))
      throw new Error('Invalid identifier: ' + tokens[1]);
    if (! NESTED_IDENT.test(tokens[2]))
      throw new Error('Invalid nested identifier: ' + tokens[2]);
  }
  const parts = input.split(/(\{\{@|@\}\})/);
  let inSubs = false, stack = [], tokens;
  let code = `(function(parts, values) { return [`;
  for (let i = 0; i < parts.length; i++) {
    if (/,$/.test(code)) code += ` `;
    const part = parts[i];
    if (part == '') {
      continue;
    } else if (part == '{{@') {
      if (inSubs)
        throw new Error('Invalid template: nested substitutions');
      inSubs = true;
      continue;
    } else if (part == '@}}') {
      if (! inSubs)
        throw new Error('Invalid template: orphan substitution closer');
      inSubs = false;
      continue;
    } else if (! inSubs) {
      code += `parts[${i}],`;
      continue;
    }
    tokens = part.split(/\s+/g);
    switch (tokens[0]) {
      case undefined:
        break;
      case '<':
        checkConstSubs();
        code += `'{{@',`;
        break;
      case '>':
        checkConstSubs();
        code += `'@}}',`;
        break;
      case 'raw':
        checkVarSubs();
        code += `ensureString(values.${tokens[1]}),`;
        break;
      case 'html':
        checkVarSubs();
        code += `escapeHTML(values.${tokens[1]}),`;
        break;
      case 'url':
        checkVarSubs();
        code += `escapeURL(values.${tokens[1]}),`;
        break;
      case 'if':
        checkVarSubs();
        code += `...values.${tokens[1]}?[`;
        stack.push('if');
        break;
      case 'unless':
        checkVarSubs();
        code += `...!values.${tokens[1]}?[`;
        stack.push('if');
        break;
      case 'else':
        checkConstSubs();
        checkStack('if', 'else');
        code += `]:[`;
        break;
      case 'foreach':
        checkLoopSubs();
        code += `...[].concat(...values.${tokens[2]}.map(${tokens[1]} => ` +
          `{ values.${tokens[1]} = ${tokens[1]}; return [`;
        stack.push('foreach');
        break;
      case 'end':
        checkConstSubs();
        switch (stack.pop()) {
          case undefined:
            throw new Error('Invalid template: Orphan "end" keyword');
          case 'if':
            code += `]:[],`;
            break;
          case 'else':
            code += `],`;
            break;
          case 'foreach':
            code += `]; })),`;
            break;
          default:
            throw new InternalError('Corrupted lexical stack?!');
        }
        break;
      default:
        throw new Error('Unknown substitution keyword: ' + tokens[0]);
    }
  }
  if (inSubs)
    throw new Error('Invalid template: Orphan substitution opener');
  if (stack.length)
    throw new Error('Invalid template: Unclosed compound');
  code += `].join(''); })`;
  // Here be security bugs.
  return eval(code).bind(null, parts);
}

/* Process the replacement directives in input with data from values */
function template(input, values) {
  return compile(input)(values);
}

/* Return a FileCache callback that templates responses of some MIME type
 *
 * mimeType is the MIME type to process (e.g. "text/html"). processor is
 * a function that takes a (HTTP request) path and returns an object of
 * values to template with. */
function makeFileCacheCallback(mimeType, processor) {
  const cache = new Map();
  return function(req, resp, data) {
    const m = /^([^;]+)(;.*)?$/.exec(resp.getHeader('Content-Type') || '');
    if (! m || m[1] != mimeType) return null;
    const hash = resp.getHeader('ETag');
    if (! hash) return null;
    let code = cache.get(hash);
    if (code == null) {
      code = compile(data.toString('utf-8'));
      cache.set(hash, code);
    }
    return Buffer.from(code(processor(url.parse(req.url).path)), 'utf-8');
  };
}

module.exports.compile = compile;
module.exports.template = template;
module.exports.makeFileCacheCallback = makeFileCacheCallback;
