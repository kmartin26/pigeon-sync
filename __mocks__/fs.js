const { fs } = require('memfs');

// memfs ignores `autoClose: false` once Node destroys the stream after 'finish'
// (autoDestroy), closing an fd the caller still owns. Node's fs ties the two.
const createWriteStream = fs.createWriteStream;
fs.createWriteStream = function(path, options) {
  if (options && typeof options === 'object' && options.autoClose === false && options.autoDestroy === undefined) {
    options = Object.assign({}, options, { autoDestroy: false });
  }
  return createWriteStream.call(this, path, options);
};

// memfs exposes the stream classes as getters that read a symbol on `this`.
// graceful-fs (used by fs-extra) clones fs without symbols, so the getters
// break on the clone. Turn them into plain properties.
['ReadStream', 'WriteStream', 'FileReadStream', 'FileWriteStream'].forEach(name => {
  Object.defineProperty(fs, name, {
    value: fs[name],
    writable: true,
    enumerable: true,
    configurable: true,
  });
});

// fs-extra expects the native variants to exist
fs.realpath.native = fs.realpath;
fs.realpathSync.native = fs.realpathSync;

fs.__mock__ = true;
module.exports = fs;
