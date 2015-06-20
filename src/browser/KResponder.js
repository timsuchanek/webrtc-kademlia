var _ = require('lodash');

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


KResponder.prototype.handleRequest = function(peer, req) {
	var rpcs = Object.keys(RPCS);
	var rpc  = rpcs.indexOf(req.rpc);
	rpc      = rpcs[rpc];

	this[rpc].call(this, peer, req);
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

	var node  = req.node || null;
	var nodes = node ? this.getKNearest(node): null;

	req.respond()
	.payload({
		nodes: nodes
	})
	.then(function success() {
		// log
	}, function failure() {
		// log
	});

};

KResponder.prototype.FIND_VALUE_REQ = function(peer, req) {

	var key   = req.key || null;
	var value = this.storage.get(key);
	var nodes = value ? null : this.getKNearest(key);

	req.respond()
	.payload({
		nodes: nodes,
		value: value
	})
	.then(function success() {
		// log
	}, function failure() {
		// log
	});

};

KResponder.prototype.STORE_REQ = function(peer, req) {

	var key     = req.key || null;
	var value   = req.value || null;
	var payload = {};

	if (key !== null && value !== null) {
		this.storage.set(key, value);
		payload = { status: STATES.SUCCESS };
	} else {
		payload = { status: STATES.FAIL };
	}

	req.respond()
	.payload(payload)
	.then(function success() {
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

	var key = req.key || null;
	var pre = req.pre || [];
	var id = req.id || null;

	if (key !== null) {
		var val = this.storage.get(key);


		/**
		 * Easiest Case: We are the end of the chain. The req object
		 * is already directed to our predecessor in the chain.
		 * If he's not available, try the next and the next...
		 */

		if (val) {

			var payload = {
				rpc: RPCS.VALUE_LOOKUP_RES,
				successor: this.myId,
				answer: {}, // WebRTC respond Object for Signaling
				nodes: this.getKNearest(key),
				id: id,
				pre: pre
			};

				req.respond()
				.payload(payload)
				.then(function success() {
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

				var kNearest = this.getKNearest(key);

				var payload = {
					rpc: RPCS.VALUE_LOOKUP_REQ,
					key: key,
					pre: pre.concat(this.myId),
					id: id
				};

				feedForward.call(this, kNearest.shift());

				function feedForward(peer) {
					this.transport
						.send(nearest)
						.timeout(constants.LOOKUP_TIMEOUT)
						.payload(payload)
						.then(function success() {
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
	}

};




KResponder.prototype.VALUE_LOOKUP_RES = function(peer, req) {

	var successor = req.successor || null;
	var answer    = req.answer    || null;
	var nodes     = req.nodes     || [];
	var id        = req.id        || null;
	var pre       = req.pre       || null;

	if (successor !== null && id !== null && pre !== null) {

		if (pre.length < 2) {
			throw new Error('Oh oh. We shouldn\'t be here.');
		}

		var peer = null;

		if (pre[pre.length - 1] === this.myId) {
			pre.pop();
			peer = pre.pop();
		} else {
			peer = pre.pop();
		}


		var payload = {
			rpc: RPCS.VALUE_LOOKUP_RES,
			successor: successor,
			answer: answer, // WebRTC respond Object for Signaling
			nodes: this.mergeKNearest(key, nodes),
			id: id,
			pre: pre
		};

		propagateBack(peer);

		function propagateBack(peer) {
			this.transport
				.send(peer)
				.payload(payload)
				.then(function success() {
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

	var key = req.key || null;
	var pre = req.pre || [];
	var id = req.id || null;
	var nodes = req.nodes || [];

	if (key !== null) {
		var kNearest = this.getKNearest(key);
		var kNearestMerged = this.mergeKNearest(key, kNearest, nodes);

		var kNearestFound = false;

		if (_arraysEqual(kNearestMerged, nodes)) {
			kNearestFound = true;
		}

		/**
		 * Easiest Case: We are the end of the chain. The req object
		 * is already directed to our predecessor in the chain.
		 * If he's not available, try the next and the next...
		 */

		if (kNearestFound) {

			var payload = {
				rpc: RPCS.NODE_LOOKUP_RES,
				successor: this.myId,
				answer: {}, // WebRTC respond Object for Signaling
				nodes: kNearestMerged,
				id: id,
				pre: pre
			};

				req.respond()
				.payload(payload)
				.then(function success() {
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

				var kNearest = this.getKNearest(key);

				var payload = {
					rpc: RPCS.NODE_LOOKUP_REQ,
					key: key,
					pre: pre.concat(this.myId),
					id: id
				};

				feedForward.call(this, kNearest.shift());

				function feedForward(peer) {
					this.transport
						.send(nearest)
						.timeout(constants.LOOKUP_TIMEOUT)
						.payload(payload)
						.then(function success() {
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
	}

};




KResponder.prototype.NODE_LOOKUP_RES = function(peer, req) {

	var successor = req.successor || null;
	var answer    = req.answer    || null;
	var nodes     = req.nodes     || [];
	var id        = req.id        || null;
	var pre       = req.pre       || null;

	if (successor !== null && id !== null && pre !== null) {

		if (pre.length < 2) {
			throw new Error('Oh oh. We shouldn\'t be here.');
		}

		var peer = null;

		if (pre[pre.length - 1] === this.myId) {
			pre.pop();
			peer = pre.pop();
		} else {
			peer = pre.pop();
		}


		var payload = {
			rpc: RPCS.NODE_LOOKUP_RES,
			successor: successor,
			answer: answer, // WebRTC respond Object for Signaling
			nodes: this.mergeKNearest(key, nodes),
			id: id,
			pre: pre
		};

		propagateBack(peer);

		function propagateBack(peer) {
			this.transport
				.send(peer)
				.payload(payload)
				.then(function success() {
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