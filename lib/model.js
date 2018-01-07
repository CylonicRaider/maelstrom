
/* RSS feed data model */

/* As according to RSS 2.0 */

class XMLObject {

  constructor() {
    this._attrs = {};
    this._elements = {};
    this._text = null;
    this._source = null;
  }

  getAttribute(name) {
    return this._attrs[name];
  }

  getElement(name, index = 0) {
    return (this._elements[name] || this._makeElements(name))[index];
  }

  getAllElements(name) {
    return this._elements[name] || this._makeElements(name);
  }

  _makeElements(name) {
    let res = null;
    if (this._source != null) res = this._source(name);
    this._elements[name] = res;
    return res;
  }

  getText(name = null) {
    if (name == null) {
      return this._text;
    } else {
      const el = this.getElement(name);
      if (! el) return undefined;
      return el._text;
    }
  }

}

class Channel extends XMLObject {

  get title() {
    return this.getText('title');
  }

  get link() {
    return this.getText('link');
  }

  get description() {
    return this.getText('description');
  }

}

class Item extends XMLObject {

  constructor(parent) {
    super();
    this.parent = parent;
  }

  get title() {
    return this.getText('title');
  }

  get link() {
    return this.getText('link');
  }

  get description() {
    return this.getText('description');
  }

  get pubDate() {
    return this.getText('pubDate');
  }

}

module.exports.XMLObject = XMLObject;
module.exports.Channel = Channel;
module.exports.Item = Item;
