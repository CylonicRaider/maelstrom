
/* A simple HTML templating engine */

/* Do not confuse with template() from util.js. */

/* Entities for some characters reserved in HTML */
const HTML_ESCAPES = {'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;',
                      "'": '&#39;'};

/* Dot-delimited sequence of identifiers */
const NESTED_IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;

/* Escape s to be used in HTML */
function escapeHTML(s) {
  return s.replace(/[<>&"']/g, c => HTML_ESCAPES[c]);
}

/* Curried version of template() */
// Although this function does the actual work, it is easier to document the
// other way round.
function compile(input) {
  const parts = input.split(/(\{\{@|@\}\})/);
  let inSubs = false;
  let code = 'return [';
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part == '{{@') {
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
      case 'raw':
        if (tokens.length != 2)
          throw new Error('Invalid substitution: ' + part);
        if (! NESTED_IDENT.test(tokens[1]))
          throw new Error('Invalid nested identifier: ' + tokens[1]);
        code += `values.${tokens[1]},`;
        break;
      case 'html':
        if (tokens.length != 2)
          throw new Error('Invalid substitution: ' + part);
        if (! NESTED_IDENT.test(tokens[1]))
          throw new Error('Invalid nested identifier: ' + tokens[1]);
        code += `escapeHTML(values.${tokens[1]}),`;
        break;
      default:
        throw new Error('Unknown substitution keyword: ' + tokens[0]);
    }
  }
  if (inSubs)
    throw new Error('Invalid template: orphan substitution opener');
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