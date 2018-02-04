
/* RSS and configuration data model */

/* Merge multiple item arrays by date */
function mergeChannels(channels) {
  let items = Array.prototype.concat.apply([], channels.map(c => c.items));
  items.sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate));
  return items;
}

/* Base class for all XML wrapper objects defined here */
class XMLObject {

  /* Initialize an instance */
  constructor() {
    this._attrs = {};
    this._elements = {};
    this._text = null;
    this._source = null;
  }

  /* Return the value of the XML attribute named name, or undefined */
  getAttribute(name) {
    return this._attrs[name];
  }

  /* Return the child element of type name, at index index; or undefined */
  getElement(name, index = 0) {
    return (this._elements[name] || this._makeElements(name))[index];
  }

  /* Return an array of child elements of type name */
  getAllElements(name) {
    return this._elements[name] || this._makeElements(name);
  }

  /* Create an array of child elements and cache it */
  _makeElements(name) {
    let res = [];
    if (this._source != null) res = this._source(name) || [];
    this._elements[name] = res;
    return res;
  }

  /* Return the text of this element or of a child one; or undefined */
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

/* Something similar to an RSS item */
class BaseItem extends XMLObject {

  /* The title of the object */
  get title() {
    return this.getText('title');
  }

  /* A URL corresponding to this object */
  get link() {
    return this.getText('link');
  }

  /* A textual description of this object */
  get description() {
    return this.getText('description');
  }

}

/* A RSS 2.0 channel */
class Channel extends BaseItem {

  /* An array of the items of the channel */
  get items() {
    return this.getAllElements('item');
  }

}

/* An item of a RSS 2.0 channel */
class Item extends BaseItem {

  /* The publication date of the item, as a RFC 2822 date */
  get pubDate() {
    return this.getText('pubDate');
  }

}

/* The configuration root node */
class Config extends XMLObject {

  /* Title to display to the user */
  get title() {
    return this.getText('title');
  }

  /* The "main" channel, merging the entries of all others */
  get mainChannel() {
    return this.getElement('main');
  }

  /* An array of the configuration of channels to be tracked */
  get channels() {
    return this.getAllElements('channel');
  }

}

/* The description of a channel in configuration */
class ConfigChannel extends BaseItem {

  /* A short ASCII string naming this channel */
  get codename() {
    return this.getText('codename');
  }

  /* A single-letter abbreviation for this channel, or undefined */
  get letter() {
    return this.getElement('codename').getAttribute('letter');
  }

}

/* A channel automatically merging source channels in the background */
class MergingChannel extends BaseItem {

  constructor() {
    super();
    // Deliberately invoking setter.
    this.sources = [];
  }

  get sources() {
    return this._sources;
  }

  set sources(sources) {
    this._sources = sources;
    this.updateItems();
  }

  get items() {
    return this._items;
  }

  updateItems() {
    this._items = mergeChannels(sources);
  }

}

module.exports.mergeChannels = mergeChannels;
module.exports.XMLObject = XMLObject;
module.exports.Channel = Channel;
module.exports.Item = Item;
module.exports.Config = Config;
module.exports.ConfigChannel = ConfigChannel;
module.exports.MergingChannel = MergingChannel;
