
/* Miscellaneous utilities */

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
    (m) => (m[1] == '$') ? '$' : match[m[1].replace(/^\{(.*)\}$/, '$1')]);
}

module.exports.literalRE = literalRE;
module.exports.template = template;
