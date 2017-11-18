
/* RSS feed data model */

/* As according to RSS 2.0 */

class Channel {

  constructor() {
    this.attrs = {};
    this.items = [];
  }

  get title() {
    return this.attrs.title;
  }

  get link() {
    return this.attrs.link;
  }

  get description() {
    return this.attrs.description;
  }

}

class Item {

  constructor(parent) {
    this.parent = parent;
    this.attrs = {};
  }

  get title() {
    return this.attrs.title;
  }

  get link() {
    return this.attrs.link;
  }

  get description() {
    return this.attrs.description;
  }

}

module.exports.Channel = Channel;
module.exports.Item = Item;
