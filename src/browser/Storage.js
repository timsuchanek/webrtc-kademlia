module.exports = Storage;
var util = require('./util');

function Storage() {
  this._data = {};
}

Storage.prototype.store = function(key, value) {
  this._data[key] = value;
  util.drawStorage(this);
};

Storage.prototype.get = function(key) {
  if (this._data.hasOwnProperty(key)) {
    return this._data[key];
  } else {
    return null;
  }
}