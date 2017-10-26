
/* A ReadStream backed by a Buffer */

const stream = require('stream');

/* The main class */
class BufferReader extends stream.Readable {

  constructor(buffer) {
    super();
    this.buffer = buffer;
    this.pos = 0;
  }

  _read(size) {
    const remaining = this.buffer.length - this.pos;
    if (remaining == 0) {
      this.push(null);
    } else {
      const effSize = Math.min(size, remaining);
      this.push(this.buffer.slice(this.pos, this.pos + size));
      // As per the example in the API docs, pushing null is always
      // permissible...
      if (effSize != size) this.push(null);
      this.pos += size;
    }
  }

}

module.exports = BufferReader;
