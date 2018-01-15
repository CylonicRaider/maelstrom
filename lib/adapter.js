
/* Adapter from xml2js to the internal representation */

const model = require('./model.js');

/* Mapping from element names to data types */
const TYPES = {channel: model.Channel, item: model.Item};
const DEFTYPE = model.XMLObject;

/* Convert an array of xml2js objects to an array of data model objects */
function wrapList(data, name, types) {
  if (data == null) return null;
  return data.map((el) => adapter(el, name, types));
}

/* Convert an xml2js object to a data model object
 *
 * data is the xml2js representation of the input, name is the element
 * name of it. The return value is equipped with closures to invoke
 * adapter() whenever nested elements are requested. */
function adapter(data, name, types = {}) {
  if (data == null) return null;
  const type = types[name] || DEFTYPE;
  const ret = new type();
  if (typeof data == 'string') {
    ret._text = data;
  } else if (Array.isArray(data)) {
    throw new Error('Trying to wrap an array as a single object');
  } else {
    ret._attrs = data.$ || {};
    ret._text = data._;
    if (ret._text === undefined) ret._text = null;
    ret._source = (name) => wrapList(data, name, types);
  }
  return ret;
}

/* Convert an xml2js object to a RSS data model object
 *
 * This emits specialized data model types where appropriate, in contrast to
 * the plain adapter(). */
function rssAdapter(data, name) {
  return adapter(data, name, TYPES);
}

module.exports.adapter = adapter;
module.exports.rssAdapter = rssAdapter;