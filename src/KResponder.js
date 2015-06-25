var _ = require('lodash');
var constants = require('./constants');
var util = require('./util');
var RPCS = constants.RPCS;
var STATES = constants.STATES;


function _arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length != b.length) return false;

  // If you don't care about the order of the elements inside
  // the array, you should sort both arrays here.

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function KResponder(myID, transport, routingTable, storage) {
	this.myID         = myID;
	this.transport    = transport;
	this.routingTable = routingTable;
	this.storage      = storage;

	this.transport.on('request', function(req) {
		this.handleRequest(req.peerID, req);
	}.bind(this));
}


KResponder.prototype.handleRequest = function(peer, req) {

	var data = req.data
	var rpcs = Object.keys(RPCS);
	rpc      = rpcs[data.rpc];

	console.log('Got request ', rpc, 'from', peer, data);
	this[rpc](peer, req);
}

KResponder.prototype.PING_REQ = function(peer, req) {
	req.respond()
	.payload({})
	.then(function success() {
		// log
	}, function fail() {
		// log
	});
};

KResponder.prototype.FIND_NODE_REQ = function(peer, req) {

	var data = req.data;
	var node  = data.node || null;
	var nodes = node ? this.routingTable.getKNearest(node): null;

	req.respond()
	.payload({
		nodes: nodes,
		rpc: RPCS.FIND_NODE_RES
	})
	.then(function success() {
		// log
	}, function failure() {
		// log
	});

};

KResponder.prototype.FIND_VALUE_REQ = function(peer, req) {

	var data = req.data;
	var key   = data.key || null;
	var value = this.storage.get(key);
	var nodes = value ? null : this.routingTable.getKNearest(key);

	req.respond()
	.payload({
		nodes: nodes,
		value: value,
		rpc: RPCS.FIND_VALUE_RES
	})
	.then(function success() {
		// log
	}, function failure() {
		// log
	});

};

KResponder.prototype.STORE_REQ = function(peer, req) {

	var data    = req.data;
	var key     = data.key || null;
	var value   = data.value || null;
	var payload = {
		rpc: RPCS.STORE_RES
	};

	if (key !== null && value !== null) {
		this.storage.put(key, value);
		payload.status = STATES.SUCCESS;
	} else {
		payload.status = STATES.FAIL;
	}

	req.respond()
	.payload(payload)
	.then(function success(res, delta) {
		// log
	}, function fail() {
		// log
	});

};


/**
 * If we consider the recursive Lookup from R/Kademlia, this is the way forth.
 * VALUE_LOOKUP_RES on the other hand is the way back.
 * @param {[type]} peer [description]
 * @param {[type]} req  [description]
 */
KResponder.prototype.VALUE_LOOKUP_REQ = function(peer, req) {

	var data = req.data;

	var key = data.key || null;
	var pre = data.pre || [];
	var id = data.id || null;

	if (key !== null) {
		var val = this.storage.get(key)
		.then(function(value) {

			// console.log('GETTTINNNG KEYYYY');

			/**
			 * Easiest Case: We are the end of the chain. The req object
			 * is already directed to our predecessor in the chain.
			 * If he's not available, try the next and the next...
			 */

			if (value) {

			 	var payload = {
			 		rpc: RPCS.VALUE_LOOKUP_RES,
			 		successor: this.myID,
			 		answer: {}, // WebRTC respond Object for Signaling
			 		nodes: this.routingTable.getKNearest(key),
			 		id: id,
			 		pre: pre,
			 		value: value
			 	};

			 	req.respond()
			 	.payload(payload)
			 	.then(function success(res, delta) {
			 		// console.log('answerd');
			 		// log
			 	}, function didntWork(err) {
			 		// try alternative nodes in the chain
			 		// console.log('nooo', err);
			 		if (pre.length > 1) {
			 			var peer = pre.pop();

			 			this.transport
			 			.send(peer)
			 			.payload(payload)
			 			.then(function success() {
			 				// log
			 			}, function fail(err) {

			 				didntWork.call(this);

			 			}.bind(this));

			 		} else {
			 			// fail. log
			 		}
			 	}.bind(this));


			 } else {
			 	// I'm _NOT_ the end of the chain. So continue the way forward
			 	// with the nearest Node I know

			 	var kNearest = this.routingTable.getKNearest(key);

			 	var payload = {
			 		rpc: RPCS.VALUE_LOOKUP_REQ,
			 		key: key,
			 		pre: pre.concat(this.myID),
			 		id: id
			 	};

			 	feedForward.call(this, kNearest.shift());

			 	function feedForward(peer) {
			 		this.transport
			 			.send(nearest)
			 			.timeout(constants.LOOKUP_TIMEOUT)
			 			.payload(payload)
			 			.then(function success(res, delta) {
			 				// log
			 			}, function fail() {

			 				// oops, didn't work. Try again.

			 				var peer = kNearest.shift();

			 				if (peer) {
			 					feedForward.call(this, peer);
			 				} else {
			 					// fail. log
			 				}

			 			}.bind(this));
			 	}
			 }


		}.bind(this), function(no) {



		}.bind(this));

	}
};




KResponder.prototype.VALUE_LOOKUP_RES = function(peer, req) {



	var data      = req.data;
	var successor = data.successor || null;
	var answer    = data.answer    || null;
	var nodes     = data.nodes     || [];
	var id        = data.id        || null;
	var pre       = data.pre       || null;

	if (successor !== null && id !== null && pre !== null) {

		if (pre.length < 2) {
			throw new Error('Oh oh. We shouldn\'t be here.');
		}

		var peer = null;

		if (pre[pre.length - 1] === this.myID) {
			pre.pop();
			peer = pre.pop();
		} else {
			peer = pre.pop();
		}

		var kNearest = this.routingTable.getKNearest(key);
		var kNearestMerged = util.mergeKNearest(key, kNearest, nodes);


		var payload = {
			rpc: RPCS.VALUE_LOOKUP_RES,
			successor: successor,
			answer: answer, // WebRTC respond Object for Signaling
			nodes: kNearestMerged,
			id: id,
			pre: pre
		};

		propagateBack(peer);

		function propagateBack(peer) {
			this.transport
				.send(peer)
				.payload(payload)
				.then(function success(res, delta) {
					// log
				}, function fail() {
					var peer = pre.pop();

					if (peer) {
						propagateBack(peer);
					}

				});
		}



	}

}




/**
 * If we consider the recursive Lookup from R/Kademlia, this is the way forth.
 * NODE_LOOKUP_RES on the other hand is the way back.
 * @param {[type]} peer [description]
 * @param {[type]} req  [description]
 */
KResponder.prototype.NODE_LOOKUP_REQ = function(peer, req) {

	var data  = req.data;
	var key   = data.key || null;
	var pre   = data.pre || [];
	var id    = data.id || null;
	var nodes = data.nodes || [];

	if (key !== null) {
		var kNearest = this.routingTable.getKNearest(key);
		var kNearestMerged = util.mergeKNearest(key, kNearest, nodes);

		var kNearestFound = false;

		if (_arraysEqual(kNearestMerged, nodes)) {
			kNearestFound = true;
		}

		/**
		 * Easiest Case: We are the end of the chain. The req object
		 * is already directed to our predecessor in the chain.
		 * If he's not available, try the next and the next...
		 */

		// console.log('Got node lookup request', req.data);

		if (kNearestMerged.length < constants.K) {
			kNearestMerged = kNearestMerged.concat(this.myID);
		}

		if (kNearestFound) {

			var payload = {
				rpc: RPCS.NODE_LOOKUP_RES,
				successor: this.myID,
				answer: {}, // WebRTC respond Object for Signaling
				nodes: kNearestMerged,
				id: id,
				pre: pre
			};

				req.respond()
				.payload(payload)
				.then(function success(res, delta) {
					// log
				}, function didntWork() {
					// try alternative nodes in the chain
					if (pre.length > 1) {
						var peer = pre.pop();

						this.transport
						.send(peer)
						.payload(payload)
						.then(function success() {
							// log
						}, function fail(err) {

							didntWork.call(this);

						}.bind(this));

					} else {
						// fail. log
					}
				}.bind(this));

		} else {

			// I'm _NOT_ the end of the chain. So continue with the nearest Node I know

			var kNearest = this.routingTable.getKNearest(key);

			var payload = {
				rpc: RPCS.NODE_LOOKUP_REQ,
				key: key,
				pre: pre.concat(this.myID),
				id: id
			};

			feedForward.call(this, kNearest.shift());

			function feedForward(peer) {
				this.transport
					.send(nearest)
					.timeout(constants.LOOKUP_TIMEOUT)
					.payload(payload)
					.then(function success(res, delta) {
						// log
					}, function fail() {

						// oops, didn't work. Try again.

						var peer = kNearest.shift();

						if (peer) {
							feedForward.call(this, peer);
						} else {
							// fail. log
						}

					}.bind(this));
			}


		}

	}

};




KResponder.prototype.NODE_LOOKUP_RES = function(peer, req) {

	var data      = req.data;
	var successor = data.successor || null;
	var answer    = data.answer    || null;
	var nodes     = data.nodes     || [];
	var id        = data.id        || null;
	var pre       = data.pre       || null;

	if (successor !== null && id !== null && pre !== null) {

		if (pre.length < 2) {
			throw new Error('Oh oh. We shouldn\'t be here.');
		}

		var peer = null;

		if (pre[pre.length - 1] === this.myID) {
			pre.pop();
			peer = pre.pop();
		} else {
			peer = pre.pop();
		}

		var kNearest = this.routingTable.getKNearest(key);
		var kNearestMerged = util.mergeKNearest(key, kNearest, nodes);

		var payload = {
			rpc: RPCS.NODE_LOOKUP_RES,
			successor: successor,
			answer: answer, // WebRTC respond Object for Signaling
			nodes: kNearestMerged,
			id: id,
			pre: pre
		};

		propagateBack(peer);

		function propagateBack(peer) {
			this.transport
				.send(peer)
				.payload(payload)
				.then(function success(res, delta) {
					// log
				}, function fail() {
					var peer = pre.pop();

					if (peer) {
						propagateBack(peer);
					}

				});
		}

	}

}

module.exports = KResponder;