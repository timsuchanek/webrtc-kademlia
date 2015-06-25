var Peer = require('peerjs');
var constants = require('./constants');
var EventEmitter = require('eventemitter3');

var _CONNECTIONS = {};

function Transport (myId) {

	var that = this;

	this.myId = myId;

  this.peer = new Peer(myId, {
    host: constants.HOST,
    port: constants.HOST_PORT,
    path: '/'
  });

  EventEmitter.call(this);

  /** Pass Through the events we need */

  this.peer.on('error', function(err) {
  	that.emit('error', err);
  });

  this.peer.on('open', function(id) {
  	that.emit('open', id);
  });

  this.peer.on('connection', function(conn) {
  	var firstRequest = true;
  	conn.on('data', function(res) {
  		if (firstRequest) {
  			firstRequest = false;

  			if (res.id) {
  				_CONNECTIONS[res.id] = conn;
  			}

  		}
  	});
  });


};


Transport.prototype.getConnection = function(id, cb, scope) {
	if (_CONNECTIONS(id)) {
		cb.call(scope, _CONNECTIONS(id));
	} else {
		var peerConnection = this.peer.connect(id);

		var connection = new Connection(id, peerConnection);

		_CONNECTIONS[id] = connection;

		connection.on('open', function() {
			cb.call(scope, connection);
		});

	}
};



function Connection (id, peerConnection) {
	var that = this;

	this.id = id;
	this.peerConnection = peerConnection;


	EventEmitter.call(this);

	this.peerConnection.on('open', function() {
		that.emit('open');
	});

	this.peerConnection.on('')
};

Connection.prototype.send = function(data) {

};

module.exports = Transport;