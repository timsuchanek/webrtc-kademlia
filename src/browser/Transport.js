var Peer = require('peerjs');
var constants = require('./constants');
var EventEmitter = require('eventemitter3');

var _CONNECTIONS = {};

function Transport (myId) {

	this.myId = myId;

  this.peer = new Peer(myId, {
    host: constants.HOST,
    port: constants.HOST_PORT,
    path: '/'
  });

  EventEmitter.call(this);

  /** Pass Through the important events */

};


Transport.prototype.getConnection = function(id, cb, scope) {
	if (_CONNECTIONS(id)) {
		cb.call(scope, _CONNECTIONS(id));
	} else {
		var connection = new Connection(id);

	}
};



function Connection (id) {
	this.id = id;
};

Connection.prototype.send = function(data) {

};

module.exports = Transport;