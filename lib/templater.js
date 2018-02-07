
/* A simple HTML templating engine */

/* Do not confuse with template() from util.js. */

/* Entities for some characters reserved in HTML */
const HTML_ESCAPES = {'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;',
                      "'": '&#39;'};

/* Obtain the properts of values corresponding to name
 *
 * name may be a dot-delimited sequence of identifiers to retrieve
 * properties of nested objects. */
function resolveName(values, name) {
  let ret = values;
  name.split('.').forEach((p) => { ret = ret[p]; });
  return ret;
}

/* Escape s to be used in HTML */
function escapeHTML(s) {
  return s.replace(/[<>&"']/g, c => HTML_ESCAPES[c]);
}

/* Process the replacement directives in input with data from values */
function template(input, values) {
  return input.split(/\{\{@(.*?)@\}\}/g).map((part, index) => {
    if (index % 2 == 0) return part;
    const tokens = part.split(/\s+/g);
    switch (tokens[0]) {
      case 'raw':
        if (tokens.length != 2)
          throw new Error('Invalid substitution: ' + part);
        const subs = resolveName(values, tokens[1]);
        if (subs == null) subs = '';
        return subs;
      case 'html':
        if (tokens.length != 2)
          throw new Error('Invalid substitution: ' + part);
        const subs = resolveName(values, tokens[1]);
        if (subs == null) subs = '';
        return escapeHTML(String.valueOf(subs));
      default:
        throw new Error('Unknown substitution keyword: ' + tokens[0]);
    }
  }).join('');
}

module.exports.template = template;
