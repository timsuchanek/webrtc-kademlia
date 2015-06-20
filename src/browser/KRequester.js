

var RPCS = {
	PING_REQ: 0,
	PING_RES: 1,

	FIND_NODE_REQ: 2,
	FIND_NODE_RES: 3

	FIND_VALUE_REQ: 4,
	FIND_VALUE_RES: 5,

	STORE_REQ: 6,
	STORE_RES: 7,

	NODE_LOOKUP_REQ: 8,
	NODE_LOOKUP_RES: 9,

	VALUE_LOOKUP_REQ: 10,
	VALUE_LOOKUP_RES: 11
};

var STATES = {
	SUCCESS: 0,
	FAIL: 1
};

this.transport
	.getConnection(id, ['brokerNode1', 'brokerNode2'])
	.then(_find_node, _err);



KRequester.prototype.PING = function(peer) {
	return new Promise(function(resolve, reject) {

		this.transport
			.send(peer)
			.payload({
				rpc: RPCS.PING_REQ
			})
			.then(function success(res) {

				this.handleRoutingTable(RPCS.PING_RES, peer, res);

				resolve(res);

			}.bind(this), function error(err) {

				this.handleRoutingTable(RPCS.PING_RES, peer, err);

				reject(err);

			}.bind(this));

	}.bind(this));
}

KClient.prototype.FIND_NODE = function(peer, node) {
	return new Promise(function(resolve, reject) {

		this.transport
			.send(peer)
			.payload({
				rpc: RPCS.FIND_NODE_REQ,
				node: node
			})
			.then(function success(res) {

				this.handleRoutingTable(RPCS.FIND_NODE_RES, peer, res);

				if (res && res.nodes && Array.isArray(res.nodes)) {
					resolve(res);
				} else {
					reject(res);
				}

			}.bind(this), function fail(err) {

				this.handleRoutingTable(RPCS.FIND_NODE_RES, peer, err);

				reject(err);

			}.bind(this));

	}.bind(this));
}

KRequester.prototype.FIND_VALUE = function(peer, key) {
	return new Promise(function(resolve, reject) {

		this.transport
			.send(peer)
			.payload({
				rpc: RPCS.FIND_VALUE_REQ,
				key: key
			})
			.then(function success(res) {

				this.handleRoutingTable(RPCS.FIND_VALUE_RES, peer, res);

				resolve(res);

			}.bind(this), function error(err) {

				this.handleRoutingTable(RPCS.FIND_VALUE_RES, peer, err);

				reject(err);

			}.bind(this));

	}.bind(this));
}

KRequester.prototype.STORE = function(peer, key, value) {
	return new Promise(function(resolve, reject) {

		this.transport
			.send(peer)
			.payload({
				rpc: RPCS.STORE_REQ,
				key: key,
				value: value
			})
			.then(function success(res) {

				this.handleRoutingTable(RPCS.STORE_RES, peer, res);

				resolve(res);

			}.bind(this), function fail(err) {

				this.handleRoutingTable(RPCS.STORE_RES, peer, err);

				reject(err);

			}.bind(this));

	}.bind(this));
}

KRequester.prototype.VALUE_LOOKUP = function(key) {
	return new Promise(function(resolve, reject) {

		var peers = this.getKNearest(key);

		function lookup(peer) {

			var startTime = Date.now();
			var id = util.sha1(this.myId + Date.now());

			this.transport
				.send(peer)
				.timeout(constants.LOOKUP_TIMEOUT) // eg. 100000 ms
				.payload({
					rpc: RPCS.VALUE_LOOKUP_REQ,
					key: key,
					pre: [this.myId],
					id: id
				})
				.then(function succes(res) {
					if (res.id === id) {

						this.handleRoutingTable(RPCS.VALUE_LOOKUP_RES, peer, res);

						resolve(res);

					} else {
						// log
						throw new Error('Wrong ID');

						reject(res);
					}
				}.bind(this), function fail(err) {

					this.handleRoutingTable(RPCS.VALUE_LOOKUP_RES, peer, err);

					if (peers.length > 0) {
						lookup.call(this, peers.shift());
					} else {
						reject(err);
					}
				}.bind(this));
		}

		lookup.call(this, peers.shift());

	}.bind(this));
}

KRequester.prototype.NODE_LOOKUP = function(key) {
	return new Promise(function(resolve, reject) {

		var peers = this.getKNearest(key);

		function lookup(peer) {
			this.transport
				.send(peer)
				.timeout(constants.LOOKUP_TIMEOUT) // eg. 100000 ms
				.payload({
					rpc: RPCS.NODE_LOOKUP_REQ,
					key: key
				})
				.then(function succes(res) {

					this.handleRoutingTable(RPCS.NODE_LOOKUP_RES, peer, res);

					resolve(res);

				}, function fail(err) {

					this.handleRoutingTable(RPCS.NODE_LOOKUP_RES, peer, err);

					if (peers.length > 0) {
						lookup.call(this, peers.shift());
					} else {
						reject(err);
					}
				}.bind(this))
		}

		lookup.call(this, peers.shift());

	}.bind(this));
}