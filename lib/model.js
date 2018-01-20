
/* Minimalistic RSS feed data model */

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
    let res = [];
    if (this._source != null) res = this._source(name) || [];
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

  get items() {
    return this.getAllElements('item');
  }

}

class Item extends XMLObject {

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

class Config extends XMLObject {

  get title() {
    return this.getText('title');
  }

  get channels() {
    return this.getAllElements('channel');
  }

}

class ConfigChannel extends XMLObject {

  get codename() {
    return this.getText('codename');
  }

  get letter() {
    return this.getElement('codename').getAttribute('letter');
  }

  get title() {
    return this.getElement('title');
  }

  get link() {
    return this.getText('link');
  }

  get description() {
    return this.getElement('description');
  }

}

module.exports.XMLObject = XMLObject;
module.exports.Channel = Channel;
module.exports.Item = Item;
