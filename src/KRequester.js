var constants = require('./constants');
var Q = require('q');
var RPCS = constants.RPCS;
var STATES = constants.STATES;

function KRequester (myID, transport, routingTable) {
	this.myID         = myID;
	this.transport    = transport;
	this.routingTable = routingTable;
}

KRequester.prototype.handleRoutingTable = function(rpc, peer, res, err) {


	res = res || null;
	var ok = !err;

	// console.log('handleRoutingTable(', rpc, peer, res, err, ok, ')');

	var response = {};
	response[peer] = ok;

	this.routingTable.receivedRPCResponse(response);

	var nodes = res !== null && res.nodes ? res.nodes : null;

	if (nodes !== null) {
		var ids = {};

		nodes.forEach(function(node) {
			if (node !== peer) {
				ids[node] = true;
			}
		});

		if (Object.keys(ids).length > 0) {
			this.routingTable.receivedRPCResponse(ids);
		}
	}

};


KRequester.prototype.PING = function(peer) {
	return new Q.Promise(function(resolve, reject) {

		this.transport
			.send(peer)
			.payload({
				rpc: RPCS.PING_REQ
			})
			.then(function success(res, rtt) {

				this.handleRoutingTable(RPCS.PING_RES, peer, res, null);

				resolve(res);

			}.bind(this), function error(err) {

				this.handleRoutingTable(RPCS.PING_RES, peer, null, err);

				reject(err);

			}.bind(this));

	}.bind(this));
}

KRequester.prototype.FIND_NODE = function(peer, node) {
	return new Q.Promise(function(resolve, reject) {

		this.transport
			.send(peer)
			.payload({
				rpc: RPCS.FIND_NODE_REQ,
				node: node
			})
			.then(function success(res, rtt) {

				this.handleRoutingTable(RPCS.FIND_NODE_RES, peer, res, null);

				if (res && res.nodes && Array.isArray(res.nodes)) {
					resolve(res);
				} else {
					reject(res);
				}

			}.bind(this), function fail(err) {

				this.handleRoutingTable(RPCS.FIND_NODE_RES, peer, null, err);

				reject(err);

			}.bind(this));

	}.bind(this));
}

KRequester.prototype.FIND_VALUE = function(peer, key) {
	return new Q.Promise(function(resolve, reject) {

		this.transport
			.send(peer)
			.payload({
				rpc: RPCS.FIND_VALUE_REQ,
				key: key
			})
			.then(function success(res, rtt) {

				this.handleRoutingTable(RPCS.FIND_VALUE_RES, peer, res, null);

				resolve(res);

			}.bind(this), function error(err) {

				this.handleRoutingTable(RPCS.FIND_VALUE_RES, peer, null, err);

				reject(err);

			}.bind(this));

	}.bind(this));
}

KRequester.prototype.STORE = function(peer, key, value) {
	return new Q.Promise(function(resolve, reject) {

		this.transport
			.send(peer)
			.payload({
				rpc: RPCS.STORE_REQ,
				key: key,
				value: value
			})
			.then(function success(res, rtt) {

				this.handleRoutingTable(RPCS.STORE_RES, peer, res, null);

				resolve(res);

			}.bind(this), function fail(err) {

				this.handleRoutingTable(RPCS.STORE_RES, peer, null, err);

				reject(err);

			}.bind(this));

	}.bind(this));
}

KRequester.prototype.VALUE_LOOKUP = function(key) {
	console.log('val');
	return new Q.Promise(function(resolve, reject) {

		var peers = this.routingTable.getKNearest(key);

		// console.log('peers', peers);

		function lookup(peer) {

			// console.log('lookup', peer);

			var startTime = Date.now();

			this.transport
				.send(peer)
				.timeout(constants.LOOKUP_TIMEOUT) // eg. 100000 ms
				.payload({
					rpc: RPCS.VALUE_LOOKUP_REQ,
					key: key,
					pre: [this.myId]
				})
				.then(function success(res, rtt) {
					console.log('suc');
					this.handleRoutingTable(RPCS.VALUE_LOOKUP_RES, peer, res, null);

					resolve(res);

				}.bind(this), function fail(err) {

					console.log('fai');
					this.handleRoutingTable(RPCS.VALUE_LOOKUP_RES, peer, null, err);

					if (peers.length > 0) {
						lookup.call(this, peers.shift());
					} else {
						reject(err);
					}
				}.bind(this));
		}

		console.log(peers.length);

		if (peers.length > 0) {
			lookup.call(this, peers.shift());
		} else {
			reject(new Error('No peers.'));
		}

	}.bind(this));
}

KRequester.prototype.NODE_LOOKUP = function(key) {
	key = key || null;



	return new Q.Promise(function(resolve, reject) {

		if (key === null) {
			return reject(new Error('Key is not set.'));
		}

		var peers = this.routingTable.getKNearest(key);


		// console.log('jipi', peers);

		function lookup(peer) {

			if (peer === 'peer') return reject();

			// console.log('doing NODE_LOOKUP', key);
			this.transport
				.send(peer)
				.timeout(constants.LOOKUP_TIMEOUT) // eg. 100000 ms
				.payload({
					rpc: RPCS.NODE_LOOKUP_REQ,
					key: key
				})
				.then(function succes(res, rtt) {

					// console.log('node lookup good answer', peer);
					this.handleRoutingTable(RPCS.NODE_LOOKUP_RES, peer, res, null);

					resolve(res);

				}.bind(this), function fail(err) {

					// console.log('node lookup bad answer', err);
					this.handleRoutingTable(RPCS.NODE_LOOKUP_RES, peer, null, err);

					if (peers.length > 0) {
						var newPeer = peers.shift();
						lookup.call(this, newPeer, peers.length);
					} else {
						reject(err);
					}
				}.bind(this))
		}

		if (peers.length > 0) {
			lookup.call(this, peers.shift());
		} else {
			reject(new Error('No peers.'));
		}

	}.bind(this));
}

module.exports = KRequester;