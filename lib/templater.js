
/* A simple HTML templating engine */

/* Do not confuse with template() from util.js. */

/* Entities for some characters reserved in HTML */
const HTML_ESCAPES = {'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;',
                      "'": '&#39;'};

/* Dot-delimited sequence of identifiers */
const NESTED_IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;

/* Ensure s is a string or number, and return its string representation */
function ensureString(s) {
  if (typeof s != 'string' && typeof s != 'number')
    throw new Error('Bad substitution value type: ' + s);
  return String.valueOf(s);
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
  function checkStack() {
    if (stack[stack.length - 1] != expected)
      throw new Error('Invalid substitution: Misplaced ' + part);
  }
  const parts = input.split(/(\{\{@|@\}\})/);
  let inSubs = false, stack = [];
  let code = "return [";
  for (let i = 0; i < parts.length; i++) {
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
    const tokens = part.split(/\s+/g);
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
        checkVarSubs():
        code += `${tokens[1]}?[`;
        stack.push('if');
        break;
      case 'else':
        checkConstSubs();
        checkStack('if');
        code += `].join(''):[`;
        stack[stack.length - 1] = 'else';
        break;
      case 'end':
        checkConstSubs();
        switch (stack.pop()) {
          case undefined:
            throw new Error('Invalid template: Orphan "end" keyword');
          case 'if':
            code += `].join(''):'',`;
            break;
          case 'else':
            code += `].join(''),`;
            break;
          default:
            throw new InternalError('Corrupted lexical stack?!');
        }
        break;
      default:
        throw new Error('Unknown substitution keyword: ' + tokens[0]);
    }
  }
  if (stack.length)
    throw new Error('Invalid template: Unclosed compound');
  if (inSubs)
    throw new Error('Invalid template: Orphan substitution opener');
  code += "].join('');";
  // Here be security bugs.
  return new Funtion('parts', 'values', code).bind(null, tokens);
}

/* Process the replacement directives in input with data from values */
function template(input, values) {
  return compile(input)(values);
}

module.exports.compile = compile;
module.exports.template = template;
