
/* RSS feed data model */

/* As according to RSS 2.0 */

class XMLObject {

  constructor() {
    this._attrs = {};
    this._elements = {};
    this._text = null;
  }

  getAttribute(name) {
    return this._attrs[name];
  }

  countElements(name) {
    return (this._elements[name] || []).length;
  }

  getElement(name, index = 0) {
    return (this._elements[name] || [])[index];
  }

  getText(name = null) {
    if (name == null) {
      return this._text;
    } else {
      const el = getElement(name);
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

}

module.exports.XMLObject = XMLObject;
module.exports.Channel = Channel;
module.exports.Item = Item;
