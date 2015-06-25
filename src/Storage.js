var db = null;
var levelup = null;
var gazel = null;
var node = false;
var constants = require('./constants');
var ownDataCounter = 0;
var util = require('./util');

var _node_get = function(key) {
	return new Promise(function(resolve, reject) {
		this.db.get(key, function(err, value) {
			resolve(value);
		});
	}.bind(this));
};

var _node_put = function(key, value, ownData) {

	ownData = !!ownData;

	if (ownData && ownDataCounter >= constants.MAX_OWN_DATA) {
		return new Promise(function(resolve, reject) {
			resolve();
		});
	}

	return new Promise(function(resolve, reject) {
		this.db.put(key, value, function(err) {
			if (err) return reject(err);
			resolve();
		});
		var bits = util.getMostSignificantBits(key, constants.STORE_KEY_BITS);
		this.db.get('keys:' + bits, function(err, keys) {

			if (!keys || !Array.isArray(keys)) {
				keys = [key];
			} else {
				keys.push(key);
			}

			this.db.put('keys:' + bits, keys, function(err) {
				if (err) throw err;
			});
		}.bind(this));
	}.bind(this));
};

var _node_similiar_keys = function(key, cb, scope) {
	var bits = util.getMostSignificantBits(key, constants.STORE_KEY_BITS);

	this.db.get('keys:' + bits, function(err, value) {
		cb.call(scope, value);
	});
}

var _browser_similiar_keys = function(key, scope) {
	var bits = util.getMostSignificantBits(key, constants.STORE_KEY_BITS);

	this.db.get('keys:' + bits, function(value) {
		cb.call(scope, value);
	});
}

var _browser_get = function(key) {
	return new Promise(function(resolve, reject) {
		this.db.get(key, function(value) {
			if (value) {
				resolve(value);
			} else {
				reject();
			}
		});
	}.bind(this));
};

var _browser_put = function(key, value, ownData) {

	ownData = !!ownData;

	if (ownData && ownDataCounter >= constants.MAX_OWN_DATA) {
		return new Promise(function(resolve, reject) {
			resolve();
		});
	}

	return new Promise(function(resolve, reject) {
		this.db.set(key, value);
		resolve();

		var bits = util.getMostSignificantBits(key, constants.STORE_KEY_BITS);
		this.db.get('keys:' + bits, function(keys) {

			if (!keys) {
				keys = [key];
			} else {
				keys.push(key);
			}

			this.db.set('keys:' + bits, keys);
		}.bind(this));
	}.bind(this));
};

function Storage(id) {
  this._data = {};
  this.id    = id || 'kademlia';
  this.keys  = [];


  if (node) {
  	this.db = levelup('./' + this.id);
  } else {
  	this.db = gazel.createClient(this.id);
  }
}

if (typeof window === 'undefined') {
	// node
	levelup = require('level');
	node = true;
	Storage.prototype.put = _node_put;
	Storage.prototype.get = _node_get;
	Storage.prototype.getSimiliarKeys = _node_similiar_keys;
} else {
	// browser
	gazel = require('gazel');

	Storage.prototype.put = _browser_put;
	Storage.prototype.get = _browser_get;
	Storage.prototype.getSimiliarKeys = _browser_similiar_keys;
}

module.exports = Storage;