
/* Adapter from xml2js to the internal representation */

const fs = require('fs');

const xml2js = require('xml2js');

const model = require('./model.js');

/* Mapping from element names to data types */
const DEFTYPE = model.XMLObject;
const TYPES_RSS = {channel: model.Channel, item: model.Item};
const TYPES_CONFIG = {config: model.Config, main: model.MergingChannel,
  channel: model.ConfigChannel};

/* Convert an array of xml2js objects to an array of data model objects */
function wrapList(data, name, types) {
  if (data == null) return null;
  return data.map(el => adapter(el, name, types));
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
    ret._source = name => wrapList(data[name], name, types);
  }
  return ret;
}

/* Convert an xml2js object to a RSS data model object */
function rssAdapter(data, name) {
  return adapter(data, name, TYPES_RSS);
}

/* Convert an xml2js object to a configuration object */
function configAdapter(data, name) {
  return adapter(data, name, TYPES_CONFIG);
}

/* Parse the file named by path asynchronously
 *
 * The contents are read into memory, cvt is applied to them, and cb is
 * used on the result. If cvt is null, adapter() is used.
 * cb received two parameters, an error object and a data object (if there
 * was no error). */
function parseFile(path, cvt, cb) {
  if (cvt == null) cvt = adapter;
  fs.readFile(path, (err, data) => {
    if (err) return cb(err);
    xml2js.parseString(data, (err, data) => {
      if (err) return cb(err);
      if (! data) return cb(null, null);
      const key = Object.keys(data)[0];
      if (! key) return cb(null, null);
      cb(null, cvt(data[key], key));
    });
  });
}

module.exports.adapter = adapter;
module.exports.rssAdapter = rssAdapter;
module.exports.configAdapter = configAdapter;
module.exports.parseFile = parseFile;
