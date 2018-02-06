
/* A simple HTML templating engine */

/* Do not confuse with template() from util.js. */

function template(input, values) {
  return input.split(/\{\{@(.*?)@\}\}/g).map((part, index) => {
    if (index % 2 == 0) return part;
    throw new Error('Unsupported substitution: ' + part);
  }).join('');
}

module.exports.template = template;
