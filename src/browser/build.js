/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!*****************!*\
  !*** ./main.js ***!
  \*****************/
/***/ function(module, exports, __webpack_require__) {

	var DHT = window.DHT = __webpack_require__(/*! ./DHT */ 1);
	var util = __webpack_require__(/*! ./util */ 2);
	
	var dht = new DHT();
	
	dht.init()
	.then(function(dht) {
	
	  util.success('Successfully joined the network', dht);
	
	  util.addGetFunctionality(dht);
	  util.addStoreFunctionality(dht);
	  util.addMyId(dht);
	
	  // dht.store('B42TibbFgJ2pPBt0y2Pk_nBWC_eqgbD7o7gB6sCNavp5', {some: 'object'})
	  // .then(function(numStores) {
	  //   util.log('OMG SAVED AWESOME DATA to ', numStores, 'people');
	  // }, function(err) {
	  //   util.log('Error saving the data', err);
	  // });
	
	  // dht.get('B42TibbFgJ2pPBt0y2Pk_nBWC_eqgbD7o7gB6sCNavp5')
	  // .then(function(data) {
	  //   util.log('OMG GOT AWESOME DATA', data);
	  // }, function(err) {
	  //   util.log('Error while getting the data', err);
	  // });
	
	
	}, function(err) {
	  util.error('Cant participate at the network', err);
	});
	
	
	document.addEventListener("DOMContentLoaded", function(event) {
	  util.addHashFunctionality();
	});

/***/ },
/* 1 */
/*!****************!*\
  !*** ./DHT.js ***!
  \****************/
/***/ function(module, exports, __webpack_require__) {

	var Kademlia = __webpack_require__(/*! ./Kademlia */ 3);
	var Q = __webpack_require__(/*! Q */ 8);
	
	
	function DHT() {
	  var that = this;
	  this.kademlia = new Kademlia();
	}
	
	module.exports = DHT;
	
	DHT.prototype.init = function() {
	  var that = this;
	  return new Q.Promise(function(resolve, reject) {
	    that.kademlia.init()
	    .then(function() {
	      resolve(that);
	    }, function() {
	      reject(that);
	    });
	  });
	}
	
	DHT.prototype.getMyId = function() {
	  return this.kademlia.myRandomId;
	}
	
	
	DHT.prototype.store = function(key, value) {
	  var that = this;
	
	  this.kademlia.storeToStorage(key, value);
	
	  return new Q.Promise(function(resolveStore, rejectStore) {
	
	    that.kademlia.node_lookup(key, false, true)
	    .then(function(results) {
	      var ids = results[0];
	
	      var promises = ids.map(function(id) {
	        return that.kademlia.STORE(id, key, value);
	      });
	
	      Q.allSettled(promises)
	      .then(function(results) {
	
	        var successfulStoreRPCs = results.filter(function(res) {
	          return res.state === 'fulfilled';
	        });
	
	        resolveStore([that, successfulStoreRPCs.length]);
	      }, function(err) {
	        rejectGet([that, err]);
	      });
	
	    }, function(err) {
	      rejectStore([that, err]);
	    });
	  });
	}
	
	DHT.prototype.get = function(key) {
	  var value = this.kademlia.getValue(key);
	  var that = this;
	
	  return new Q.Promise(function(resolveGet, rejectGet) {
	
	    if (!value) {
	
	      that.kademlia.node_lookup(key, true, true)
	      .then(function(results) {
	        var nodes = results[0]
	          , value = results[1]
	          , notContactedNodes = results[2];
	
	        /**
	          If the node_lookup didn't bring the result (which can happen),
	          do a FIND_VALUE command to the nodes, that have not yet been contacted
	        **/
	
	        if (!value) {
	          var foundValue = false;
	          var count = 0;
	
	          if (notContactedNodes && Array.isArray(notContactedNodes) && notContactedNodes.length > 0) {
	            var max = notContactedNodes.length;
	            var promises = notContactedNodes.map(function(node) {
	              return kademlia.FIND_VALUE(node.id, key);
	            });
	
	            Q.all(promises)
	            .then(function(responses) {
	              var value = responses.filter(function(res) {
	                return res.value;
	              })[0];
	              resolveGet(value);
	              that.kademlia.storeToStorage(key, value);
	            }, function(er) {
	              rejectGet(err);
	            });
	
	          } else {
	            /**
	             * In this case we DON'T have a value AND we DON'T have any more nodes to contact.
	             * Sorry Dear.
	             */
	            rejectGet(value);
	          }
	        } else {
	          that.kademlia.storeToStorage(key, value);
	          resolveGet(value);
	        }
	      });
	    } else {
	      rejectGet(value);
	    }
	  });
	
	
	}


/***/ },
/* 2 */
/*!*****************!*\
  !*** ./util.js ***!
  \*****************/
/***/ function(module, exports, __webpack_require__) {

	var $logWindow = document.querySelector('.console .content');
	var xor = __webpack_require__(/*! ./xor */ 4);
	var constants = __webpack_require__(/*! ./constants */ 5);
	
	module.exports.log = function() {
	  _addLineToConsole(arguments);
	}
	
	module.exports.error = function() {
	  _addLineToConsole(arguments, 'error');
	}
	
	module.exports.success = function() {
	  _addLineToConsole(arguments, 'success');
	}
	
	function _addLineToConsole(args, additionalClass) {
	  var output = Array.prototype.map.call(args, function(arg) {
	    return stringify(arg);
	  });
	  var newRow = document.createElement('span');
	  newRow.className = 'row';
	  if (additionalClass) {
	    newRow.className += ' ' + additionalClass;
	  }
	  newRow.innerHTML = output.join('\t');
	  $logWindow.appendChild(newRow);
	  $logWindow.scrollTop = $logWindow.scrollHeight;
	}
	
	function stringify(arg) {
	  var stringified;
	  if (typeof arg === 'object') {
	    try {
	      stringified = JSON.stringify(arg);
	    } catch (e) {
	      stringified = arg.toString();
	    }
	  } else {
	    stringified = arg;
	  }
	
	  stringified = stringified.replace('FIND_NODE', '<strong>FIND_NODE</strong>');
	  stringified = stringified.replace('PING', '<strong>PING</strong>');
	  stringified = stringified.replace('FIND_VALUE', '<strong>FIND_VALUE</strong>');
	  stringified = stringified.replace('STORE', '<strong>STORE</strong>');
	
	  return stringified;
	}
	
	var lastStorage = '';
	module.exports.drawStorage = function(storage) {
	  var $table = document.getElementById('storageTable');
	  var html = '<tr><th>Key</th><th>Value</th></tr>';
	  html += Object.keys(storage._data).map(function(key) {
	    return '<tr><td>' + key + '</td><td>' + stringify(storage._data[key]) + '</td></tr>';
	  }).join('\n');
	  $table.innerHTML = html;
	}
	
	var lastRoutingTable = '';
	module.exports.drawRoutingTable = function(routingTable) {
	  var $routingTable = document.getElementById('routingTable');
	  var html = '<tr><th>Bucket</th><th>Node ID</th><th>First 16 Binary Digits</th></tr>';
	
	  html += Object.keys(routingTable.buckets).map(function(prefix) {
	    var bucket = routingTable.buckets[prefix];
	    var nodes = '<ul>'
	    nodes += bucket._list.map(function(node) {
	      return '<li>' + node + '</li>'
	    }).join('\n');
	    nodes += '</ul>';
	
	    var nodesBinaries = '<ul>';
	    nodesBinaries += bucket._list.map(function(id) {
	      return '<li>' + xor.b64ToBinary(id).substr(0, 16) + '</li>'
	    }).join('\n');
	    nodesBinaries += '</ul>';
	
	
	    return '<tr><td>' + prefix + '</td><td>' + nodes + '</td><td>' + nodesBinaries + '</td></tr>';
	  }).join('\n');
	  $routingTable.innerHTML = html;
	}
	
	module.exports.addGetFunctionality = function(dht) {
	  var $getButton = document.getElementById('submitGet');
	  var $getInputField = document.getElementById('keyGet');
	  $getButton.disabled = false;
	
	  $getButton.addEventListener('click', function(e) {
	    var key = $getInputField.value;
	    if (key.length > 0) {
	      dht.get(key)
	      .then(function success(res) {
	        module.exports.log('Success with GET command', res);
	        _addGetAnswer(res);
	      }, function error(err) {
	        module.exports.log('Fail with GET command', err);
	        _addGetAnswer(err);
	      })
	    }
	  });
	}
	
	function _addGetAnswer(res) {
	  var $getAnswer = document.getElementById('get-answer');
	  $getAnswer.innerHTML = '<strong>Answer:</strong>' +
	  '<span class="answer">' + stringify(res) + '</span>';
	}
	
	module.exports.addStoreFunctionality = function(dht) {
	  var $storeKey = document.getElementById('storeKey');
	  var $storeValue = document.getElementById('storeValue');
	  var $submitStore = document.getElementById('submitStore');
	  $submitStore.disabled = false;
	
	  $submitStore.addEventListener('click', function(e) {
	    var key = $storeKey.value;
	    var value = $storeValue.value;
	    if (key.length > 0 && value.length > 0) {
	      dht.store(key, value)
	      .then(function success(res) {
	        util.log('YES! Stored it!', res);
	        _addStoreAnswer('Storing succeded. ' + res + ' nodes saved it.')
	      }, function error(err) {
	        util.log('Outch! Storing didnt work!', res);
	        _addStoreAnswer('Storing failed');
	      });
	    }
	  });
	}
	
	function _addStoreAnswer(res) {
	  var $storeAnswer = document.getElementById('storeAnswer');
	  $storeAnswer.innerHTML = '<strong>Answer:</strong>' +
	  '<span class="answer">' + stringify(res) + '</span>';
	}
	
	module.exports.addHashFunctionality = function() {
	  var $generateButton = document.getElementById('generateButton');
	  var $randomId = document.getElementById('randomId');
	
	  // Initial random value
	  $randomId.value = xor.getRandomID(constants.HASH_SPACE);
	
	  $generateButton.addEventListener('click', function() {
	
	    $randomId.value = xor.getRandomID(constants.HASH_SPACE);
	  });
	}
	
	module.exports.addMyId = function(dht) {
	  var $myId = document.getElementById('myId');
	  $myId.innerHTML = dht.getMyId();
	}

/***/ },
/* 3 */
/*!*********************!*\
  !*** ./Kademlia.js ***!
  \*********************/
/***/ function(module, exports, __webpack_require__) {

	var Transport = __webpack_require__(/*! ./Transport */ 24);
	var RoutingTable = __webpack_require__(/*! ./RoutingTable */ 6);
	var xor = __webpack_require__(/*! ./xor */ 4);
	var Storage = __webpack_require__(/*! ./Storage */ 7);
	var constants = __webpack_require__(/*! ./constants */ 5);
	var util = __webpack_require__(/*! ./util */ 2);
	var Q = __webpack_require__(/*! q */ 10);
	
	if (typeof Array.prototype.sortByDistance !== 'function') {
	
	  Array.prototype.sortByDistance = function(id, desc) {
	
	    return this.sort(function(a, b) {
	      var idA, idB;
	
	      idA = a.id ? a.id : a;
	      idB = b.id ? b.id : b;
	
	      // if descending, swap!
	      if (desc) {
	        var temp = idA;
	        idA = idB;
	        idB = temp;
	      }
	      return xor.distance(idB, id) - xor.distance(idA, id);
	    });
	
	  }
	
	}
	
	
	function Kademlia() {
	  this.myRandomId = null;
	  this.routingTable = null;
	
	  this.storage = new Storage();
	
	  this.peer = null;
	}
	
	module.exports = Kademlia;
	
	Kademlia.prototype.init = function() {
	  return this.join();
	}
	
	// in honour of Petar Maymounkov and David Mazieres
	// all Kademlia RPCs are written capital case
	
	/**
	 * PING RPC
	 * @param {String} id ID to ping.
	 */
	Kademlia.prototype.PING = function(id) {
	  var connection = this.peer.connect(id);
	  var called = false;
	  var that = this;
	
	  return new Q.Promise(function(resolve, reject) {
	    connection.on('error', function() {
	      util.log('sth went wrong while trying to connect to ', id, 'for the FIND_NODE RPC', arguments);
	      var error = {error: {
	        msg: 'Didnt get the expected answer. Instead received '
	              + res.rpc + ' '
	              + JSON.stringify(res.data),
	        code: 1
	      }};
	      called = true;
	      reject(error);
	    });
	
	    connection.on('open', function() {
	
	      /**
	       * rpc: Type of RPC
	       * data: data of the RPC
	       * req: If the payload is a request or a response
	       */
	
	
	      connection.send({
	        rpc: 'PING',
	        data: 'ping',
	        id: that.myRandomId
	      });
	
	
	      connection.on('data', function(res) {
	        if (res instanceof Object
	          && res.hasOwnProperty('data')
	          && res.hasOwnProperty('rpc')
	          && res.rpc == 'PING'
	          ) {
	
	          // answer to PING
	          if (res.data === 'pong') {
	            if (constants.LOG_PING) {
	              util.log('Received successful answer to PING rpc', res);
	            }
	
	              connection.close();
	
	              /**
	               * Notify Routing Table, that a new response to a RPC arrived.
	               */
	              if (!called) {
	                called = true;
	                var ids = {};
	                ids[id] = true;
	                that.routingTable.receivedRPCResponse(ids);
	                resolve();
	              }
	          } else {
	            if (!called) {
	              called = true;
	              var ids = {};
	              ids[id] = false;
	              that.routingTable.receivedRPCResponse(ids);
	
	              reject({error: {
	                msg: 'Didnt get the expected answer. Instead received '
	                      + res.rpc + ' '
	                      + JSON.stringify(res.data),
	                code: 1
	              }});
	            }
	          }
	
	        }
	      });
	    });
	
	
	    setTimeout(function() {
	      if (!called) {
	        called = true;
	        var err = {
	          msg: 'Ping Timeout: ' + id + ' didn\'t answer after ' + constants.PING_TIMEOUT + 'ms',
	          code: 2
	        };
	
	        var ids = {};
	        ids[id] = false;
	        that.routingTable.receivedRPCResponse(ids);
	
	        reject({error: err});
	      }
	    }, constants.PING_TIMEOUT);
	
	  });
	
	};
	
	/**
	 * STORE RPC
	 * @param {String} id      Target Node
	 * @param {String} key     Key to store
	 * @param {String} value   Value to store
	 */
	Kademlia.prototype.STORE = function(id, key, value) {
	  var connection = this.peer.connect(id);
	  var called = false;
	  var that = this;
	
	  if (constants.LOG_STORE) {
	    util.log('Starting STORE', arguments);
	  }
	
	  return new Q.Promise(function(resolve, reject) {
	
	    connection.on('error', function(err) {
	      util.log('sth went wrong while trying to connect to ', id, 'for the FIND_NODE RPC', err);
	      reject(err);
	      called = true;
	    });
	
	
	
	    connection.on('open', function() {
	
	      var req = {
	        rpc: 'STORE',
	        key: key,
	        value: value,
	        id: that.myRandomId
	      };
	
	      connection.send(req);
	
	      if (constants.LOG_STORE) {
	        util.log('Sended STORE', req);
	      }
	
	      connection.on('data', function(res) {
	        if (res instanceof Object
	          && res.hasOwnProperty('rpc')
	          && res.rpc == 'STORE') {
	          connection.close();
	          if (constants.LOG_STORE) {
	            util.log('Received successful answer to STORE rpc', res);
	          }
	
	          if (!called) {
	            called = true;
	
	            /**
	             * Notify Routing Table, that a new response to a RPC arrived.
	             */
	            var ids = {};
	            ids[id] = true;
	            routingTable.receivedRPCResponse(ids);
	            resolve(res);
	          }
	        }
	      });
	    });
	
	    setTimeout(function() {
	      if (!called) {
	        called = true;
	        var err = {
	          msg: 'STORE Timeout: ' + id + ' didn\'t answer after ' + constants.STORE_TIMEOUT + 'ms',
	          code: 2
	        };
	
	        var ids = {};
	        ids[id] = false;
	        routingTable.receivedRPCResponse(ids);
	        reject({error: err});
	      }
	
	    }, constants.STORE_TIMEOUT);
	
	  });
	
	};
	
	/**
	 * FIND_NODE RPC
	 * @param {String} id   Target Node
	 * @param {String} node The Node we're looking for.
	 */
	Kademlia.prototype.FIND_NODE = function(id, node) {
	  var connection = this.peer.connect(id);
	  var called = false;
	  var that = this;
	
	  if (constants.LOG_FIND_NODE) {
	    util.log('called FIND_NODE with', id, node);
	  }
	
	  return new Q.Promise(function(resolve, reject) {
	
	    connection.on('error', function(err) {
	      util.log('Error in FIND_NODE RPC', err);
	      reject(err);
	    });
	
	    connection.on('open', function() {
	      var req = {
	        rpc: 'FIND_NODE',
	        node: node,
	        id: that.myRandomId
	      };
	
	      connection.send(req);
	
	      if (constants.LOG_FIND_NODE) {
	        util.log('Sended FIND_NODE', req);
	      }
	
	      connection.on('data', function(res) {
	        if (res instanceof Object && !called) {
	          called = true;
	          connection.close();
	
	          if (constants.LOG_FIND_NODE) {
	            util.log('Received successful answer to FIND_NODE rpc', res);
	          }
	
	          /**
	           * Notify Routing Table, that a new response to a RPC arrived.
	           */
	
	          var ids = {};
	          ids[id] = true;
	
	          if (res.nodes && Array.isArray(res.nodes)) {
	            /**
	             * We HAVE TO trust here, that the received nodes are still online.
	             * Otherwise we would have to check for each one of them and have big network traffic.
	             */
	            res.nodes = _removeOwnIdFromIds(res.nodes);
	
	            res.nodes.forEach(function(node) {
	              ids[node] = true;
	            });
	          }
	          that.routingTable.receivedRPCResponse(ids);
	
	          resolve(res);
	        }
	      });
	
	    });
	
	    setTimeout(function() {
	      if (!called) {
	        called = true;
	        var err = {
	          msg: 'FIND_NODE Timeout: ' + id + ' didn\'t answer after ' + constants.FIND_NODE_TIMEOUT + 'ms',
	          code: 2
	        };
	
	        var ids = {};
	        ids[id] = false;
	        that.routingTable.receivedRPCResponse(ids);
	
	        reject({error: err});
	      }
	
	    }, constants.FIND_NODE_TIMEOUT);
	
	  })
	
	};
	
	/**
	 * FIND_VALUE RPC
	 * @param {String} id  Target Node
	 * @param {String} key The Key we're looking for
	 */
	Kademlia.prototype.FIND_VALUE = function(id, key) {
	  var connection = this.peer.connect(id);
	  var called = false;
	  var that = this;
	
	  return new Q.Promise(function(resolve, reject) {
	    connection.on('error', function(err) {
	      util.log('sth went wrong while trying to connect to ', id, 'for the FIND_VALUE RPC', err);
	      reject(err);
	    });
	
	    connection.on('open', function() {
	
	      var req = {
	        rpc: 'FIND_VALUE',
	        key: key,
	        id: that.myRandomId
	      };
	
	      connection.send(req);
	
	      if (constants.LOG_FIND_VALUE) {
	        util.log('Sended FIND_VALUE', req);
	      }
	
	      connection.on('data', function(res) {
	
	        if (res instanceof Object && !called) {
	          called = true;
	          connection.close();
	
	          if (constants.LOG_FIND_VALUE) {
	            util.log('Received successful answer to FIND_VALUE rpc', res);
	          }
	
	          /**
	           * Notify Routing Table, that a new response to a RPC arrived.
	           */
	
	          var ids = {};
	          ids[id] = true;
	
	          if (res.nodes && Array.isArray(res.nodes)) {
	            /**
	             * We HAVE TO trust here, that the received nodes are still online.
	             * Otherwise we would have to check for each one of them and have big network traffic.
	             */
	            res.nodes = _removeOwnIdFromIds(res.nodes);
	            res.nodes.forEach(function(node) {
	              ids[node] = true;
	            });
	          }
	          that.routingTable.receivedRPCResponse(ids);
	
	          resolve(res);
	        }
	      });
	
	    });
	
	    setTimeout(function() {
	      if (!called) {
	        called = true;
	
	        var err = {
	          msg: 'FIND_VALUE Timeout: ' + id + ' didn\'t answer after ' + constants.FIND_VALUE_TIMEOUT + 'ms',
	          code: 2
	        };
	
	        var ids = {};
	        ids[id] = false;
	        that.routingTable.receivedRPCResponse(ids);
	
	        reject({error: err});
	
	      }
	
	    }, constants.FIND_VALUE_TIMEOUT);
	
	  })
	
	
	
	}
	
	var getStackTrace = function() {
	  var obj = {};
	  Error.captureStackTrace(obj, getStackTrace);
	  return obj.stack;
	};
	
	/**
	 * Performs a node lookup of a specific id. The lookup can either
	 * perform a value or a node lookup.
	 * @param  {String} id          Target ID
	 * @param  {String} valueLookup Is it a Value Lookup? (Opposite is a normal Node Lookup)
	 * @param  {Boolean} getCall    Is it called by the DHT.get function? (For debugging only)
	 */
	Kademlia.prototype.node_lookup = function(id, valueLookup, getCall) {
	
	  var STATES = {
	    'NOT_CONTACTED': 0,
	    'CONTACTING': 1,
	    'CONTACTED': 2
	  }
	
	  var that = this;
	  var called = false;
	
	  return new Q.Promise(function(resolve, reject) {
	
	    /**
	     * The best K Nodes, we know.
	     */
	    var _knownNodes = [];
	
	
	    _insertToKnownNodes(routingTable.getKNearest(constants.K, id));
	
	    var currentConnections = 0
	      , valueFound = false;
	
	
	    var nl = Math.min(constants.CONCURRENCY_FACTOR, _knownNodes.length);
	    for (var i = 0, nl; i < nl; i++) {
	      _lookupNode.call(that);
	    }
	
	    if (nl === 0) {
	      if (!called) {
	        called = true;
	        reject([[], null]);
	      }
	    }
	
	    /**
	     * Inserts Nodes to the local `_knownNodes` array.
	     * @param  {Array} insertingNodes
	     * @return {Boolean} Returns true, if there has been a new node.
	     */
	    function _insertToKnownNodes(insertingNodes) {
	
	      var idNodes = insertingNodes.filter(function(node) {
	        return node.hasOwnProperty('id');
	      });
	
	      if (_knownNodes.length < constants.K) {
	        _knownNodes =
	          _knownNodes
	          .concat(insertingNodes.map(function(node) {
	            return {
	              id: node,
	              status: STATES.NOT_CONTACTED
	            }
	          }))
	          .sortByDistance(id)
	          .slice(0, constants.K);
	
	        return true;
	
	      } else if (_knownNodes.length === constants.K && insertingNodes.length > 0) {
	
	        // Filter, which nodes are new
	        var worstDistance = xor.distance(_knownNodes[_knownNodes.length - 1].id, id);
	
	
	        /**
	        * First Check, if a node is new.
	        * Then check, if the new nodes are nearer than any of the K nodes,
	        * we already have.
	        * The only thing we therefore have to check: Is he better than the worst we have?
	        */
	
	        var newNodes = insertingNodes.filter(function(insertingNode) {
	
	          var isNew = _knownNodes.filter(function(knownNode) {
	            return knownNode.id == insertingNode;
	          }).length === 0;
	
	          if (isNew) {
	            return xor.lowerThan(xor.distance(insertingNode, id), worstDistance);
	          } else {
	            return false;
	          }
	        });
	
	        if (newNodes.length === 0) {
	
	          return false;
	
	        } else {
	
	          _knownNodes =
	            _knownNodes
	              .concat(newNodes.map(function(node) {
	                return {
	                  id: node,
	                  status: STATES.NOT_CONTACTED
	                }
	              }))
	              .sortByDistance(id)
	              .slice(0, constants.K);
	
	          return true;
	
	        }
	
	      }
	
	    }
	
	    /**
	     * Returns the next node to contact (It's the node nearest to the target id)
	     * @return {String} Node ID
	     */
	    function getNextNode() {
	      /**
	       * We demand, that the peers are already sorted ascending by distance. (done in insertNode)
	       */
	      var toProcessNodes = _knownNodes.filter(function(node) {
	        return node.status == STATES.NOT_CONTACTED;
	      });
	
	      if (toProcessNodes.length === 0) {
	        return false;
	      } else {
	        var toProcessNode = toProcessNodes[0];
	        toProcessNode.status = STATES.CONTACTING;
	        return toProcessNode;
	      }
	
	    }
	
	
	    /**
	     * Performs the next FIND_VALUE or FIND_NODE RPC.
	     */
	    function _lookupNode(nodeToContact) {
	
	      nodeToContact = nodeToContact ? nodeToContact : getNextNode();
	
	      if (nodeToContact) {
	
	        currentConnections++;
	
	        var method = valueLookup ? 'FIND_VALUE' : 'FIND_NODE';
	
	        that[method](nodeToContact.id, id)
	        .then(function success(res) {
	          /**
	           * Mark Node as already watched.
	           */
	          nodeToContact.status = STATES.CONTACTED;
	
	          currentConnections--;
	
	          if (res && res.hasOwnProperty('value')) {
	            valueFound = true;
	            if (!called) {
	              called = true;
	              resolve(_getResultForCallBack(res.value));
	            }
	            return;
	          }
	
	
	          var sthNew = false;
	
	
	            sthNew = _insertToKnownNodes(res.nodes);
	
	
	          if (!res.error && !sthNew) {
	            /**
	             * if we're the last concurrent callback,
	             * we're done.
	             */
	            if (currentConnections === 0) {
	              resolve(_getResultForCallBack(null));
	            }
	
	          } else {
	
	            /**
	             * There has been sth. new OR the last call didn't succeed.
	             */
	            var newNodeToContact = getNextNode();
	
	            if (newNodeToContact && currentConnections < constants.CONCURRENCY_FACTOR) {
	              _lookupNode.call(that, newNodeToContact);
	            } else {
	              resolve(_getResultForCallBack(null));
	            }
	          }
	
	        }, function error(err) {
	          /**
	           * If the last call didn't succeed.
	           */
	
	          currentConnections--;
	          nodeToContact.status = STATES.CONTACTED;
	
	          var newNodeToContact = getNextNode();
	
	          if (newNodeToContact && currentConnections < constants.CONCURRENCY_FACTOR) {
	            _lookupNode.call(that, newNodeToContact);
	          } else {
	            resolve(_getResultForCallBack(null));
	          }
	        });
	      } else {
	        resolve(_getResultForCallBack(null));
	      }
	
	      function _getResultForCallBack(value) {
	        var kNodes = _knownNodes.map(function(node) {
	          // TODO: THIS SHOULD NOT BE NECESARRY!!!
	          if (node.id && node.id.id) {
	            return node.id.id;
	          } else {
	            return node.id;
	          }
	        });
	        var notContactedNodes = _knownNodes.reduce(function(prev, curr) {
	          if (curr.status == STATES.NOT_CONTACTED) {
	            return prev.concat(curr.id);
	          } else {
	            return prev;
	          }
	        }, []);
	        return [kNodes, value, notContactedNodes];
	      }
	
	    }
	  });
	
	};
	
	/**
	 * Join the DHT Network.
	 * @return {Promise}
	 */
	Kademlia.prototype.join = function() {
	
	  //generate random ID
	  this.myRandomId = xor.getRandomID(constants.HASH_SPACE);
	  var that = this;
	
	  this.transport = new Transport(this.myRandomId);
	
	
	  return new Q.Promise(function(resolve, reject) {
	
	    that.peer.on('error', function(err) {
	      // The PeerJS Event System is not working properly. So ignore it.
	      // One failed connection doesn't mean, that Kademlia.prototype.join() fails.
	
	      if (constants.LOG_PEERJS) {
	        util.log('Peer.JS Error', err);
	      }
	    });
	
	    that.peer.on('open', function(id) {
	
	      // util.log('Jo, I\'m in. My ID:', id);
	
	      // It only makes sense to get the bootstrap peers, if the webrtc signaling worked
	      _getBootstrapPeers.call(that, function(peers) {
	        bootstrapPeers = peers;
	
	        // remove own ID from the list of peers
	        var index = peers.indexOf(that.myRandomId);
	        if (index !== -1) {
	          peers.splice(index, 1);
	        }
	
	        /**
	          Initialize Routing Table
	        **/
	
	        routingTable = window.routingTable = that.routingTable = new RoutingTable(that, constants.K, that.myRandomId);
	
	        routingTable.insertNodes(peers);
	
	
	        /**
	         * Perform a node lookup for the node's ID
	         */
	        that.node_lookup(that.myRandomId)
	        .then(function success(results) {
	          // For an easy to use API, bind the cb to the DHT scope
	          resolve(results);
	        }, function error(err) {
	          reject(err);
	        });
	
	      });
	    });
	
	    that.peer.on('connection', function(conn) {
	      // util.log('Someone connected to me', conn);
	      addRPCResponses.call(that, conn);
	    });
	
	  });
	}
	
	/**
	 * Returns the value from the local storage.
	 * @param  {String} key The Key we want the value for.
	 * @return {Object}     Value
	 */
	Kademlia.prototype.getValue = function(key) {
	  return this.storage.get(key);
	}
	
	/**
	 * Stores the Value to the local storage
	 * @param  {String} key   Key
	 * @param  {String} value Value
	 */
	Kademlia.prototype.storeToStorage = function(key, value) {
	  this.storage.store(key, value);
	}
	
	/**
	 * Get the Bootstrap peers. At the moment the source is the peer.js, which knows all connected nodes.
	 * In the future we need a better method.
	 * Some Methods can be:
	 *   Possible ways to populate the bootstrap nodes:
	  - Github gist
	  - Github Raw file
	  - Github Pages
	  - Facebook Note
	  - Tumblr Blog
	  - Twitter
	
	 * @param  {Function} cb [description]
	 * @return {[type]}      [description]
	 */
	function _getBootstrapPeers(cb) {
	  var that = this;
	  function reqListener () {
	    cb.call(that, JSON.parse(this.responseText));
	  }
	
	  var oReq = new XMLHttpRequest();
	  oReq.onload = reqListener;
	  oReq.open("get", 'http://' + constants.HOST + ':' + constants.HOST_PORT + '/ids', true);
	  oReq.send();
	}
	
	function addRPCResponses(connection) {
	  var that = this;
	  connection.on('data', function(req) {
	
	    if (req instanceof Object
	      && req.hasOwnProperty('rpc')) {
	
	      switch (req.rpc) {
	
	        /**
	         * {
	          rpc: 'PING',
	          data: 'ping'
	        }
	         */
	
	        case 'PING':
	
	          // send a pong back in all cases
	          var answer = {
	            rpc: 'PING',
	            data: 'pong',
	            id: that.myRandomId
	          };
	
	          connection.send(answer);
	
	          if (constants.LOG_PING) {
	            util.log('answered PING rpc', req, 'with', answer);
	          }
	
	
	          break;
	
	
	
	        /**
	         * {
	          rpc: 'FIND_NODE',
	          node: node
	        }
	         */
	
	
	        case 'FIND_NODE':
	
	          var myNodes = [];
	
	          if (routingTable && req.hasOwnProperty('node')) {
	            myNodes = that.routingTable.getKNearest(constants.K, req.node);
	          }
	
	          var answer = {
	            rpc: 'FIND_NODE',
	            nodes: myNodes,
	            id: that.myRandomId
	          };
	
	          connection.send(answer);
	
	          if (constants.LOG_FIND_NODE) {
	            util.log('answered FIND_NODE rpc', req, 'with', answer);
	          }
	
	          break;
	
	
	          /**
	           * {
	          rpc: 'FIND_VALUE',
	          key: key
	        }
	           */
	
	        case 'FIND_VALUE':
	          var res = {
	            rpc: 'FIND_VALUE',
	            id: that.myRandomId
	          };
	
	          if (req.hasOwnProperty('key')) {
	            var value = that.storage.get(req.key);
	            if (!value) {
	              res.nodes =  that.routingTable.getKNearest(constants.K, req.key);
	            } else {
	              res.value = value;
	            }
	          } else {
	            res.error = {
	              code: 3,
	              msg: 'Didnt receive the right instructions.'
	            }
	          }
	
	          connection.send(res);
	
	          if (constants.LOG_FIND_VALUE) {
	            util.log('answered FIND_VALUE rpc', req, 'with', res);
	          }
	
	          break;
	
	
	        /**
	         * {
	          rpc: 'STORE',
	          key: key,
	          value: value
	        }
	         */
	
	        case 'STORE':
	          var res = {
	            rpc: 'STORE',
	            id: that.myRandomId
	          };
	
	          if (req.hasOwnProperty('key') && req.hasOwnProperty('value')) {
	            that.storage.store(req.key, req.value);
	            res.success = true;
	          } else {
	            res.error = {
	              msg: 'Key or Value missing',
	              code: 4
	            };
	          }
	
	          connection.send(res);
	
	          if (constants.LOG_STORE) {
	            util.log('answered STORE rpc', req, 'with', res);
	          }
	
	          break;
	      }
	
	
	
	      if (req.id) {
	        /**
	         * Notify Routing Table, that a new response to a RPC arrived.
	         */
	
	        var ids = {};
	        ids[req.id] = true;
	
	        that.routingTable.receivedRPCResponse(ids);
	
	      }
	
	
	    } else {
	      console.error('Received unknown request.', req);
	    }
	
	
	  });
	}
	
	function _removeOwnIdFromIds(ids) {
	  if (ids && Array.isArray(ids) && ids.length > 0) {
	    var index = ids.indexOf(this.myRandomId);
	    var arrayClone = ids.slice();
	
	    if (index !== -1) {
	      return arrayClone.splice(index, 1);
	    } else {
	      return ids;
	    }
	  } else {
	    return [];
	  }
	}

/***/ },
/* 4 */
/*!****************!*\
  !*** ./xor.js ***!
  \****************/
/***/ function(module, exports, __webpack_require__) {

	String.prototype.map = function() {
	  return Array.prototype.map.apply(this, arguments).join('');
	}
	
	String.prototype.filter = function() {
	  return Array.prototype.filter.apply(this, arguments).join('');
	}
	
	String.prototype.xor = function(b) {
	  return this.map(function(a, i) {
	    return a != b[i] ? '1' : '0';
	  });
	}
	
	String.prototype.greaterThan = function(b) {
	  for (var i = 0, l = this.length; i < l; i++) {
	    var thisChar = this.charAt(i);
	    if (thisChar !== b.charAt(i)) {
	      return this.charAt(i) === '1' ? true : false;
	    }
	  }
	  return false;
	}
	
	String.prototype.lowerThan = function(b) {
	  for (var i = 0, l = this.length; i < l; i++) {
	   var thisChar = this.charAt(i);
	   if (thisChar !== b.charAt(i)) {
	     return this.charAt(i) === '0' ? true : false;
	   }
	  }
	  return false;
	}
	
	String.prototype.commonPrefix = function(b) {
	  // filter anwenden
	  var lastMatch = -1;
	  for (var t = 0, tl = this.length; t < tl; t++) {
	    if (this[t] !== b[t]) {
	      return lastMatch + 1;
	    } else {
	      lastMatch = t;
	    }
	  }
	}
	
	var ALPHABET = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","0","1","2","3","4","5","6","7","8","9","-","_"];
	
	/**
	  binary: String
	*/
	function binaryToB64(n) {
	  var b64String = '';
	  while (n.length > 5) {
	    // take last 6 bits, 2^6 = 64
	    var last6Bits = n.substr(n.length - 6, 6);
	    n = n.substr(0, n.length - 6);
	
	    var decimalDigit = parseInt(last6Bits, 2);
	    b64String = ALPHABET[decimalDigit] + b64String;
	  }
	  if (n.length > 0) {
	    var decimalDigit = parseInt(n, 2);
	    b64String = ALPHABET[decimalDigit] + b64String;
	  }
	  return b64String;
	}
	
	module.exports.binaryToB64 = binaryToB64;
	
	function binaryToDecimal(n) {
	  return parseInt(n, 2);
	}
	
	function b64ToDecimal(n) {
	  return parseInt(b64ToBinary(n), 2);
	}
	
	function b64ToBinary(n) {
	
	  function prefixWithZeroes(digitString) {
	    if (digitString.length === 6) {
	      return digitString;
	    } else if (digitString.length < 6) {
	      var restZeroes = [
	        '',
	        '0',
	        '00',
	        '000',
	        '0000',
	        '00000'
	      ];
	      var rest = 6 - digitString.length;
	      return restZeroes[rest] + digitString;
	    }
	  }
	
	  if (typeof n !== 'string') {
	    debugger
	    throw new TypeError('the input argument `n` is not a string.');
	  }
	
	  return n.map(function(digit) {
	    return prefixWithZeroes(ALPHABET.indexOf(digit).toString(2));
	  });
	}
	
	module.exports.b64ToBinary = b64ToBinary;
	
	function getRandomBinarySequence(n) {
	  var bits = '';
	  for (var i = 0; i < n; i++) {
	    var rand = Math.random();
	    if (rand > 0.5) {
	      bits += '1';
	    } else {
	      bits += '0';
	    }
	  }
	  return bits;
	}
	
	module.exports.getRandomBinarySequence = getRandomBinarySequence;
	
	module.exports.distance = function(a, b) {
	  var aBin = b64ToBinary(a)
	    , bBin = b64ToBinary(b);
	
	  return aBin.xor(bBin);
	}
	
	/**
	 * Sort an array of `ids` by the distance to `id`
	 * @param  {Array} array
	 * @param  {String} id
	 * @param  {Boolean} desc (optional)
	 * @return {Array}
	 */
	module.exports.sortByDistance = function(array, id, desc) {
	  var sorting = !!desc;
	  if (sorting) {
	    return array.sort(function(a, b) {
	      return module.exports.distance(b, id) - module.exports.distance(a, id);
	    });
	  } else {
	    return array.sort(function(a, b) {
	      return module.exports.distance(a, id) - module.exports.distance(b, id);
	    });
	  }
	}
	
	module.exports.commonPrefix = function(idB64, binaryPrefix) {
	  var idBin = b64ToBinary(idB64);
	  return idBin.commonPrefix(binaryPrefix);
	}
	
	module.exports.getRandomID = function(bits) {
	  return binaryToB64(getRandomBinarySequence(bits))
	}
	
	/**
	 * Return if the binary string `a` is greater than `b`
	 * @param  {String} a
	 * @param  {String} b
	 */
	module.exports.greaterThan = function(a, b) {
	  return a.greaterThan(b);
	}
	
	module.exports.lowerThan = function(a, b) {
	  return a.lowerThan(b);
	}
	
	// console.log(binaryToB64(b64ToBinary('Deine_Mudda')));
	
	// var start = Date.now();
	// //API
	// var key1 = binaryToB64(getRandomBinarySequence(260))
	//   , key2 = binaryToB64(getRandomBinarySequence(260))
	//   , dist = b64ToBinary(key1).xor(b64ToBinary(key2))
	//   , dist2 = b64ToBinary(key2).xor(dist)
	//   , distB64 = binaryToB64(dist);
	
	// var timeNeeded = Date.now() - start;
	// console.log(timeNeeded, key1, key2, binaryToB64(dist2), binaryToDecimal(dist), distB64);
	
	// // lets do a little benchmark
	// var key1Array = [];
	// var key2Array = [];
	// var n = 10000;
	// var bits = 260;
	// start = Date.now();
	// for (var i = 0; i < n; i++) {
	//   key1Array.push(getRandomBinarySequence(bits));
	//   key2Array.push(getRandomBinarySequence(bits));
	// }
	// timeNeeded = Date.now() - start;
	// console.log('Generating ' + n*2 + ' ' + bits + 'bit keys takes ' + timeNeeded + ' ms');
	
	
	// start = Date.now();
	// for (var i = 0; i < n; i++) {
	//   key1Array[i].xor(key2Array[i]);
	// }
	// timeNeeded = Date.now() - start;
	// console.log('Doing ' + n + ' ' + bits + 'bit XORs needs ' + timeNeeded + 'ms');

/***/ },
/* 5 */
/*!**********************!*\
  !*** ./constants.js ***!
  \**********************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = {
	  // Network Config
	  PING_TIMEOUT: 1000,
	  STORE_TIMEOUT: 1000,
	  FIND_NODE_TIMEOUT: 1000,
	  FIND_VALUE_TIMEOUT: 1000,
	  HOST: 'localhost',
	  HOST_PORT: 9000,
	
	  // Kademlia Config
	  HASH_SPACE: 160,
	  K: 8,
	  CONCURRENCY_FACTOR: 3,
	
	  // Logging Config
	  LOG_PING: true,
	  LOG_STORE: true,
	  LOG_FIND_VALUE: true,
	  LOG_FIND_NODE: true,
	  LOG_PEERJS: true
	}

/***/ },
/* 6 */
/*!*************************!*\
  !*** ./RoutingTable.js ***!
  \*************************/
/***/ function(module, exports, __webpack_require__) {

	var KBucket = __webpack_require__(/*! ./KBucket */ 9);
	var xor = __webpack_require__(/*! ./xor */ 4);
	var constants = __webpack_require__(/*! ./constants */ 5);
	var util = __webpack_require__(/*! ./util */ 2);
	
	function RoutingTable(kademlia, k, myId) {
	
	  // Initialize with the first bucket on stage -1
	  // this bucket starts to split when it's full
	
	  this.k = k;
	  this.myId = myId;
	  this.kademlia = kademlia;
	
	  this.buckets = {
	    '-1':  new KBucket(k, '', this.kademlia, this)
	  };
	
	}
	
	function _findBucket(id) {
	
	  if (this.buckets && this.buckets.hasOwnProperty('-1')) {
	
	    // the easiest case
	
	    return this.buckets['-1'];
	
	  } else {
	
	    // search for bucket with longest common prefix
	    // sort descending and take the first element
	    var bestFittingBucket =
	      Object.keys(this.buckets).sort(function(a, b) {
	        return xor.commonPrefix(id, b) - xor.commonPrefix(id, a);
	      })[0];
	
	    return this.buckets[bestFittingBucket];
	  }
	
	}
	
	
	function _splitBucket(bucket) {
	  if (Object.keys(this.buckets).length < constants.HASH_SPACE) {
	    var nodes = bucket.getNodes();
	    var prefix = bucket.getPrefix();
	    delete this.buckets[prefix.length > 0 ? prefix : '-1'];
	    this.buckets[prefix + '0'] = new KBucket(this.k, prefix + '0', this.kademlia, this);
	    this.buckets[prefix + '1'] = new KBucket(this.k, prefix + '1', this.kademlia, this);
	    this.insertNodes(nodes);
	    return true;
	  } else {
	    return false;
	  }
	}
	
	/**
	 * No matter, if the new node will be saved or not, we have to tell him what to store, if we're the nearest
	 * node WE KNOW to a specific key.
	 *
	 * STEPS
	 * 1. check in the kbucket if incoming node is online
	 * 2. notify the routingtable that there's a new node
	 * 3. Iterate through all keys that we have in our storage
	 * 4.  -> For each `key` look, if we're the nearest id
	 * 5.  -> IF we are the nearest ID (except for the new node's id), send him the STORE command
	 */
	
	function _handleNewNode(node) {
	  var storage = this.kademlia.storage;
	
	  var nodesResponsibility = Object.keys(storage._data).filter(function(key) {
	
	    var nodesDistance = xor.distance(node, key);
	    // look, if there ARENT exactly K better nodes (better means nearer at the key)
	    var betterNodes = this.getKNearest(constants.K, key).filter(function(id) {
	      return xor.lowerThan(xor.distance(id, key), nodesDistance);
	    });
	
	    // if there aren't k better nodes, `node` has the responsibility to save the content
	    if (betterNodes.length < constants.K) {
	
	      this.kademlia.STORE(node, key, storage._data[key])
	      .then(function success() {
	        // nice
	        console.log('jo');
	      }, function failure() {
	        console.log('no');
	      });
	
	    }
	  }, this);
	}
	
	
	RoutingTable.prototype.insertNode = function(id, online) {
	
	  // is the ID our own ID?
	
	  if (id === this.myId) {
	    console.log('SAW OWN ID');
	    return;
	  }
	
	
	  // find the right bucket
	  var bucket = _findBucket.call(this, id);
	
	
	  // does the bucket still have space?
	  var bucketLength = bucket.getLength();
	
	  if (bucketLength < this.k) {
	    // thats the easiest case
	    bucket.update(id, online, _handleNewNode.bind(this));
	    return true;
	  } else if (bucketLength === this.k) {
	
	
	    var ownBucket = _findBucket.call(this, this.myId);
	
	    /**
	      if the node itself is in the range of the bucket, that is full,
	      it's allowed to do a split
	      in other words, the node itself has to be in the bucket
	      that the node wants to join.
	
	      BUT there is one special case!!
	      The case, when the node itself is ALONE in its bucket.
	      Then the tree is highly unbalanced.
	      If we then would notify the node of the other bucket, so the node
	      of the other "subtree", we would only notify K Buckets, not all of them.
	      So we need to split in that case too!
	     */
	
	    if (bucket === ownBucket || ownBucket.getLength() === 1) {
	      var couldSplit = true;
	
	      /**
	       As long as we can still split the bucket and the appropriate bucket is still full,
	       split again.
	
	       A usecase for that is the following:
	       k = 2,
	       currentNodes = ['00001', '00010']
	       after split, we have the buckets '0' and '1'. the bucket '0' is still full.
	       so we need to split again. and so on...
	
	
	       Also, Only split, if the new node is online!!
	       Otherwise, look, if it's already in the bucket or withdraw it.
	       (that's done in the bucket)
	
	       */
	
	      while (bucket.getLength() === this.k && couldSplit && online) {
	
	        /**
	          1. Split the bucket and rearrange all ids in the bucket
	             as long as the appropriate bucket is still full AND we can still split
	        **/
	
	        couldSplit = _splitBucket.call(this, bucket);
	
	        bucket = _findBucket.call(this, id)
	
	      }
	
	
	      /**
	        2. Insert our node into the right bucket
	      **/
	
	      bucket.update(id, online, _handleNewNode.bind(this));
	
	      util.drawRoutingTable(this);
	    } else {
	      // try inserting anyways (if a node from the bucket falls out)
	      bucket.update(id, online, _handleNewNode.bind(this));
	    }
	  }
	}
	
	RoutingTable.prototype.insertNodes = function(ids) {
	  if (Array.isArray(ids)) {
	    ids.forEach(function(id) {
	      this.insertNode(id, true);
	    }, this);
	    return true;
	  } else {
	    return false;
	  }
	}
	
	RoutingTable.prototype.getKNearest = function(k, id) {
	
	  var bestFittingBuckets =
	    Object.keys(this.buckets).sort(function(a, b) {
	      return xor.commonPrefix(id, b) - xor.commonPrefix(id, a);
	    })
	    .map(function(key) {
	      return this.buckets[key];
	    }, this);
	
	  if (bestFittingBuckets[0].getLength() === k) {
	    return bestFittingBuckets[0].getClosest(id);
	  } else {
	    // if the best fitting bucket isnt full, look in other buckets
	    var closest = bestFittingBuckets[0].getClosest(id);
	
	    var numNeeded = k - closest.length;
	
	    var bucketIndex = 1;
	
	    while (numNeeded > 0 && bucketIndex < bestFittingBuckets.length) {
	
	      var currentBucket = bestFittingBuckets[bucketIndex];
	
	      var currentBucketsNodes = currentBucket.getClosest(id);
	
	      if (currentBucket.length > numNeeded) {
	        closest = closest.concat(currentBucketsNodes.slice(0, numNeeded));
	      } else {
	        closest = closest.concat(currentBucketsNodes);
	      }
	
	      numNeeded = k - closest.length;
	      bucketIndex++;
	    }
	    return closest;
	  }
	}
	
	/**
	 * Notify the routingtable, that a response or request to any RPC came in
	 * @param  {Object} ids {
	 *   'id-name': Boolean
	 * }
	 * The Boolean says, if the corresponding id is still alive or not.
	 */
	RoutingTable.prototype.receivedRPCResponse = function(ids) {
	  // {
	  //   "aisuhd9a8h": true,
	  //   "saoidj102j": false
	  // }
	  Object.keys(ids).forEach(function(id) {
	    this.insertNode(id, ids[id]);
	  }, this);
	}
	
	module.exports = RoutingTable;

/***/ },
/* 7 */
/*!********************!*\
  !*** ./Storage.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = Storage;
	var util = __webpack_require__(/*! ./util */ 2);
	
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

/***/ },
/* 8 */
/*!************************************************!*\
  !*** /Users/tim/code/webrtc-kademlia/~/Q/q.js ***!
  \************************************************/
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// vim:ts=4:sts=4:sw=4:
	/*!
	 *
	 * Copyright 2009-2012 Kris Kowal under the terms of the MIT
	 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
	 *
	 * With parts by Tyler Close
	 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
	 * at http://www.opensource.org/licenses/mit-license.html
	 * Forked at ref_send.js version: 2009-05-11
	 *
	 * With parts by Mark Miller
	 * Copyright (C) 2011 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 * http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 *
	 */
	
	(function (definition) {
	    "use strict";
	
	    // This file will function properly as a <script> tag, or a module
	    // using CommonJS and NodeJS or RequireJS module formats.  In
	    // Common/Node/RequireJS, the module exports the Q API and when
	    // executed as a simple <script>, it creates a Q global instead.
	
	    // Montage Require
	    if (typeof bootstrap === "function") {
	        bootstrap("promise", definition);
	
	    // CommonJS
	    } else if (true) {
	        module.exports = definition();
	
	    // RequireJS
	    } else if (typeof define === "function" && define.amd) {
	        define(definition);
	
	    // SES (Secure EcmaScript)
	    } else if (typeof ses !== "undefined") {
	        if (!ses.ok()) {
	            return;
	        } else {
	            ses.makeQ = definition;
	        }
	
	    // <script>
	    } else if (typeof window !== "undefined" || typeof self !== "undefined") {
	        // Prefer window over self for add-on scripts. Use self for
	        // non-windowed contexts.
	        var global = typeof window !== "undefined" ? window : self;
	
	        // Get the `window` object, save the previous Q global
	        // and initialize Q as a global.
	        var previousQ = global.Q;
	        global.Q = definition();
	
	        // Add a noConflict function so Q can be removed from the
	        // global namespace.
	        global.Q.noConflict = function () {
	            global.Q = previousQ;
	            return this;
	        };
	
	    } else {
	        throw new Error("This environment was not anticipated by Q. Please file a bug.");
	    }
	
	})(function () {
	"use strict";
	
	var hasStacks = false;
	try {
	    throw new Error();
	} catch (e) {
	    hasStacks = !!e.stack;
	}
	
	// All code after this point will be filtered from stack traces reported
	// by Q.
	var qStartingLine = captureLine();
	var qFileName;
	
	// shims
	
	// used for fallback in "allResolved"
	var noop = function () {};
	
	// Use the fastest possible means to execute a task in a future turn
	// of the event loop.
	var nextTick =(function () {
	    // linked list of tasks (single, with head node)
	    var head = {task: void 0, next: null};
	    var tail = head;
	    var flushing = false;
	    var requestTick = void 0;
	    var isNodeJS = false;
	    // queue for late tasks, used by unhandled rejection tracking
	    var laterQueue = [];
	
	    function flush() {
	        /* jshint loopfunc: true */
	        var task, domain;
	
	        while (head.next) {
	            head = head.next;
	            task = head.task;
	            head.task = void 0;
	            domain = head.domain;
	
	            if (domain) {
	                head.domain = void 0;
	                domain.enter();
	            }
	            runSingle(task, domain);
	
	        }
	        while (laterQueue.length) {
	            task = laterQueue.pop();
	            runSingle(task);
	        }
	        flushing = false;
	    }
	    // runs a single function in the async queue
	    function runSingle(task, domain) {
	        try {
	            task();
	
	        } catch (e) {
	            if (isNodeJS) {
	                // In node, uncaught exceptions are considered fatal errors.
	                // Re-throw them synchronously to interrupt flushing!
	
	                // Ensure continuation if the uncaught exception is suppressed
	                // listening "uncaughtException" events (as domains does).
	                // Continue in next event to avoid tick recursion.
	                if (domain) {
	                    domain.exit();
	                }
	                setTimeout(flush, 0);
	                if (domain) {
	                    domain.enter();
	                }
	
	                throw e;
	
	            } else {
	                // In browsers, uncaught exceptions are not fatal.
	                // Re-throw them asynchronously to avoid slow-downs.
	                setTimeout(function () {
	                    throw e;
	                }, 0);
	            }
	        }
	
	        if (domain) {
	            domain.exit();
	        }
	    }
	
	    nextTick = function (task) {
	        tail = tail.next = {
	            task: task,
	            domain: isNodeJS && process.domain,
	            next: null
	        };
	
	        if (!flushing) {
	            flushing = true;
	            requestTick();
	        }
	    };
	
	    if (typeof process === "object" &&
	        process.toString() === "[object process]" && process.nextTick) {
	        // Ensure Q is in a real Node environment, with a `process.nextTick`.
	        // To see through fake Node environments:
	        // * Mocha test runner - exposes a `process` global without a `nextTick`
	        // * Browserify - exposes a `process.nexTick` function that uses
	        //   `setTimeout`. In this case `setImmediate` is preferred because
	        //    it is faster. Browserify's `process.toString()` yields
	        //   "[object Object]", while in a real Node environment
	        //   `process.nextTick()` yields "[object process]".
	        isNodeJS = true;
	
	        requestTick = function () {
	            process.nextTick(flush);
	        };
	
	    } else if (typeof setImmediate === "function") {
	        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
	        if (typeof window !== "undefined") {
	            requestTick = setImmediate.bind(window, flush);
	        } else {
	            requestTick = function () {
	                setImmediate(flush);
	            };
	        }
	
	    } else if (typeof MessageChannel !== "undefined") {
	        // modern browsers
	        // http://www.nonblocking.io/2011/06/windownexttick.html
	        var channel = new MessageChannel();
	        // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
	        // working message ports the first time a page loads.
	        channel.port1.onmessage = function () {
	            requestTick = requestPortTick;
	            channel.port1.onmessage = flush;
	            flush();
	        };
	        var requestPortTick = function () {
	            // Opera requires us to provide a message payload, regardless of
	            // whether we use it.
	            channel.port2.postMessage(0);
	        };
	        requestTick = function () {
	            setTimeout(flush, 0);
	            requestPortTick();
	        };
	
	    } else {
	        // old browsers
	        requestTick = function () {
	            setTimeout(flush, 0);
	        };
	    }
	    // runs a task after all other tasks have been run
	    // this is useful for unhandled rejection tracking that needs to happen
	    // after all `then`d tasks have been run.
	    nextTick.runAfter = function (task) {
	        laterQueue.push(task);
	        if (!flushing) {
	            flushing = true;
	            requestTick();
	        }
	    };
	    return nextTick;
	})();
	
	// Attempt to make generics safe in the face of downstream
	// modifications.
	// There is no situation where this is necessary.
	// If you need a security guarantee, these primordials need to be
	// deeply frozen anyway, and if you don’t need a security guarantee,
	// this is just plain paranoid.
	// However, this **might** have the nice side-effect of reducing the size of
	// the minified code by reducing x.call() to merely x()
	// See Mark Miller’s explanation of what this does.
	// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
	var call = Function.call;
	function uncurryThis(f) {
	    return function () {
	        return call.apply(f, arguments);
	    };
	}
	// This is equivalent, but slower:
	// uncurryThis = Function_bind.bind(Function_bind.call);
	// http://jsperf.com/uncurrythis
	
	var array_slice = uncurryThis(Array.prototype.slice);
	
	var array_reduce = uncurryThis(
	    Array.prototype.reduce || function (callback, basis) {
	        var index = 0,
	            length = this.length;
	        // concerning the initial value, if one is not provided
	        if (arguments.length === 1) {
	            // seek to the first value in the array, accounting
	            // for the possibility that is is a sparse array
	            do {
	                if (index in this) {
	                    basis = this[index++];
	                    break;
	                }
	                if (++index >= length) {
	                    throw new TypeError();
	                }
	            } while (1);
	        }
	        // reduce
	        for (; index < length; index++) {
	            // account for the possibility that the array is sparse
	            if (index in this) {
	                basis = callback(basis, this[index], index);
	            }
	        }
	        return basis;
	    }
	);
	
	var array_indexOf = uncurryThis(
	    Array.prototype.indexOf || function (value) {
	        // not a very good shim, but good enough for our one use of it
	        for (var i = 0; i < this.length; i++) {
	            if (this[i] === value) {
	                return i;
	            }
	        }
	        return -1;
	    }
	);
	
	var array_map = uncurryThis(
	    Array.prototype.map || function (callback, thisp) {
	        var self = this;
	        var collect = [];
	        array_reduce(self, function (undefined, value, index) {
	            collect.push(callback.call(thisp, value, index, self));
	        }, void 0);
	        return collect;
	    }
	);
	
	var object_create = Object.create || function (prototype) {
	    function Type() { }
	    Type.prototype = prototype;
	    return new Type();
	};
	
	var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);
	
	var object_keys = Object.keys || function (object) {
	    var keys = [];
	    for (var key in object) {
	        if (object_hasOwnProperty(object, key)) {
	            keys.push(key);
	        }
	    }
	    return keys;
	};
	
	var object_toString = uncurryThis(Object.prototype.toString);
	
	function isObject(value) {
	    return value === Object(value);
	}
	
	// generator related shims
	
	// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
	function isStopIteration(exception) {
	    return (
	        object_toString(exception) === "[object StopIteration]" ||
	        exception instanceof QReturnValue
	    );
	}
	
	// FIXME: Remove this helper and Q.return once ES6 generators are in
	// SpiderMonkey.
	var QReturnValue;
	if (typeof ReturnValue !== "undefined") {
	    QReturnValue = ReturnValue;
	} else {
	    QReturnValue = function (value) {
	        this.value = value;
	    };
	}
	
	// long stack traces
	
	var STACK_JUMP_SEPARATOR = "From previous event:";
	
	function makeStackTraceLong(error, promise) {
	    // If possible, transform the error stack trace by removing Node and Q
	    // cruft, then concatenating with the stack trace of `promise`. See #57.
	    if (hasStacks &&
	        promise.stack &&
	        typeof error === "object" &&
	        error !== null &&
	        error.stack &&
	        error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1
	    ) {
	        var stacks = [];
	        for (var p = promise; !!p; p = p.source) {
	            if (p.stack) {
	                stacks.unshift(p.stack);
	            }
	        }
	        stacks.unshift(error.stack);
	
	        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
	        error.stack = filterStackString(concatedStacks);
	    }
	}
	
	function filterStackString(stackString) {
	    var lines = stackString.split("\n");
	    var desiredLines = [];
	    for (var i = 0; i < lines.length; ++i) {
	        var line = lines[i];
	
	        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
	            desiredLines.push(line);
	        }
	    }
	    return desiredLines.join("\n");
	}
	
	function isNodeFrame(stackLine) {
	    return stackLine.indexOf("(module.js:") !== -1 ||
	           stackLine.indexOf("(node.js:") !== -1;
	}
	
	function getFileNameAndLineNumber(stackLine) {
	    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
	    // In IE10 function name can have spaces ("Anonymous function") O_o
	    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
	    if (attempt1) {
	        return [attempt1[1], Number(attempt1[2])];
	    }
	
	    // Anonymous functions: "at filename:lineNumber:columnNumber"
	    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
	    if (attempt2) {
	        return [attempt2[1], Number(attempt2[2])];
	    }
	
	    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
	    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
	    if (attempt3) {
	        return [attempt3[1], Number(attempt3[2])];
	    }
	}
	
	function isInternalFrame(stackLine) {
	    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);
	
	    if (!fileNameAndLineNumber) {
	        return false;
	    }
	
	    var fileName = fileNameAndLineNumber[0];
	    var lineNumber = fileNameAndLineNumber[1];
	
	    return fileName === qFileName &&
	        lineNumber >= qStartingLine &&
	        lineNumber <= qEndingLine;
	}
	
	// discover own file name and line number range for filtering stack
	// traces
	function captureLine() {
	    if (!hasStacks) {
	        return;
	    }
	
	    try {
	        throw new Error();
	    } catch (e) {
	        var lines = e.stack.split("\n");
	        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
	        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
	        if (!fileNameAndLineNumber) {
	            return;
	        }
	
	        qFileName = fileNameAndLineNumber[0];
	        return fileNameAndLineNumber[1];
	    }
	}
	
	function deprecate(callback, name, alternative) {
	    return function () {
	        if (typeof console !== "undefined" &&
	            typeof console.warn === "function") {
	            console.warn(name + " is deprecated, use " + alternative +
	                         " instead.", new Error("").stack);
	        }
	        return callback.apply(callback, arguments);
	    };
	}
	
	// end of shims
	// beginning of real work
	
	/**
	 * Constructs a promise for an immediate reference, passes promises through, or
	 * coerces promises from different systems.
	 * @param value immediate reference or promise
	 */
	function Q(value) {
	    // If the object is already a Promise, return it directly.  This enables
	    // the resolve function to both be used to created references from objects,
	    // but to tolerably coerce non-promises to promises.
	    if (value instanceof Promise) {
	        return value;
	    }
	
	    // assimilate thenables
	    if (isPromiseAlike(value)) {
	        return coerce(value);
	    } else {
	        return fulfill(value);
	    }
	}
	Q.resolve = Q;
	
	/**
	 * Performs a task in a future turn of the event loop.
	 * @param {Function} task
	 */
	Q.nextTick = nextTick;
	
	/**
	 * Controls whether or not long stack traces will be on
	 */
	Q.longStackSupport = false;
	
	// enable long stacks if Q_DEBUG is set
	if (typeof process === "object" && process && process.env && process.env.Q_DEBUG) {
	    Q.longStackSupport = true;
	}
	
	/**
	 * Constructs a {promise, resolve, reject} object.
	 *
	 * `resolve` is a callback to invoke with a more resolved value for the
	 * promise. To fulfill the promise, invoke `resolve` with any value that is
	 * not a thenable. To reject the promise, invoke `resolve` with a rejected
	 * thenable, or invoke `reject` with the reason directly. To resolve the
	 * promise to another thenable, thus putting it in the same state, invoke
	 * `resolve` with that other thenable.
	 */
	Q.defer = defer;
	function defer() {
	    // if "messages" is an "Array", that indicates that the promise has not yet
	    // been resolved.  If it is "undefined", it has been resolved.  Each
	    // element of the messages array is itself an array of complete arguments to
	    // forward to the resolved promise.  We coerce the resolution value to a
	    // promise using the `resolve` function because it handles both fully
	    // non-thenable values and other thenables gracefully.
	    var messages = [], progressListeners = [], resolvedPromise;
	
	    var deferred = object_create(defer.prototype);
	    var promise = object_create(Promise.prototype);
	
	    promise.promiseDispatch = function (resolve, op, operands) {
	        var args = array_slice(arguments);
	        if (messages) {
	            messages.push(args);
	            if (op === "when" && operands[1]) { // progress operand
	                progressListeners.push(operands[1]);
	            }
	        } else {
	            Q.nextTick(function () {
	                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
	            });
	        }
	    };
	
	    // XXX deprecated
	    promise.valueOf = function () {
	        if (messages) {
	            return promise;
	        }
	        var nearerValue = nearer(resolvedPromise);
	        if (isPromise(nearerValue)) {
	            resolvedPromise = nearerValue; // shorten chain
	        }
	        return nearerValue;
	    };
	
	    promise.inspect = function () {
	        if (!resolvedPromise) {
	            return { state: "pending" };
	        }
	        return resolvedPromise.inspect();
	    };
	
	    if (Q.longStackSupport && hasStacks) {
	        try {
	            throw new Error();
	        } catch (e) {
	            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
	            // accessor around; that causes memory leaks as per GH-111. Just
	            // reify the stack trace as a string ASAP.
	            //
	            // At the same time, cut off the first line; it's always just
	            // "[object Promise]\n", as per the `toString`.
	            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
	        }
	    }
	
	    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
	    // consolidating them into `become`, since otherwise we'd create new
	    // promises with the lines `become(whatever(value))`. See e.g. GH-252.
	
	    function become(newPromise) {
	        resolvedPromise = newPromise;
	        promise.source = newPromise;
	
	        array_reduce(messages, function (undefined, message) {
	            Q.nextTick(function () {
	                newPromise.promiseDispatch.apply(newPromise, message);
	            });
	        }, void 0);
	
	        messages = void 0;
	        progressListeners = void 0;
	    }
	
	    deferred.promise = promise;
	    deferred.resolve = function (value) {
	        if (resolvedPromise) {
	            return;
	        }
	
	        become(Q(value));
	    };
	
	    deferred.fulfill = function (value) {
	        if (resolvedPromise) {
	            return;
	        }
	
	        become(fulfill(value));
	    };
	    deferred.reject = function (reason) {
	        if (resolvedPromise) {
	            return;
	        }
	
	        become(reject(reason));
	    };
	    deferred.notify = function (progress) {
	        if (resolvedPromise) {
	            return;
	        }
	
	        array_reduce(progressListeners, function (undefined, progressListener) {
	            Q.nextTick(function () {
	                progressListener(progress);
	            });
	        }, void 0);
	    };
	
	    return deferred;
	}
	
	/**
	 * Creates a Node-style callback that will resolve or reject the deferred
	 * promise.
	 * @returns a nodeback
	 */
	defer.prototype.makeNodeResolver = function () {
	    var self = this;
	    return function (error, value) {
	        if (error) {
	            self.reject(error);
	        } else if (arguments.length > 2) {
	            self.resolve(array_slice(arguments, 1));
	        } else {
	            self.resolve(value);
	        }
	    };
	};
	
	/**
	 * @param resolver {Function} a function that returns nothing and accepts
	 * the resolve, reject, and notify functions for a deferred.
	 * @returns a promise that may be resolved with the given resolve and reject
	 * functions, or rejected by a thrown exception in resolver
	 */
	Q.Promise = promise; // ES6
	Q.promise = promise;
	function promise(resolver) {
	    if (typeof resolver !== "function") {
	        throw new TypeError("resolver must be a function.");
	    }
	    var deferred = defer();
	    try {
	        resolver(deferred.resolve, deferred.reject, deferred.notify);
	    } catch (reason) {
	        deferred.reject(reason);
	    }
	    return deferred.promise;
	}
	
	promise.race = race; // ES6
	promise.all = all; // ES6
	promise.reject = reject; // ES6
	promise.resolve = Q; // ES6
	
	// XXX experimental.  This method is a way to denote that a local value is
	// serializable and should be immediately dispatched to a remote upon request,
	// instead of passing a reference.
	Q.passByCopy = function (object) {
	    //freeze(object);
	    //passByCopies.set(object, true);
	    return object;
	};
	
	Promise.prototype.passByCopy = function () {
	    //freeze(object);
	    //passByCopies.set(object, true);
	    return this;
	};
	
	/**
	 * If two promises eventually fulfill to the same value, promises that value,
	 * but otherwise rejects.
	 * @param x {Any*}
	 * @param y {Any*}
	 * @returns {Any*} a promise for x and y if they are the same, but a rejection
	 * otherwise.
	 *
	 */
	Q.join = function (x, y) {
	    return Q(x).join(y);
	};
	
	Promise.prototype.join = function (that) {
	    return Q([this, that]).spread(function (x, y) {
	        if (x === y) {
	            // TODO: "===" should be Object.is or equiv
	            return x;
	        } else {
	            throw new Error("Can't join: not the same: " + x + " " + y);
	        }
	    });
	};
	
	/**
	 * Returns a promise for the first of an array of promises to become settled.
	 * @param answers {Array[Any*]} promises to race
	 * @returns {Any*} the first promise to be settled
	 */
	Q.race = race;
	function race(answerPs) {
	    return promise(function (resolve, reject) {
	        // Switch to this once we can assume at least ES5
	        // answerPs.forEach(function (answerP) {
	        //     Q(answerP).then(resolve, reject);
	        // });
	        // Use this in the meantime
	        for (var i = 0, len = answerPs.length; i < len; i++) {
	            Q(answerPs[i]).then(resolve, reject);
	        }
	    });
	}
	
	Promise.prototype.race = function () {
	    return this.then(Q.race);
	};
	
	/**
	 * Constructs a Promise with a promise descriptor object and optional fallback
	 * function.  The descriptor contains methods like when(rejected), get(name),
	 * set(name, value), post(name, args), and delete(name), which all
	 * return either a value, a promise for a value, or a rejection.  The fallback
	 * accepts the operation name, a resolver, and any further arguments that would
	 * have been forwarded to the appropriate method above had a method been
	 * provided with the proper name.  The API makes no guarantees about the nature
	 * of the returned object, apart from that it is usable whereever promises are
	 * bought and sold.
	 */
	Q.makePromise = Promise;
	function Promise(descriptor, fallback, inspect) {
	    if (fallback === void 0) {
	        fallback = function (op) {
	            return reject(new Error(
	                "Promise does not support operation: " + op
	            ));
	        };
	    }
	    if (inspect === void 0) {
	        inspect = function () {
	            return {state: "unknown"};
	        };
	    }
	
	    var promise = object_create(Promise.prototype);
	
	    promise.promiseDispatch = function (resolve, op, args) {
	        var result;
	        try {
	            if (descriptor[op]) {
	                result = descriptor[op].apply(promise, args);
	            } else {
	                result = fallback.call(promise, op, args);
	            }
	        } catch (exception) {
	            result = reject(exception);
	        }
	        if (resolve) {
	            resolve(result);
	        }
	    };
	
	    promise.inspect = inspect;
	
	    // XXX deprecated `valueOf` and `exception` support
	    if (inspect) {
	        var inspected = inspect();
	        if (inspected.state === "rejected") {
	            promise.exception = inspected.reason;
	        }
	
	        promise.valueOf = function () {
	            var inspected = inspect();
	            if (inspected.state === "pending" ||
	                inspected.state === "rejected") {
	                return promise;
	            }
	            return inspected.value;
	        };
	    }
	
	    return promise;
	}
	
	Promise.prototype.toString = function () {
	    return "[object Promise]";
	};
	
	Promise.prototype.then = function (fulfilled, rejected, progressed) {
	    var self = this;
	    var deferred = defer();
	    var done = false;   // ensure the untrusted promise makes at most a
	                        // single call to one of the callbacks
	
	    function _fulfilled(value) {
	        try {
	            return typeof fulfilled === "function" ? fulfilled(value) : value;
	        } catch (exception) {
	            return reject(exception);
	        }
	    }
	
	    function _rejected(exception) {
	        if (typeof rejected === "function") {
	            makeStackTraceLong(exception, self);
	            try {
	                return rejected(exception);
	            } catch (newException) {
	                return reject(newException);
	            }
	        }
	        return reject(exception);
	    }
	
	    function _progressed(value) {
	        return typeof progressed === "function" ? progressed(value) : value;
	    }
	
	    Q.nextTick(function () {
	        self.promiseDispatch(function (value) {
	            if (done) {
	                return;
	            }
	            done = true;
	
	            deferred.resolve(_fulfilled(value));
	        }, "when", [function (exception) {
	            if (done) {
	                return;
	            }
	            done = true;
	
	            deferred.resolve(_rejected(exception));
	        }]);
	    });
	
	    // Progress propagator need to be attached in the current tick.
	    self.promiseDispatch(void 0, "when", [void 0, function (value) {
	        var newValue;
	        var threw = false;
	        try {
	            newValue = _progressed(value);
	        } catch (e) {
	            threw = true;
	            if (Q.onerror) {
	                Q.onerror(e);
	            } else {
	                throw e;
	            }
	        }
	
	        if (!threw) {
	            deferred.notify(newValue);
	        }
	    }]);
	
	    return deferred.promise;
	};
	
	Q.tap = function (promise, callback) {
	    return Q(promise).tap(callback);
	};
	
	/**
	 * Works almost like "finally", but not called for rejections.
	 * Original resolution value is passed through callback unaffected.
	 * Callback may return a promise that will be awaited for.
	 * @param {Function} callback
	 * @returns {Q.Promise}
	 * @example
	 * doSomething()
	 *   .then(...)
	 *   .tap(console.log)
	 *   .then(...);
	 */
	Promise.prototype.tap = function (callback) {
	    callback = Q(callback);
	
	    return this.then(function (value) {
	        return callback.fcall(value).thenResolve(value);
	    });
	};
	
	/**
	 * Registers an observer on a promise.
	 *
	 * Guarantees:
	 *
	 * 1. that fulfilled and rejected will be called only once.
	 * 2. that either the fulfilled callback or the rejected callback will be
	 *    called, but not both.
	 * 3. that fulfilled and rejected will not be called in this turn.
	 *
	 * @param value      promise or immediate reference to observe
	 * @param fulfilled  function to be called with the fulfilled value
	 * @param rejected   function to be called with the rejection exception
	 * @param progressed function to be called on any progress notifications
	 * @return promise for the return value from the invoked callback
	 */
	Q.when = when;
	function when(value, fulfilled, rejected, progressed) {
	    return Q(value).then(fulfilled, rejected, progressed);
	}
	
	Promise.prototype.thenResolve = function (value) {
	    return this.then(function () { return value; });
	};
	
	Q.thenResolve = function (promise, value) {
	    return Q(promise).thenResolve(value);
	};
	
	Promise.prototype.thenReject = function (reason) {
	    return this.then(function () { throw reason; });
	};
	
	Q.thenReject = function (promise, reason) {
	    return Q(promise).thenReject(reason);
	};
	
	/**
	 * If an object is not a promise, it is as "near" as possible.
	 * If a promise is rejected, it is as "near" as possible too.
	 * If it’s a fulfilled promise, the fulfillment value is nearer.
	 * If it’s a deferred promise and the deferred has been resolved, the
	 * resolution is "nearer".
	 * @param object
	 * @returns most resolved (nearest) form of the object
	 */
	
	// XXX should we re-do this?
	Q.nearer = nearer;
	function nearer(value) {
	    if (isPromise(value)) {
	        var inspected = value.inspect();
	        if (inspected.state === "fulfilled") {
	            return inspected.value;
	        }
	    }
	    return value;
	}
	
	/**
	 * @returns whether the given object is a promise.
	 * Otherwise it is a fulfilled value.
	 */
	Q.isPromise = isPromise;
	function isPromise(object) {
	    return object instanceof Promise;
	}
	
	Q.isPromiseAlike = isPromiseAlike;
	function isPromiseAlike(object) {
	    return isObject(object) && typeof object.then === "function";
	}
	
	/**
	 * @returns whether the given object is a pending promise, meaning not
	 * fulfilled or rejected.
	 */
	Q.isPending = isPending;
	function isPending(object) {
	    return isPromise(object) && object.inspect().state === "pending";
	}
	
	Promise.prototype.isPending = function () {
	    return this.inspect().state === "pending";
	};
	
	/**
	 * @returns whether the given object is a value or fulfilled
	 * promise.
	 */
	Q.isFulfilled = isFulfilled;
	function isFulfilled(object) {
	    return !isPromise(object) || object.inspect().state === "fulfilled";
	}
	
	Promise.prototype.isFulfilled = function () {
	    return this.inspect().state === "fulfilled";
	};
	
	/**
	 * @returns whether the given object is a rejected promise.
	 */
	Q.isRejected = isRejected;
	function isRejected(object) {
	    return isPromise(object) && object.inspect().state === "rejected";
	}
	
	Promise.prototype.isRejected = function () {
	    return this.inspect().state === "rejected";
	};
	
	//// BEGIN UNHANDLED REJECTION TRACKING
	
	// This promise library consumes exceptions thrown in handlers so they can be
	// handled by a subsequent promise.  The exceptions get added to this array when
	// they are created, and removed when they are handled.  Note that in ES6 or
	// shimmed environments, this would naturally be a `Set`.
	var unhandledReasons = [];
	var unhandledRejections = [];
	var reportedUnhandledRejections = [];
	var trackUnhandledRejections = true;
	
	function resetUnhandledRejections() {
	    unhandledReasons.length = 0;
	    unhandledRejections.length = 0;
	
	    if (!trackUnhandledRejections) {
	        trackUnhandledRejections = true;
	    }
	}
	
	function trackRejection(promise, reason) {
	    if (!trackUnhandledRejections) {
	        return;
	    }
	    if (typeof process === "object" && typeof process.emit === "function") {
	        Q.nextTick.runAfter(function () {
	            if (array_indexOf(unhandledRejections, promise) !== -1) {
	                process.emit("unhandledRejection", reason, promise);
	                reportedUnhandledRejections.push(promise);
	            }
	        });
	    }
	
	    unhandledRejections.push(promise);
	    if (reason && typeof reason.stack !== "undefined") {
	        unhandledReasons.push(reason.stack);
	    } else {
	        unhandledReasons.push("(no stack) " + reason);
	    }
	}
	
	function untrackRejection(promise) {
	    if (!trackUnhandledRejections) {
	        return;
	    }
	
	    var at = array_indexOf(unhandledRejections, promise);
	    if (at !== -1) {
	        if (typeof process === "object" && typeof process.emit === "function") {
	            Q.nextTick.runAfter(function () {
	                var atReport = array_indexOf(reportedUnhandledRejections, promise);
	                if (atReport !== -1) {
	                    process.emit("rejectionHandled", unhandledReasons[at], promise);
	                    reportedUnhandledRejections.splice(atReport, 1);
	                }
	            });
	        }
	        unhandledRejections.splice(at, 1);
	        unhandledReasons.splice(at, 1);
	    }
	}
	
	Q.resetUnhandledRejections = resetUnhandledRejections;
	
	Q.getUnhandledReasons = function () {
	    // Make a copy so that consumers can't interfere with our internal state.
	    return unhandledReasons.slice();
	};
	
	Q.stopUnhandledRejectionTracking = function () {
	    resetUnhandledRejections();
	    trackUnhandledRejections = false;
	};
	
	resetUnhandledRejections();
	
	//// END UNHANDLED REJECTION TRACKING
	
	/**
	 * Constructs a rejected promise.
	 * @param reason value describing the failure
	 */
	Q.reject = reject;
	function reject(reason) {
	    var rejection = Promise({
	        "when": function (rejected) {
	            // note that the error has been handled
	            if (rejected) {
	                untrackRejection(this);
	            }
	            return rejected ? rejected(reason) : this;
	        }
	    }, function fallback() {
	        return this;
	    }, function inspect() {
	        return { state: "rejected", reason: reason };
	    });
	
	    // Note that the reason has not been handled.
	    trackRejection(rejection, reason);
	
	    return rejection;
	}
	
	/**
	 * Constructs a fulfilled promise for an immediate reference.
	 * @param value immediate reference
	 */
	Q.fulfill = fulfill;
	function fulfill(value) {
	    return Promise({
	        "when": function () {
	            return value;
	        },
	        "get": function (name) {
	            return value[name];
	        },
	        "set": function (name, rhs) {
	            value[name] = rhs;
	        },
	        "delete": function (name) {
	            delete value[name];
	        },
	        "post": function (name, args) {
	            // Mark Miller proposes that post with no name should apply a
	            // promised function.
	            if (name === null || name === void 0) {
	                return value.apply(void 0, args);
	            } else {
	                return value[name].apply(value, args);
	            }
	        },
	        "apply": function (thisp, args) {
	            return value.apply(thisp, args);
	        },
	        "keys": function () {
	            return object_keys(value);
	        }
	    }, void 0, function inspect() {
	        return { state: "fulfilled", value: value };
	    });
	}
	
	/**
	 * Converts thenables to Q promises.
	 * @param promise thenable promise
	 * @returns a Q promise
	 */
	function coerce(promise) {
	    var deferred = defer();
	    Q.nextTick(function () {
	        try {
	            promise.then(deferred.resolve, deferred.reject, deferred.notify);
	        } catch (exception) {
	            deferred.reject(exception);
	        }
	    });
	    return deferred.promise;
	}
	
	/**
	 * Annotates an object such that it will never be
	 * transferred away from this process over any promise
	 * communication channel.
	 * @param object
	 * @returns promise a wrapping of that object that
	 * additionally responds to the "isDef" message
	 * without a rejection.
	 */
	Q.master = master;
	function master(object) {
	    return Promise({
	        "isDef": function () {}
	    }, function fallback(op, args) {
	        return dispatch(object, op, args);
	    }, function () {
	        return Q(object).inspect();
	    });
	}
	
	/**
	 * Spreads the values of a promised array of arguments into the
	 * fulfillment callback.
	 * @param fulfilled callback that receives variadic arguments from the
	 * promised array
	 * @param rejected callback that receives the exception if the promise
	 * is rejected.
	 * @returns a promise for the return value or thrown exception of
	 * either callback.
	 */
	Q.spread = spread;
	function spread(value, fulfilled, rejected) {
	    return Q(value).spread(fulfilled, rejected);
	}
	
	Promise.prototype.spread = function (fulfilled, rejected) {
	    return this.all().then(function (array) {
	        return fulfilled.apply(void 0, array);
	    }, rejected);
	};
	
	/**
	 * The async function is a decorator for generator functions, turning
	 * them into asynchronous generators.  Although generators are only part
	 * of the newest ECMAScript 6 drafts, this code does not cause syntax
	 * errors in older engines.  This code should continue to work and will
	 * in fact improve over time as the language improves.
	 *
	 * ES6 generators are currently part of V8 version 3.19 with the
	 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
	 * for longer, but under an older Python-inspired form.  This function
	 * works on both kinds of generators.
	 *
	 * Decorates a generator function such that:
	 *  - it may yield promises
	 *  - execution will continue when that promise is fulfilled
	 *  - the value of the yield expression will be the fulfilled value
	 *  - it returns a promise for the return value (when the generator
	 *    stops iterating)
	 *  - the decorated function returns a promise for the return value
	 *    of the generator or the first rejected promise among those
	 *    yielded.
	 *  - if an error is thrown in the generator, it propagates through
	 *    every following yield until it is caught, or until it escapes
	 *    the generator function altogether, and is translated into a
	 *    rejection for the promise returned by the decorated generator.
	 */
	Q.async = async;
	function async(makeGenerator) {
	    return function () {
	        // when verb is "send", arg is a value
	        // when verb is "throw", arg is an exception
	        function continuer(verb, arg) {
	            var result;
	
	            // Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
	            // engine that has a deployed base of browsers that support generators.
	            // However, SM's generators use the Python-inspired semantics of
	            // outdated ES6 drafts.  We would like to support ES6, but we'd also
	            // like to make it possible to use generators in deployed browsers, so
	            // we also support Python-style generators.  At some point we can remove
	            // this block.
	
	            if (typeof StopIteration === "undefined") {
	                // ES6 Generators
	                try {
	                    result = generator[verb](arg);
	                } catch (exception) {
	                    return reject(exception);
	                }
	                if (result.done) {
	                    return Q(result.value);
	                } else {
	                    return when(result.value, callback, errback);
	                }
	            } else {
	                // SpiderMonkey Generators
	                // FIXME: Remove this case when SM does ES6 generators.
	                try {
	                    result = generator[verb](arg);
	                } catch (exception) {
	                    if (isStopIteration(exception)) {
	                        return Q(exception.value);
	                    } else {
	                        return reject(exception);
	                    }
	                }
	                return when(result, callback, errback);
	            }
	        }
	        var generator = makeGenerator.apply(this, arguments);
	        var callback = continuer.bind(continuer, "next");
	        var errback = continuer.bind(continuer, "throw");
	        return callback();
	    };
	}
	
	/**
	 * The spawn function is a small wrapper around async that immediately
	 * calls the generator and also ends the promise chain, so that any
	 * unhandled errors are thrown instead of forwarded to the error
	 * handler. This is useful because it's extremely common to run
	 * generators at the top-level to work with libraries.
	 */
	Q.spawn = spawn;
	function spawn(makeGenerator) {
	    Q.done(Q.async(makeGenerator)());
	}
	
	// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
	/**
	 * Throws a ReturnValue exception to stop an asynchronous generator.
	 *
	 * This interface is a stop-gap measure to support generator return
	 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
	 * generators like Chromium 29, just use "return" in your generator
	 * functions.
	 *
	 * @param value the return value for the surrounding generator
	 * @throws ReturnValue exception with the value.
	 * @example
	 * // ES6 style
	 * Q.async(function* () {
	 *      var foo = yield getFooPromise();
	 *      var bar = yield getBarPromise();
	 *      return foo + bar;
	 * })
	 * // Older SpiderMonkey style
	 * Q.async(function () {
	 *      var foo = yield getFooPromise();
	 *      var bar = yield getBarPromise();
	 *      Q.return(foo + bar);
	 * })
	 */
	Q["return"] = _return;
	function _return(value) {
	    throw new QReturnValue(value);
	}
	
	/**
	 * The promised function decorator ensures that any promise arguments
	 * are settled and passed as values (`this` is also settled and passed
	 * as a value).  It will also ensure that the result of a function is
	 * always a promise.
	 *
	 * @example
	 * var add = Q.promised(function (a, b) {
	 *     return a + b;
	 * });
	 * add(Q(a), Q(B));
	 *
	 * @param {function} callback The function to decorate
	 * @returns {function} a function that has been decorated.
	 */
	Q.promised = promised;
	function promised(callback) {
	    return function () {
	        return spread([this, all(arguments)], function (self, args) {
	            return callback.apply(self, args);
	        });
	    };
	}
	
	/**
	 * sends a message to a value in a future turn
	 * @param object* the recipient
	 * @param op the name of the message operation, e.g., "when",
	 * @param args further arguments to be forwarded to the operation
	 * @returns result {Promise} a promise for the result of the operation
	 */
	Q.dispatch = dispatch;
	function dispatch(object, op, args) {
	    return Q(object).dispatch(op, args);
	}
	
	Promise.prototype.dispatch = function (op, args) {
	    var self = this;
	    var deferred = defer();
	    Q.nextTick(function () {
	        self.promiseDispatch(deferred.resolve, op, args);
	    });
	    return deferred.promise;
	};
	
	/**
	 * Gets the value of a property in a future turn.
	 * @param object    promise or immediate reference for target object
	 * @param name      name of property to get
	 * @return promise for the property value
	 */
	Q.get = function (object, key) {
	    return Q(object).dispatch("get", [key]);
	};
	
	Promise.prototype.get = function (key) {
	    return this.dispatch("get", [key]);
	};
	
	/**
	 * Sets the value of a property in a future turn.
	 * @param object    promise or immediate reference for object object
	 * @param name      name of property to set
	 * @param value     new value of property
	 * @return promise for the return value
	 */
	Q.set = function (object, key, value) {
	    return Q(object).dispatch("set", [key, value]);
	};
	
	Promise.prototype.set = function (key, value) {
	    return this.dispatch("set", [key, value]);
	};
	
	/**
	 * Deletes a property in a future turn.
	 * @param object    promise or immediate reference for target object
	 * @param name      name of property to delete
	 * @return promise for the return value
	 */
	Q.del = // XXX legacy
	Q["delete"] = function (object, key) {
	    return Q(object).dispatch("delete", [key]);
	};
	
	Promise.prototype.del = // XXX legacy
	Promise.prototype["delete"] = function (key) {
	    return this.dispatch("delete", [key]);
	};
	
	/**
	 * Invokes a method in a future turn.
	 * @param object    promise or immediate reference for target object
	 * @param name      name of method to invoke
	 * @param value     a value to post, typically an array of
	 *                  invocation arguments for promises that
	 *                  are ultimately backed with `resolve` values,
	 *                  as opposed to those backed with URLs
	 *                  wherein the posted value can be any
	 *                  JSON serializable object.
	 * @return promise for the return value
	 */
	// bound locally because it is used by other methods
	Q.mapply = // XXX As proposed by "Redsandro"
	Q.post = function (object, name, args) {
	    return Q(object).dispatch("post", [name, args]);
	};
	
	Promise.prototype.mapply = // XXX As proposed by "Redsandro"
	Promise.prototype.post = function (name, args) {
	    return this.dispatch("post", [name, args]);
	};
	
	/**
	 * Invokes a method in a future turn.
	 * @param object    promise or immediate reference for target object
	 * @param name      name of method to invoke
	 * @param ...args   array of invocation arguments
	 * @return promise for the return value
	 */
	Q.send = // XXX Mark Miller's proposed parlance
	Q.mcall = // XXX As proposed by "Redsandro"
	Q.invoke = function (object, name /*...args*/) {
	    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
	};
	
	Promise.prototype.send = // XXX Mark Miller's proposed parlance
	Promise.prototype.mcall = // XXX As proposed by "Redsandro"
	Promise.prototype.invoke = function (name /*...args*/) {
	    return this.dispatch("post", [name, array_slice(arguments, 1)]);
	};
	
	/**
	 * Applies the promised function in a future turn.
	 * @param object    promise or immediate reference for target function
	 * @param args      array of application arguments
	 */
	Q.fapply = function (object, args) {
	    return Q(object).dispatch("apply", [void 0, args]);
	};
	
	Promise.prototype.fapply = function (args) {
	    return this.dispatch("apply", [void 0, args]);
	};
	
	/**
	 * Calls the promised function in a future turn.
	 * @param object    promise or immediate reference for target function
	 * @param ...args   array of application arguments
	 */
	Q["try"] =
	Q.fcall = function (object /* ...args*/) {
	    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
	};
	
	Promise.prototype.fcall = function (/*...args*/) {
	    return this.dispatch("apply", [void 0, array_slice(arguments)]);
	};
	
	/**
	 * Binds the promised function, transforming return values into a fulfilled
	 * promise and thrown errors into a rejected one.
	 * @param object    promise or immediate reference for target function
	 * @param ...args   array of application arguments
	 */
	Q.fbind = function (object /*...args*/) {
	    var promise = Q(object);
	    var args = array_slice(arguments, 1);
	    return function fbound() {
	        return promise.dispatch("apply", [
	            this,
	            args.concat(array_slice(arguments))
	        ]);
	    };
	};
	Promise.prototype.fbind = function (/*...args*/) {
	    var promise = this;
	    var args = array_slice(arguments);
	    return function fbound() {
	        return promise.dispatch("apply", [
	            this,
	            args.concat(array_slice(arguments))
	        ]);
	    };
	};
	
	/**
	 * Requests the names of the owned properties of a promised
	 * object in a future turn.
	 * @param object    promise or immediate reference for target object
	 * @return promise for the keys of the eventually settled object
	 */
	Q.keys = function (object) {
	    return Q(object).dispatch("keys", []);
	};
	
	Promise.prototype.keys = function () {
	    return this.dispatch("keys", []);
	};
	
	/**
	 * Turns an array of promises into a promise for an array.  If any of
	 * the promises gets rejected, the whole array is rejected immediately.
	 * @param {Array*} an array (or promise for an array) of values (or
	 * promises for values)
	 * @returns a promise for an array of the corresponding values
	 */
	// By Mark Miller
	// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
	Q.all = all;
	function all(promises) {
	    return when(promises, function (promises) {
	        var pendingCount = 0;
	        var deferred = defer();
	        array_reduce(promises, function (undefined, promise, index) {
	            var snapshot;
	            if (
	                isPromise(promise) &&
	                (snapshot = promise.inspect()).state === "fulfilled"
	            ) {
	                promises[index] = snapshot.value;
	            } else {
	                ++pendingCount;
	                when(
	                    promise,
	                    function (value) {
	                        promises[index] = value;
	                        if (--pendingCount === 0) {
	                            deferred.resolve(promises);
	                        }
	                    },
	                    deferred.reject,
	                    function (progress) {
	                        deferred.notify({ index: index, value: progress });
	                    }
	                );
	            }
	        }, void 0);
	        if (pendingCount === 0) {
	            deferred.resolve(promises);
	        }
	        return deferred.promise;
	    });
	}
	
	Promise.prototype.all = function () {
	    return all(this);
	};
	
	/**
	 * Returns the first resolved promise of an array. Prior rejected promises are
	 * ignored.  Rejects only if all promises are rejected.
	 * @param {Array*} an array containing values or promises for values
	 * @returns a promise fulfilled with the value of the first resolved promise,
	 * or a rejected promise if all promises are rejected.
	 */
	Q.any = any;
	
	function any(promises) {
	    if (promises.length === 0) {
	        return Q.resolve();
	    }
	
	    var deferred = Q.defer();
	    var pendingCount = 0;
	    array_reduce(promises, function (prev, current, index) {
	        var promise = promises[index];
	
	        pendingCount++;
	
	        when(promise, onFulfilled, onRejected, onProgress);
	        function onFulfilled(result) {
	            deferred.resolve(result);
	        }
	        function onRejected() {
	            pendingCount--;
	            if (pendingCount === 0) {
	                deferred.reject(new Error(
	                    "Can't get fulfillment value from any promise, all " +
	                    "promises were rejected."
	                ));
	            }
	        }
	        function onProgress(progress) {
	            deferred.notify({
	                index: index,
	                value: progress
	            });
	        }
	    }, undefined);
	
	    return deferred.promise;
	}
	
	Promise.prototype.any = function () {
	    return any(this);
	};
	
	/**
	 * Waits for all promises to be settled, either fulfilled or
	 * rejected.  This is distinct from `all` since that would stop
	 * waiting at the first rejection.  The promise returned by
	 * `allResolved` will never be rejected.
	 * @param promises a promise for an array (or an array) of promises
	 * (or values)
	 * @return a promise for an array of promises
	 */
	Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
	function allResolved(promises) {
	    return when(promises, function (promises) {
	        promises = array_map(promises, Q);
	        return when(all(array_map(promises, function (promise) {
	            return when(promise, noop, noop);
	        })), function () {
	            return promises;
	        });
	    });
	}
	
	Promise.prototype.allResolved = function () {
	    return allResolved(this);
	};
	
	/**
	 * @see Promise#allSettled
	 */
	Q.allSettled = allSettled;
	function allSettled(promises) {
	    return Q(promises).allSettled();
	}
	
	/**
	 * Turns an array of promises into a promise for an array of their states (as
	 * returned by `inspect`) when they have all settled.
	 * @param {Array[Any*]} values an array (or promise for an array) of values (or
	 * promises for values)
	 * @returns {Array[State]} an array of states for the respective values.
	 */
	Promise.prototype.allSettled = function () {
	    return this.then(function (promises) {
	        return all(array_map(promises, function (promise) {
	            promise = Q(promise);
	            function regardless() {
	                return promise.inspect();
	            }
	            return promise.then(regardless, regardless);
	        }));
	    });
	};
	
	/**
	 * Captures the failure of a promise, giving an oportunity to recover
	 * with a callback.  If the given promise is fulfilled, the returned
	 * promise is fulfilled.
	 * @param {Any*} promise for something
	 * @param {Function} callback to fulfill the returned promise if the
	 * given promise is rejected
	 * @returns a promise for the return value of the callback
	 */
	Q.fail = // XXX legacy
	Q["catch"] = function (object, rejected) {
	    return Q(object).then(void 0, rejected);
	};
	
	Promise.prototype.fail = // XXX legacy
	Promise.prototype["catch"] = function (rejected) {
	    return this.then(void 0, rejected);
	};
	
	/**
	 * Attaches a listener that can respond to progress notifications from a
	 * promise's originating deferred. This listener receives the exact arguments
	 * passed to ``deferred.notify``.
	 * @param {Any*} promise for something
	 * @param {Function} callback to receive any progress notifications
	 * @returns the given promise, unchanged
	 */
	Q.progress = progress;
	function progress(object, progressed) {
	    return Q(object).then(void 0, void 0, progressed);
	}
	
	Promise.prototype.progress = function (progressed) {
	    return this.then(void 0, void 0, progressed);
	};
	
	/**
	 * Provides an opportunity to observe the settling of a promise,
	 * regardless of whether the promise is fulfilled or rejected.  Forwards
	 * the resolution to the returned promise when the callback is done.
	 * The callback can return a promise to defer completion.
	 * @param {Any*} promise
	 * @param {Function} callback to observe the resolution of the given
	 * promise, takes no arguments.
	 * @returns a promise for the resolution of the given promise when
	 * ``fin`` is done.
	 */
	Q.fin = // XXX legacy
	Q["finally"] = function (object, callback) {
	    return Q(object)["finally"](callback);
	};
	
	Promise.prototype.fin = // XXX legacy
	Promise.prototype["finally"] = function (callback) {
	    callback = Q(callback);
	    return this.then(function (value) {
	        return callback.fcall().then(function () {
	            return value;
	        });
	    }, function (reason) {
	        // TODO attempt to recycle the rejection with "this".
	        return callback.fcall().then(function () {
	            throw reason;
	        });
	    });
	};
	
	/**
	 * Terminates a chain of promises, forcing rejections to be
	 * thrown as exceptions.
	 * @param {Any*} promise at the end of a chain of promises
	 * @returns nothing
	 */
	Q.done = function (object, fulfilled, rejected, progress) {
	    return Q(object).done(fulfilled, rejected, progress);
	};
	
	Promise.prototype.done = function (fulfilled, rejected, progress) {
	    var onUnhandledError = function (error) {
	        // forward to a future turn so that ``when``
	        // does not catch it and turn it into a rejection.
	        Q.nextTick(function () {
	            makeStackTraceLong(error, promise);
	            if (Q.onerror) {
	                Q.onerror(error);
	            } else {
	                throw error;
	            }
	        });
	    };
	
	    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
	    var promise = fulfilled || rejected || progress ?
	        this.then(fulfilled, rejected, progress) :
	        this;
	
	    if (typeof process === "object" && process && process.domain) {
	        onUnhandledError = process.domain.bind(onUnhandledError);
	    }
	
	    promise.then(void 0, onUnhandledError);
	};
	
	/**
	 * Causes a promise to be rejected if it does not get fulfilled before
	 * some milliseconds time out.
	 * @param {Any*} promise
	 * @param {Number} milliseconds timeout
	 * @param {Any*} custom error message or Error object (optional)
	 * @returns a promise for the resolution of the given promise if it is
	 * fulfilled before the timeout, otherwise rejected.
	 */
	Q.timeout = function (object, ms, error) {
	    return Q(object).timeout(ms, error);
	};
	
	Promise.prototype.timeout = function (ms, error) {
	    var deferred = defer();
	    var timeoutId = setTimeout(function () {
	        if (!error || "string" === typeof error) {
	            error = new Error(error || "Timed out after " + ms + " ms");
	            error.code = "ETIMEDOUT";
	        }
	        deferred.reject(error);
	    }, ms);
	
	    this.then(function (value) {
	        clearTimeout(timeoutId);
	        deferred.resolve(value);
	    }, function (exception) {
	        clearTimeout(timeoutId);
	        deferred.reject(exception);
	    }, deferred.notify);
	
	    return deferred.promise;
	};
	
	/**
	 * Returns a promise for the given value (or promised value), some
	 * milliseconds after it resolved. Passes rejections immediately.
	 * @param {Any*} promise
	 * @param {Number} milliseconds
	 * @returns a promise for the resolution of the given promise after milliseconds
	 * time has elapsed since the resolution of the given promise.
	 * If the given promise rejects, that is passed immediately.
	 */
	Q.delay = function (object, timeout) {
	    if (timeout === void 0) {
	        timeout = object;
	        object = void 0;
	    }
	    return Q(object).delay(timeout);
	};
	
	Promise.prototype.delay = function (timeout) {
	    return this.then(function (value) {
	        var deferred = defer();
	        setTimeout(function () {
	            deferred.resolve(value);
	        }, timeout);
	        return deferred.promise;
	    });
	};
	
	/**
	 * Passes a continuation to a Node function, which is called with the given
	 * arguments provided as an array, and returns a promise.
	 *
	 *      Q.nfapply(FS.readFile, [__filename])
	 *      .then(function (content) {
	 *      })
	 *
	 */
	Q.nfapply = function (callback, args) {
	    return Q(callback).nfapply(args);
	};
	
	Promise.prototype.nfapply = function (args) {
	    var deferred = defer();
	    var nodeArgs = array_slice(args);
	    nodeArgs.push(deferred.makeNodeResolver());
	    this.fapply(nodeArgs).fail(deferred.reject);
	    return deferred.promise;
	};
	
	/**
	 * Passes a continuation to a Node function, which is called with the given
	 * arguments provided individually, and returns a promise.
	 * @example
	 * Q.nfcall(FS.readFile, __filename)
	 * .then(function (content) {
	 * })
	 *
	 */
	Q.nfcall = function (callback /*...args*/) {
	    var args = array_slice(arguments, 1);
	    return Q(callback).nfapply(args);
	};
	
	Promise.prototype.nfcall = function (/*...args*/) {
	    var nodeArgs = array_slice(arguments);
	    var deferred = defer();
	    nodeArgs.push(deferred.makeNodeResolver());
	    this.fapply(nodeArgs).fail(deferred.reject);
	    return deferred.promise;
	};
	
	/**
	 * Wraps a NodeJS continuation passing function and returns an equivalent
	 * version that returns a promise.
	 * @example
	 * Q.nfbind(FS.readFile, __filename)("utf-8")
	 * .then(console.log)
	 * .done()
	 */
	Q.nfbind =
	Q.denodeify = function (callback /*...args*/) {
	    var baseArgs = array_slice(arguments, 1);
	    return function () {
	        var nodeArgs = baseArgs.concat(array_slice(arguments));
	        var deferred = defer();
	        nodeArgs.push(deferred.makeNodeResolver());
	        Q(callback).fapply(nodeArgs).fail(deferred.reject);
	        return deferred.promise;
	    };
	};
	
	Promise.prototype.nfbind =
	Promise.prototype.denodeify = function (/*...args*/) {
	    var args = array_slice(arguments);
	    args.unshift(this);
	    return Q.denodeify.apply(void 0, args);
	};
	
	Q.nbind = function (callback, thisp /*...args*/) {
	    var baseArgs = array_slice(arguments, 2);
	    return function () {
	        var nodeArgs = baseArgs.concat(array_slice(arguments));
	        var deferred = defer();
	        nodeArgs.push(deferred.makeNodeResolver());
	        function bound() {
	            return callback.apply(thisp, arguments);
	        }
	        Q(bound).fapply(nodeArgs).fail(deferred.reject);
	        return deferred.promise;
	    };
	};
	
	Promise.prototype.nbind = function (/*thisp, ...args*/) {
	    var args = array_slice(arguments, 0);
	    args.unshift(this);
	    return Q.nbind.apply(void 0, args);
	};
	
	/**
	 * Calls a method of a Node-style object that accepts a Node-style
	 * callback with a given array of arguments, plus a provided callback.
	 * @param object an object that has the named method
	 * @param {String} name name of the method of object
	 * @param {Array} args arguments to pass to the method; the callback
	 * will be provided by Q and appended to these arguments.
	 * @returns a promise for the value or error
	 */
	Q.nmapply = // XXX As proposed by "Redsandro"
	Q.npost = function (object, name, args) {
	    return Q(object).npost(name, args);
	};
	
	Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
	Promise.prototype.npost = function (name, args) {
	    var nodeArgs = array_slice(args || []);
	    var deferred = defer();
	    nodeArgs.push(deferred.makeNodeResolver());
	    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
	    return deferred.promise;
	};
	
	/**
	 * Calls a method of a Node-style object that accepts a Node-style
	 * callback, forwarding the given variadic arguments, plus a provided
	 * callback argument.
	 * @param object an object that has the named method
	 * @param {String} name name of the method of object
	 * @param ...args arguments to pass to the method; the callback will
	 * be provided by Q and appended to these arguments.
	 * @returns a promise for the value or error
	 */
	Q.nsend = // XXX Based on Mark Miller's proposed "send"
	Q.nmcall = // XXX Based on "Redsandro's" proposal
	Q.ninvoke = function (object, name /*...args*/) {
	    var nodeArgs = array_slice(arguments, 2);
	    var deferred = defer();
	    nodeArgs.push(deferred.makeNodeResolver());
	    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
	    return deferred.promise;
	};
	
	Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
	Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
	Promise.prototype.ninvoke = function (name /*...args*/) {
	    var nodeArgs = array_slice(arguments, 1);
	    var deferred = defer();
	    nodeArgs.push(deferred.makeNodeResolver());
	    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
	    return deferred.promise;
	};
	
	/**
	 * If a function would like to support both Node continuation-passing-style and
	 * promise-returning-style, it can end its internal promise chain with
	 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
	 * elects to use a nodeback, the result will be sent there.  If they do not
	 * pass a nodeback, they will receive the result promise.
	 * @param object a result (or a promise for a result)
	 * @param {Function} nodeback a Node.js-style callback
	 * @returns either the promise or nothing
	 */
	Q.nodeify = nodeify;
	function nodeify(object, nodeback) {
	    return Q(object).nodeify(nodeback);
	}
	
	Promise.prototype.nodeify = function (nodeback) {
	    if (nodeback) {
	        this.then(function (value) {
	            Q.nextTick(function () {
	                nodeback(null, value);
	            });
	        }, function (error) {
	            Q.nextTick(function () {
	                nodeback(error);
	            });
	        });
	    } else {
	        return this;
	    }
	};
	
	Q.noConflict = function() {
	    throw new Error("Q.noConflict only works when Q is used as a global");
	};
	
	// All code before this point will be filtered from stack traces.
	var qEndingLine = captureLine();
	
	return Q;
	
	});
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! (webpack)/~/node-libs-browser/~/process/browser.js */ 16)))

/***/ },
/* 9 */
/*!********************!*\
  !*** ./KBucket.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	var xor = __webpack_require__(/*! ./xor */ 4);
	var util = __webpack_require__(/*! ./util */ 2);
	
	
	function KBucket(k, prefix, kademlia, routingTable) {
	  this._list = [];
	  this.k = k;
	  this.prefix = prefix;
	  this.kademlia = kademlia;
	  this.routingTable = routingTable;
	}
	
	KBucket.prototype.update = function(id, online, cb) {
	  var index = this._list.indexOf(id);
	
	  if (online) {
	    if (index !== -1) {
	      this._list.moveIndexToTail(index);
	    } else {
	      if (this._list.length < this.k) {
	        this._list.push(id);
	        util.log('Added Node', id, '(' + xor.b64ToBinary(id).substr(0, 16) + ') to KBucket', this.prefix);
	        util.drawRoutingTable(this.routingTable);
	      } else {
	        // check if the OLDEST id is still online
	        var that = this;
	        this.kademlia.PING(this._list[0], function(res) {
	          if (res && res.error) {
	            that._list.shift();
	            that._list.push(id);
	            util.log('Added Node', id, '(' + xor.b64ToBinary(id).substr(0, 16) + ') to KBucket', this.prefix);
	            util.drawRoutingTable(that.routingTable);
	          } else {
	            // today we don't have a price for you :/
	          }
	        });
	      }
	
	      // notify the routing table, that there is a new node
	      // Later this should be done via the event emitter!
	      cb(id);
	    }
	  } else {
	    if (index !== -1) {
	      this._list.splice(index, 1);
	    }
	    util.log('Removed Node', id, '(' + xor.b64ToBinary(id).substr(0, 16) + ') from KBucket', this.prefix);
	    util.drawRoutingTable(this.routingTable);
	  }
	
	}
	
	KBucket.prototype.getLength = function() {
	  return this._list.length;
	}
	
	// return ids sorted by distance to input id
	KBucket.prototype.getClosest = function(id) {
	  return xor.sortByDistance(this._list, id);
	}
	
	/**
	  Choose a random ID and perform a Node Lookup for it
	**/
	KBucket.prototype.refresh = function() {
	  var randomId = _getRandomID.call(this);
	  this.kademlia.node_lookup(randomId, function(results) {
	    // gratz
	  });
	}
	
	KBucket.prototype.getNodes = function() {
	  return this._list;
	}
	
	KBucket.prototype.getPrefix = function() {
	  return this.prefix;
	}
	
	
	if (typeof Array.prototype.moveIndexToTail !== 'function') {
	  Array.prototype.moveIndexToTail = function(pos) {
	    var tmp = this[pos];
	    this.splice(pos, 1);
	    this.push(tmp);
	  };
	}
	
	function _getRandomID() {
	  var len = this._list.length;
	  var randomIndex = (Math.random() * len) | 0;
	  return this._list[randomIndex];
	}
	
	
	module.exports = KBucket;

/***/ },
/* 10 */
/*!************************************************!*\
  !*** /Users/tim/code/webrtc-kademlia/~/q/q.js ***!
  \************************************************/
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// vim:ts=4:sts=4:sw=4:
	/*!
	 *
	 * Copyright 2009-2012 Kris Kowal under the terms of the MIT
	 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
	 *
	 * With parts by Tyler Close
	 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
	 * at http://www.opensource.org/licenses/mit-license.html
	 * Forked at ref_send.js version: 2009-05-11
	 *
	 * With parts by Mark Miller
	 * Copyright (C) 2011 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 * http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 *
	 */
	
	(function (definition) {
	    "use strict";
	
	    // This file will function properly as a <script> tag, or a module
	    // using CommonJS and NodeJS or RequireJS module formats.  In
	    // Common/Node/RequireJS, the module exports the Q API and when
	    // executed as a simple <script>, it creates a Q global instead.
	
	    // Montage Require
	    if (typeof bootstrap === "function") {
	        bootstrap("promise", definition);
	
	    // CommonJS
	    } else if (true) {
	        module.exports = definition();
	
	    // RequireJS
	    } else if (typeof define === "function" && define.amd) {
	        define(definition);
	
	    // SES (Secure EcmaScript)
	    } else if (typeof ses !== "undefined") {
	        if (!ses.ok()) {
	            return;
	        } else {
	            ses.makeQ = definition;
	        }
	
	    // <script>
	    } else if (typeof window !== "undefined" || typeof self !== "undefined") {
	        // Prefer window over self for add-on scripts. Use self for
	        // non-windowed contexts.
	        var global = typeof window !== "undefined" ? window : self;
	
	        // Get the `window` object, save the previous Q global
	        // and initialize Q as a global.
	        var previousQ = global.Q;
	        global.Q = definition();
	
	        // Add a noConflict function so Q can be removed from the
	        // global namespace.
	        global.Q.noConflict = function () {
	            global.Q = previousQ;
	            return this;
	        };
	
	    } else {
	        throw new Error("This environment was not anticipated by Q. Please file a bug.");
	    }
	
	})(function () {
	"use strict";
	
	var hasStacks = false;
	try {
	    throw new Error();
	} catch (e) {
	    hasStacks = !!e.stack;
	}
	
	// All code after this point will be filtered from stack traces reported
	// by Q.
	var qStartingLine = captureLine();
	var qFileName;
	
	// shims
	
	// used for fallback in "allResolved"
	var noop = function () {};
	
	// Use the fastest possible means to execute a task in a future turn
	// of the event loop.
	var nextTick =(function () {
	    // linked list of tasks (single, with head node)
	    var head = {task: void 0, next: null};
	    var tail = head;
	    var flushing = false;
	    var requestTick = void 0;
	    var isNodeJS = false;
	    // queue for late tasks, used by unhandled rejection tracking
	    var laterQueue = [];
	
	    function flush() {
	        /* jshint loopfunc: true */
	        var task, domain;
	
	        while (head.next) {
	            head = head.next;
	            task = head.task;
	            head.task = void 0;
	            domain = head.domain;
	
	            if (domain) {
	                head.domain = void 0;
	                domain.enter();
	            }
	            runSingle(task, domain);
	
	        }
	        while (laterQueue.length) {
	            task = laterQueue.pop();
	            runSingle(task);
	        }
	        flushing = false;
	    }
	    // runs a single function in the async queue
	    function runSingle(task, domain) {
	        try {
	            task();
	
	        } catch (e) {
	            if (isNodeJS) {
	                // In node, uncaught exceptions are considered fatal errors.
	                // Re-throw them synchronously to interrupt flushing!
	
	                // Ensure continuation if the uncaught exception is suppressed
	                // listening "uncaughtException" events (as domains does).
	                // Continue in next event to avoid tick recursion.
	                if (domain) {
	                    domain.exit();
	                }
	                setTimeout(flush, 0);
	                if (domain) {
	                    domain.enter();
	                }
	
	                throw e;
	
	            } else {
	                // In browsers, uncaught exceptions are not fatal.
	                // Re-throw them asynchronously to avoid slow-downs.
	                setTimeout(function () {
	                    throw e;
	                }, 0);
	            }
	        }
	
	        if (domain) {
	            domain.exit();
	        }
	    }
	
	    nextTick = function (task) {
	        tail = tail.next = {
	            task: task,
	            domain: isNodeJS && process.domain,
	            next: null
	        };
	
	        if (!flushing) {
	            flushing = true;
	            requestTick();
	        }
	    };
	
	    if (typeof process === "object" &&
	        process.toString() === "[object process]" && process.nextTick) {
	        // Ensure Q is in a real Node environment, with a `process.nextTick`.
	        // To see through fake Node environments:
	        // * Mocha test runner - exposes a `process` global without a `nextTick`
	        // * Browserify - exposes a `process.nexTick` function that uses
	        //   `setTimeout`. In this case `setImmediate` is preferred because
	        //    it is faster. Browserify's `process.toString()` yields
	        //   "[object Object]", while in a real Node environment
	        //   `process.nextTick()` yields "[object process]".
	        isNodeJS = true;
	
	        requestTick = function () {
	            process.nextTick(flush);
	        };
	
	    } else if (typeof setImmediate === "function") {
	        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
	        if (typeof window !== "undefined") {
	            requestTick = setImmediate.bind(window, flush);
	        } else {
	            requestTick = function () {
	                setImmediate(flush);
	            };
	        }
	
	    } else if (typeof MessageChannel !== "undefined") {
	        // modern browsers
	        // http://www.nonblocking.io/2011/06/windownexttick.html
	        var channel = new MessageChannel();
	        // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
	        // working message ports the first time a page loads.
	        channel.port1.onmessage = function () {
	            requestTick = requestPortTick;
	            channel.port1.onmessage = flush;
	            flush();
	        };
	        var requestPortTick = function () {
	            // Opera requires us to provide a message payload, regardless of
	            // whether we use it.
	            channel.port2.postMessage(0);
	        };
	        requestTick = function () {
	            setTimeout(flush, 0);
	            requestPortTick();
	        };
	
	    } else {
	        // old browsers
	        requestTick = function () {
	            setTimeout(flush, 0);
	        };
	    }
	    // runs a task after all other tasks have been run
	    // this is useful for unhandled rejection tracking that needs to happen
	    // after all `then`d tasks have been run.
	    nextTick.runAfter = function (task) {
	        laterQueue.push(task);
	        if (!flushing) {
	            flushing = true;
	            requestTick();
	        }
	    };
	    return nextTick;
	})();
	
	// Attempt to make generics safe in the face of downstream
	// modifications.
	// There is no situation where this is necessary.
	// If you need a security guarantee, these primordials need to be
	// deeply frozen anyway, and if you don’t need a security guarantee,
	// this is just plain paranoid.
	// However, this **might** have the nice side-effect of reducing the size of
	// the minified code by reducing x.call() to merely x()
	// See Mark Miller’s explanation of what this does.
	// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
	var call = Function.call;
	function uncurryThis(f) {
	    return function () {
	        return call.apply(f, arguments);
	    };
	}
	// This is equivalent, but slower:
	// uncurryThis = Function_bind.bind(Function_bind.call);
	// http://jsperf.com/uncurrythis
	
	var array_slice = uncurryThis(Array.prototype.slice);
	
	var array_reduce = uncurryThis(
	    Array.prototype.reduce || function (callback, basis) {
	        var index = 0,
	            length = this.length;
	        // concerning the initial value, if one is not provided
	        if (arguments.length === 1) {
	            // seek to the first value in the array, accounting
	            // for the possibility that is is a sparse array
	            do {
	                if (index in this) {
	                    basis = this[index++];
	                    break;
	                }
	                if (++index >= length) {
	                    throw new TypeError();
	                }
	            } while (1);
	        }
	        // reduce
	        for (; index < length; index++) {
	            // account for the possibility that the array is sparse
	            if (index in this) {
	                basis = callback(basis, this[index], index);
	            }
	        }
	        return basis;
	    }
	);
	
	var array_indexOf = uncurryThis(
	    Array.prototype.indexOf || function (value) {
	        // not a very good shim, but good enough for our one use of it
	        for (var i = 0; i < this.length; i++) {
	            if (this[i] === value) {
	                return i;
	            }
	        }
	        return -1;
	    }
	);
	
	var array_map = uncurryThis(
	    Array.prototype.map || function (callback, thisp) {
	        var self = this;
	        var collect = [];
	        array_reduce(self, function (undefined, value, index) {
	            collect.push(callback.call(thisp, value, index, self));
	        }, void 0);
	        return collect;
	    }
	);
	
	var object_create = Object.create || function (prototype) {
	    function Type() { }
	    Type.prototype = prototype;
	    return new Type();
	};
	
	var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);
	
	var object_keys = Object.keys || function (object) {
	    var keys = [];
	    for (var key in object) {
	        if (object_hasOwnProperty(object, key)) {
	            keys.push(key);
	        }
	    }
	    return keys;
	};
	
	var object_toString = uncurryThis(Object.prototype.toString);
	
	function isObject(value) {
	    return value === Object(value);
	}
	
	// generator related shims
	
	// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
	function isStopIteration(exception) {
	    return (
	        object_toString(exception) === "[object StopIteration]" ||
	        exception instanceof QReturnValue
	    );
	}
	
	// FIXME: Remove this helper and Q.return once ES6 generators are in
	// SpiderMonkey.
	var QReturnValue;
	if (typeof ReturnValue !== "undefined") {
	    QReturnValue = ReturnValue;
	} else {
	    QReturnValue = function (value) {
	        this.value = value;
	    };
	}
	
	// long stack traces
	
	var STACK_JUMP_SEPARATOR = "From previous event:";
	
	function makeStackTraceLong(error, promise) {
	    // If possible, transform the error stack trace by removing Node and Q
	    // cruft, then concatenating with the stack trace of `promise`. See #57.
	    if (hasStacks &&
	        promise.stack &&
	        typeof error === "object" &&
	        error !== null &&
	        error.stack &&
	        error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1
	    ) {
	        var stacks = [];
	        for (var p = promise; !!p; p = p.source) {
	            if (p.stack) {
	                stacks.unshift(p.stack);
	            }
	        }
	        stacks.unshift(error.stack);
	
	        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
	        error.stack = filterStackString(concatedStacks);
	    }
	}
	
	function filterStackString(stackString) {
	    var lines = stackString.split("\n");
	    var desiredLines = [];
	    for (var i = 0; i < lines.length; ++i) {
	        var line = lines[i];
	
	        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
	            desiredLines.push(line);
	        }
	    }
	    return desiredLines.join("\n");
	}
	
	function isNodeFrame(stackLine) {
	    return stackLine.indexOf("(module.js:") !== -1 ||
	           stackLine.indexOf("(node.js:") !== -1;
	}
	
	function getFileNameAndLineNumber(stackLine) {
	    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
	    // In IE10 function name can have spaces ("Anonymous function") O_o
	    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
	    if (attempt1) {
	        return [attempt1[1], Number(attempt1[2])];
	    }
	
	    // Anonymous functions: "at filename:lineNumber:columnNumber"
	    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
	    if (attempt2) {
	        return [attempt2[1], Number(attempt2[2])];
	    }
	
	    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
	    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
	    if (attempt3) {
	        return [attempt3[1], Number(attempt3[2])];
	    }
	}
	
	function isInternalFrame(stackLine) {
	    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);
	
	    if (!fileNameAndLineNumber) {
	        return false;
	    }
	
	    var fileName = fileNameAndLineNumber[0];
	    var lineNumber = fileNameAndLineNumber[1];
	
	    return fileName === qFileName &&
	        lineNumber >= qStartingLine &&
	        lineNumber <= qEndingLine;
	}
	
	// discover own file name and line number range for filtering stack
	// traces
	function captureLine() {
	    if (!hasStacks) {
	        return;
	    }
	
	    try {
	        throw new Error();
	    } catch (e) {
	        var lines = e.stack.split("\n");
	        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
	        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
	        if (!fileNameAndLineNumber) {
	            return;
	        }
	
	        qFileName = fileNameAndLineNumber[0];
	        return fileNameAndLineNumber[1];
	    }
	}
	
	function deprecate(callback, name, alternative) {
	    return function () {
	        if (typeof console !== "undefined" &&
	            typeof console.warn === "function") {
	            console.warn(name + " is deprecated, use " + alternative +
	                         " instead.", new Error("").stack);
	        }
	        return callback.apply(callback, arguments);
	    };
	}
	
	// end of shims
	// beginning of real work
	
	/**
	 * Constructs a promise for an immediate reference, passes promises through, or
	 * coerces promises from different systems.
	 * @param value immediate reference or promise
	 */
	function Q(value) {
	    // If the object is already a Promise, return it directly.  This enables
	    // the resolve function to both be used to created references from objects,
	    // but to tolerably coerce non-promises to promises.
	    if (value instanceof Promise) {
	        return value;
	    }
	
	    // assimilate thenables
	    if (isPromiseAlike(value)) {
	        return coerce(value);
	    } else {
	        return fulfill(value);
	    }
	}
	Q.resolve = Q;
	
	/**
	 * Performs a task in a future turn of the event loop.
	 * @param {Function} task
	 */
	Q.nextTick = nextTick;
	
	/**
	 * Controls whether or not long stack traces will be on
	 */
	Q.longStackSupport = false;
	
	// enable long stacks if Q_DEBUG is set
	if (typeof process === "object" && process && process.env && process.env.Q_DEBUG) {
	    Q.longStackSupport = true;
	}
	
	/**
	 * Constructs a {promise, resolve, reject} object.
	 *
	 * `resolve` is a callback to invoke with a more resolved value for the
	 * promise. To fulfill the promise, invoke `resolve` with any value that is
	 * not a thenable. To reject the promise, invoke `resolve` with a rejected
	 * thenable, or invoke `reject` with the reason directly. To resolve the
	 * promise to another thenable, thus putting it in the same state, invoke
	 * `resolve` with that other thenable.
	 */
	Q.defer = defer;
	function defer() {
	    // if "messages" is an "Array", that indicates that the promise has not yet
	    // been resolved.  If it is "undefined", it has been resolved.  Each
	    // element of the messages array is itself an array of complete arguments to
	    // forward to the resolved promise.  We coerce the resolution value to a
	    // promise using the `resolve` function because it handles both fully
	    // non-thenable values and other thenables gracefully.
	    var messages = [], progressListeners = [], resolvedPromise;
	
	    var deferred = object_create(defer.prototype);
	    var promise = object_create(Promise.prototype);
	
	    promise.promiseDispatch = function (resolve, op, operands) {
	        var args = array_slice(arguments);
	        if (messages) {
	            messages.push(args);
	            if (op === "when" && operands[1]) { // progress operand
	                progressListeners.push(operands[1]);
	            }
	        } else {
	            Q.nextTick(function () {
	                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
	            });
	        }
	    };
	
	    // XXX deprecated
	    promise.valueOf = function () {
	        if (messages) {
	            return promise;
	        }
	        var nearerValue = nearer(resolvedPromise);
	        if (isPromise(nearerValue)) {
	            resolvedPromise = nearerValue; // shorten chain
	        }
	        return nearerValue;
	    };
	
	    promise.inspect = function () {
	        if (!resolvedPromise) {
	            return { state: "pending" };
	        }
	        return resolvedPromise.inspect();
	    };
	
	    if (Q.longStackSupport && hasStacks) {
	        try {
	            throw new Error();
	        } catch (e) {
	            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
	            // accessor around; that causes memory leaks as per GH-111. Just
	            // reify the stack trace as a string ASAP.
	            //
	            // At the same time, cut off the first line; it's always just
	            // "[object Promise]\n", as per the `toString`.
	            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
	        }
	    }
	
	    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
	    // consolidating them into `become`, since otherwise we'd create new
	    // promises with the lines `become(whatever(value))`. See e.g. GH-252.
	
	    function become(newPromise) {
	        resolvedPromise = newPromise;
	        promise.source = newPromise;
	
	        array_reduce(messages, function (undefined, message) {
	            Q.nextTick(function () {
	                newPromise.promiseDispatch.apply(newPromise, message);
	            });
	        }, void 0);
	
	        messages = void 0;
	        progressListeners = void 0;
	    }
	
	    deferred.promise = promise;
	    deferred.resolve = function (value) {
	        if (resolvedPromise) {
	            return;
	        }
	
	        become(Q(value));
	    };
	
	    deferred.fulfill = function (value) {
	        if (resolvedPromise) {
	            return;
	        }
	
	        become(fulfill(value));
	    };
	    deferred.reject = function (reason) {
	        if (resolvedPromise) {
	            return;
	        }
	
	        become(reject(reason));
	    };
	    deferred.notify = function (progress) {
	        if (resolvedPromise) {
	            return;
	        }
	
	        array_reduce(progressListeners, function (undefined, progressListener) {
	            Q.nextTick(function () {
	                progressListener(progress);
	            });
	        }, void 0);
	    };
	
	    return deferred;
	}
	
	/**
	 * Creates a Node-style callback that will resolve or reject the deferred
	 * promise.
	 * @returns a nodeback
	 */
	defer.prototype.makeNodeResolver = function () {
	    var self = this;
	    return function (error, value) {
	        if (error) {
	            self.reject(error);
	        } else if (arguments.length > 2) {
	            self.resolve(array_slice(arguments, 1));
	        } else {
	            self.resolve(value);
	        }
	    };
	};
	
	/**
	 * @param resolver {Function} a function that returns nothing and accepts
	 * the resolve, reject, and notify functions for a deferred.
	 * @returns a promise that may be resolved with the given resolve and reject
	 * functions, or rejected by a thrown exception in resolver
	 */
	Q.Promise = promise; // ES6
	Q.promise = promise;
	function promise(resolver) {
	    if (typeof resolver !== "function") {
	        throw new TypeError("resolver must be a function.");
	    }
	    var deferred = defer();
	    try {
	        resolver(deferred.resolve, deferred.reject, deferred.notify);
	    } catch (reason) {
	        deferred.reject(reason);
	    }
	    return deferred.promise;
	}
	
	promise.race = race; // ES6
	promise.all = all; // ES6
	promise.reject = reject; // ES6
	promise.resolve = Q; // ES6
	
	// XXX experimental.  This method is a way to denote that a local value is
	// serializable and should be immediately dispatched to a remote upon request,
	// instead of passing a reference.
	Q.passByCopy = function (object) {
	    //freeze(object);
	    //passByCopies.set(object, true);
	    return object;
	};
	
	Promise.prototype.passByCopy = function () {
	    //freeze(object);
	    //passByCopies.set(object, true);
	    return this;
	};
	
	/**
	 * If two promises eventually fulfill to the same value, promises that value,
	 * but otherwise rejects.
	 * @param x {Any*}
	 * @param y {Any*}
	 * @returns {Any*} a promise for x and y if they are the same, but a rejection
	 * otherwise.
	 *
	 */
	Q.join = function (x, y) {
	    return Q(x).join(y);
	};
	
	Promise.prototype.join = function (that) {
	    return Q([this, that]).spread(function (x, y) {
	        if (x === y) {
	            // TODO: "===" should be Object.is or equiv
	            return x;
	        } else {
	            throw new Error("Can't join: not the same: " + x + " " + y);
	        }
	    });
	};
	
	/**
	 * Returns a promise for the first of an array of promises to become settled.
	 * @param answers {Array[Any*]} promises to race
	 * @returns {Any*} the first promise to be settled
	 */
	Q.race = race;
	function race(answerPs) {
	    return promise(function (resolve, reject) {
	        // Switch to this once we can assume at least ES5
	        // answerPs.forEach(function (answerP) {
	        //     Q(answerP).then(resolve, reject);
	        // });
	        // Use this in the meantime
	        for (var i = 0, len = answerPs.length; i < len; i++) {
	            Q(answerPs[i]).then(resolve, reject);
	        }
	    });
	}
	
	Promise.prototype.race = function () {
	    return this.then(Q.race);
	};
	
	/**
	 * Constructs a Promise with a promise descriptor object and optional fallback
	 * function.  The descriptor contains methods like when(rejected), get(name),
	 * set(name, value), post(name, args), and delete(name), which all
	 * return either a value, a promise for a value, or a rejection.  The fallback
	 * accepts the operation name, a resolver, and any further arguments that would
	 * have been forwarded to the appropriate method above had a method been
	 * provided with the proper name.  The API makes no guarantees about the nature
	 * of the returned object, apart from that it is usable whereever promises are
	 * bought and sold.
	 */
	Q.makePromise = Promise;
	function Promise(descriptor, fallback, inspect) {
	    if (fallback === void 0) {
	        fallback = function (op) {
	            return reject(new Error(
	                "Promise does not support operation: " + op
	            ));
	        };
	    }
	    if (inspect === void 0) {
	        inspect = function () {
	            return {state: "unknown"};
	        };
	    }
	
	    var promise = object_create(Promise.prototype);
	
	    promise.promiseDispatch = function (resolve, op, args) {
	        var result;
	        try {
	            if (descriptor[op]) {
	                result = descriptor[op].apply(promise, args);
	            } else {
	                result = fallback.call(promise, op, args);
	            }
	        } catch (exception) {
	            result = reject(exception);
	        }
	        if (resolve) {
	            resolve(result);
	        }
	    };
	
	    promise.inspect = inspect;
	
	    // XXX deprecated `valueOf` and `exception` support
	    if (inspect) {
	        var inspected = inspect();
	        if (inspected.state === "rejected") {
	            promise.exception = inspected.reason;
	        }
	
	        promise.valueOf = function () {
	            var inspected = inspect();
	            if (inspected.state === "pending" ||
	                inspected.state === "rejected") {
	                return promise;
	            }
	            return inspected.value;
	        };
	    }
	
	    return promise;
	}
	
	Promise.prototype.toString = function () {
	    return "[object Promise]";
	};
	
	Promise.prototype.then = function (fulfilled, rejected, progressed) {
	    var self = this;
	    var deferred = defer();
	    var done = false;   // ensure the untrusted promise makes at most a
	                        // single call to one of the callbacks
	
	    function _fulfilled(value) {
	        try {
	            return typeof fulfilled === "function" ? fulfilled(value) : value;
	        } catch (exception) {
	            return reject(exception);
	        }
	    }
	
	    function _rejected(exception) {
	        if (typeof rejected === "function") {
	            makeStackTraceLong(exception, self);
	            try {
	                return rejected(exception);
	            } catch (newException) {
	                return reject(newException);
	            }
	        }
	        return reject(exception);
	    }
	
	    function _progressed(value) {
	        return typeof progressed === "function" ? progressed(value) : value;
	    }
	
	    Q.nextTick(function () {
	        self.promiseDispatch(function (value) {
	            if (done) {
	                return;
	            }
	            done = true;
	
	            deferred.resolve(_fulfilled(value));
	        }, "when", [function (exception) {
	            if (done) {
	                return;
	            }
	            done = true;
	
	            deferred.resolve(_rejected(exception));
	        }]);
	    });
	
	    // Progress propagator need to be attached in the current tick.
	    self.promiseDispatch(void 0, "when", [void 0, function (value) {
	        var newValue;
	        var threw = false;
	        try {
	            newValue = _progressed(value);
	        } catch (e) {
	            threw = true;
	            if (Q.onerror) {
	                Q.onerror(e);
	            } else {
	                throw e;
	            }
	        }
	
	        if (!threw) {
	            deferred.notify(newValue);
	        }
	    }]);
	
	    return deferred.promise;
	};
	
	Q.tap = function (promise, callback) {
	    return Q(promise).tap(callback);
	};
	
	/**
	 * Works almost like "finally", but not called for rejections.
	 * Original resolution value is passed through callback unaffected.
	 * Callback may return a promise that will be awaited for.
	 * @param {Function} callback
	 * @returns {Q.Promise}
	 * @example
	 * doSomething()
	 *   .then(...)
	 *   .tap(console.log)
	 *   .then(...);
	 */
	Promise.prototype.tap = function (callback) {
	    callback = Q(callback);
	
	    return this.then(function (value) {
	        return callback.fcall(value).thenResolve(value);
	    });
	};
	
	/**
	 * Registers an observer on a promise.
	 *
	 * Guarantees:
	 *
	 * 1. that fulfilled and rejected will be called only once.
	 * 2. that either the fulfilled callback or the rejected callback will be
	 *    called, but not both.
	 * 3. that fulfilled and rejected will not be called in this turn.
	 *
	 * @param value      promise or immediate reference to observe
	 * @param fulfilled  function to be called with the fulfilled value
	 * @param rejected   function to be called with the rejection exception
	 * @param progressed function to be called on any progress notifications
	 * @return promise for the return value from the invoked callback
	 */
	Q.when = when;
	function when(value, fulfilled, rejected, progressed) {
	    return Q(value).then(fulfilled, rejected, progressed);
	}
	
	Promise.prototype.thenResolve = function (value) {
	    return this.then(function () { return value; });
	};
	
	Q.thenResolve = function (promise, value) {
	    return Q(promise).thenResolve(value);
	};
	
	Promise.prototype.thenReject = function (reason) {
	    return this.then(function () { throw reason; });
	};
	
	Q.thenReject = function (promise, reason) {
	    return Q(promise).thenReject(reason);
	};
	
	/**
	 * If an object is not a promise, it is as "near" as possible.
	 * If a promise is rejected, it is as "near" as possible too.
	 * If it’s a fulfilled promise, the fulfillment value is nearer.
	 * If it’s a deferred promise and the deferred has been resolved, the
	 * resolution is "nearer".
	 * @param object
	 * @returns most resolved (nearest) form of the object
	 */
	
	// XXX should we re-do this?
	Q.nearer = nearer;
	function nearer(value) {
	    if (isPromise(value)) {
	        var inspected = value.inspect();
	        if (inspected.state === "fulfilled") {
	            return inspected.value;
	        }
	    }
	    return value;
	}
	
	/**
	 * @returns whether the given object is a promise.
	 * Otherwise it is a fulfilled value.
	 */
	Q.isPromise = isPromise;
	function isPromise(object) {
	    return object instanceof Promise;
	}
	
	Q.isPromiseAlike = isPromiseAlike;
	function isPromiseAlike(object) {
	    return isObject(object) && typeof object.then === "function";
	}
	
	/**
	 * @returns whether the given object is a pending promise, meaning not
	 * fulfilled or rejected.
	 */
	Q.isPending = isPending;
	function isPending(object) {
	    return isPromise(object) && object.inspect().state === "pending";
	}
	
	Promise.prototype.isPending = function () {
	    return this.inspect().state === "pending";
	};
	
	/**
	 * @returns whether the given object is a value or fulfilled
	 * promise.
	 */
	Q.isFulfilled = isFulfilled;
	function isFulfilled(object) {
	    return !isPromise(object) || object.inspect().state === "fulfilled";
	}
	
	Promise.prototype.isFulfilled = function () {
	    return this.inspect().state === "fulfilled";
	};
	
	/**
	 * @returns whether the given object is a rejected promise.
	 */
	Q.isRejected = isRejected;
	function isRejected(object) {
	    return isPromise(object) && object.inspect().state === "rejected";
	}
	
	Promise.prototype.isRejected = function () {
	    return this.inspect().state === "rejected";
	};
	
	//// BEGIN UNHANDLED REJECTION TRACKING
	
	// This promise library consumes exceptions thrown in handlers so they can be
	// handled by a subsequent promise.  The exceptions get added to this array when
	// they are created, and removed when they are handled.  Note that in ES6 or
	// shimmed environments, this would naturally be a `Set`.
	var unhandledReasons = [];
	var unhandledRejections = [];
	var reportedUnhandledRejections = [];
	var trackUnhandledRejections = true;
	
	function resetUnhandledRejections() {
	    unhandledReasons.length = 0;
	    unhandledRejections.length = 0;
	
	    if (!trackUnhandledRejections) {
	        trackUnhandledRejections = true;
	    }
	}
	
	function trackRejection(promise, reason) {
	    if (!trackUnhandledRejections) {
	        return;
	    }
	    if (typeof process === "object" && typeof process.emit === "function") {
	        Q.nextTick.runAfter(function () {
	            if (array_indexOf(unhandledRejections, promise) !== -1) {
	                process.emit("unhandledRejection", reason, promise);
	                reportedUnhandledRejections.push(promise);
	            }
	        });
	    }
	
	    unhandledRejections.push(promise);
	    if (reason && typeof reason.stack !== "undefined") {
	        unhandledReasons.push(reason.stack);
	    } else {
	        unhandledReasons.push("(no stack) " + reason);
	    }
	}
	
	function untrackRejection(promise) {
	    if (!trackUnhandledRejections) {
	        return;
	    }
	
	    var at = array_indexOf(unhandledRejections, promise);
	    if (at !== -1) {
	        if (typeof process === "object" && typeof process.emit === "function") {
	            Q.nextTick.runAfter(function () {
	                var atReport = array_indexOf(reportedUnhandledRejections, promise);
	                if (atReport !== -1) {
	                    process.emit("rejectionHandled", unhandledReasons[at], promise);
	                    reportedUnhandledRejections.splice(atReport, 1);
	                }
	            });
	        }
	        unhandledRejections.splice(at, 1);
	        unhandledReasons.splice(at, 1);
	    }
	}
	
	Q.resetUnhandledRejections = resetUnhandledRejections;
	
	Q.getUnhandledReasons = function () {
	    // Make a copy so that consumers can't interfere with our internal state.
	    return unhandledReasons.slice();
	};
	
	Q.stopUnhandledRejectionTracking = function () {
	    resetUnhandledRejections();
	    trackUnhandledRejections = false;
	};
	
	resetUnhandledRejections();
	
	//// END UNHANDLED REJECTION TRACKING
	
	/**
	 * Constructs a rejected promise.
	 * @param reason value describing the failure
	 */
	Q.reject = reject;
	function reject(reason) {
	    var rejection = Promise({
	        "when": function (rejected) {
	            // note that the error has been handled
	            if (rejected) {
	                untrackRejection(this);
	            }
	            return rejected ? rejected(reason) : this;
	        }
	    }, function fallback() {
	        return this;
	    }, function inspect() {
	        return { state: "rejected", reason: reason };
	    });
	
	    // Note that the reason has not been handled.
	    trackRejection(rejection, reason);
	
	    return rejection;
	}
	
	/**
	 * Constructs a fulfilled promise for an immediate reference.
	 * @param value immediate reference
	 */
	Q.fulfill = fulfill;
	function fulfill(value) {
	    return Promise({
	        "when": function () {
	            return value;
	        },
	        "get": function (name) {
	            return value[name];
	        },
	        "set": function (name, rhs) {
	            value[name] = rhs;
	        },
	        "delete": function (name) {
	            delete value[name];
	        },
	        "post": function (name, args) {
	            // Mark Miller proposes that post with no name should apply a
	            // promised function.
	            if (name === null || name === void 0) {
	                return value.apply(void 0, args);
	            } else {
	                return value[name].apply(value, args);
	            }
	        },
	        "apply": function (thisp, args) {
	            return value.apply(thisp, args);
	        },
	        "keys": function () {
	            return object_keys(value);
	        }
	    }, void 0, function inspect() {
	        return { state: "fulfilled", value: value };
	    });
	}
	
	/**
	 * Converts thenables to Q promises.
	 * @param promise thenable promise
	 * @returns a Q promise
	 */
	function coerce(promise) {
	    var deferred = defer();
	    Q.nextTick(function () {
	        try {
	            promise.then(deferred.resolve, deferred.reject, deferred.notify);
	        } catch (exception) {
	            deferred.reject(exception);
	        }
	    });
	    return deferred.promise;
	}
	
	/**
	 * Annotates an object such that it will never be
	 * transferred away from this process over any promise
	 * communication channel.
	 * @param object
	 * @returns promise a wrapping of that object that
	 * additionally responds to the "isDef" message
	 * without a rejection.
	 */
	Q.master = master;
	function master(object) {
	    return Promise({
	        "isDef": function () {}
	    }, function fallback(op, args) {
	        return dispatch(object, op, args);
	    }, function () {
	        return Q(object).inspect();
	    });
	}
	
	/**
	 * Spreads the values of a promised array of arguments into the
	 * fulfillment callback.
	 * @param fulfilled callback that receives variadic arguments from the
	 * promised array
	 * @param rejected callback that receives the exception if the promise
	 * is rejected.
	 * @returns a promise for the return value or thrown exception of
	 * either callback.
	 */
	Q.spread = spread;
	function spread(value, fulfilled, rejected) {
	    return Q(value).spread(fulfilled, rejected);
	}
	
	Promise.prototype.spread = function (fulfilled, rejected) {
	    return this.all().then(function (array) {
	        return fulfilled.apply(void 0, array);
	    }, rejected);
	};
	
	/**
	 * The async function is a decorator for generator functions, turning
	 * them into asynchronous generators.  Although generators are only part
	 * of the newest ECMAScript 6 drafts, this code does not cause syntax
	 * errors in older engines.  This code should continue to work and will
	 * in fact improve over time as the language improves.
	 *
	 * ES6 generators are currently part of V8 version 3.19 with the
	 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
	 * for longer, but under an older Python-inspired form.  This function
	 * works on both kinds of generators.
	 *
	 * Decorates a generator function such that:
	 *  - it may yield promises
	 *  - execution will continue when that promise is fulfilled
	 *  - the value of the yield expression will be the fulfilled value
	 *  - it returns a promise for the return value (when the generator
	 *    stops iterating)
	 *  - the decorated function returns a promise for the return value
	 *    of the generator or the first rejected promise among those
	 *    yielded.
	 *  - if an error is thrown in the generator, it propagates through
	 *    every following yield until it is caught, or until it escapes
	 *    the generator function altogether, and is translated into a
	 *    rejection for the promise returned by the decorated generator.
	 */
	Q.async = async;
	function async(makeGenerator) {
	    return function () {
	        // when verb is "send", arg is a value
	        // when verb is "throw", arg is an exception
	        function continuer(verb, arg) {
	            var result;
	
	            // Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
	            // engine that has a deployed base of browsers that support generators.
	            // However, SM's generators use the Python-inspired semantics of
	            // outdated ES6 drafts.  We would like to support ES6, but we'd also
	            // like to make it possible to use generators in deployed browsers, so
	            // we also support Python-style generators.  At some point we can remove
	            // this block.
	
	            if (typeof StopIteration === "undefined") {
	                // ES6 Generators
	                try {
	                    result = generator[verb](arg);
	                } catch (exception) {
	                    return reject(exception);
	                }
	                if (result.done) {
	                    return Q(result.value);
	                } else {
	                    return when(result.value, callback, errback);
	                }
	            } else {
	                // SpiderMonkey Generators
	                // FIXME: Remove this case when SM does ES6 generators.
	                try {
	                    result = generator[verb](arg);
	                } catch (exception) {
	                    if (isStopIteration(exception)) {
	                        return Q(exception.value);
	                    } else {
	                        return reject(exception);
	                    }
	                }
	                return when(result, callback, errback);
	            }
	        }
	        var generator = makeGenerator.apply(this, arguments);
	        var callback = continuer.bind(continuer, "next");
	        var errback = continuer.bind(continuer, "throw");
	        return callback();
	    };
	}
	
	/**
	 * The spawn function is a small wrapper around async that immediately
	 * calls the generator and also ends the promise chain, so that any
	 * unhandled errors are thrown instead of forwarded to the error
	 * handler. This is useful because it's extremely common to run
	 * generators at the top-level to work with libraries.
	 */
	Q.spawn = spawn;
	function spawn(makeGenerator) {
	    Q.done(Q.async(makeGenerator)());
	}
	
	// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
	/**
	 * Throws a ReturnValue exception to stop an asynchronous generator.
	 *
	 * This interface is a stop-gap measure to support generator return
	 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
	 * generators like Chromium 29, just use "return" in your generator
	 * functions.
	 *
	 * @param value the return value for the surrounding generator
	 * @throws ReturnValue exception with the value.
	 * @example
	 * // ES6 style
	 * Q.async(function* () {
	 *      var foo = yield getFooPromise();
	 *      var bar = yield getBarPromise();
	 *      return foo + bar;
	 * })
	 * // Older SpiderMonkey style
	 * Q.async(function () {
	 *      var foo = yield getFooPromise();
	 *      var bar = yield getBarPromise();
	 *      Q.return(foo + bar);
	 * })
	 */
	Q["return"] = _return;
	function _return(value) {
	    throw new QReturnValue(value);
	}
	
	/**
	 * The promised function decorator ensures that any promise arguments
	 * are settled and passed as values (`this` is also settled and passed
	 * as a value).  It will also ensure that the result of a function is
	 * always a promise.
	 *
	 * @example
	 * var add = Q.promised(function (a, b) {
	 *     return a + b;
	 * });
	 * add(Q(a), Q(B));
	 *
	 * @param {function} callback The function to decorate
	 * @returns {function} a function that has been decorated.
	 */
	Q.promised = promised;
	function promised(callback) {
	    return function () {
	        return spread([this, all(arguments)], function (self, args) {
	            return callback.apply(self, args);
	        });
	    };
	}
	
	/**
	 * sends a message to a value in a future turn
	 * @param object* the recipient
	 * @param op the name of the message operation, e.g., "when",
	 * @param args further arguments to be forwarded to the operation
	 * @returns result {Promise} a promise for the result of the operation
	 */
	Q.dispatch = dispatch;
	function dispatch(object, op, args) {
	    return Q(object).dispatch(op, args);
	}
	
	Promise.prototype.dispatch = function (op, args) {
	    var self = this;
	    var deferred = defer();
	    Q.nextTick(function () {
	        self.promiseDispatch(deferred.resolve, op, args);
	    });
	    return deferred.promise;
	};
	
	/**
	 * Gets the value of a property in a future turn.
	 * @param object    promise or immediate reference for target object
	 * @param name      name of property to get
	 * @return promise for the property value
	 */
	Q.get = function (object, key) {
	    return Q(object).dispatch("get", [key]);
	};
	
	Promise.prototype.get = function (key) {
	    return this.dispatch("get", [key]);
	};
	
	/**
	 * Sets the value of a property in a future turn.
	 * @param object    promise or immediate reference for object object
	 * @param name      name of property to set
	 * @param value     new value of property
	 * @return promise for the return value
	 */
	Q.set = function (object, key, value) {
	    return Q(object).dispatch("set", [key, value]);
	};
	
	Promise.prototype.set = function (key, value) {
	    return this.dispatch("set", [key, value]);
	};
	
	/**
	 * Deletes a property in a future turn.
	 * @param object    promise or immediate reference for target object
	 * @param name      name of property to delete
	 * @return promise for the return value
	 */
	Q.del = // XXX legacy
	Q["delete"] = function (object, key) {
	    return Q(object).dispatch("delete", [key]);
	};
	
	Promise.prototype.del = // XXX legacy
	Promise.prototype["delete"] = function (key) {
	    return this.dispatch("delete", [key]);
	};
	
	/**
	 * Invokes a method in a future turn.
	 * @param object    promise or immediate reference for target object
	 * @param name      name of method to invoke
	 * @param value     a value to post, typically an array of
	 *                  invocation arguments for promises that
	 *                  are ultimately backed with `resolve` values,
	 *                  as opposed to those backed with URLs
	 *                  wherein the posted value can be any
	 *                  JSON serializable object.
	 * @return promise for the return value
	 */
	// bound locally because it is used by other methods
	Q.mapply = // XXX As proposed by "Redsandro"
	Q.post = function (object, name, args) {
	    return Q(object).dispatch("post", [name, args]);
	};
	
	Promise.prototype.mapply = // XXX As proposed by "Redsandro"
	Promise.prototype.post = function (name, args) {
	    return this.dispatch("post", [name, args]);
	};
	
	/**
	 * Invokes a method in a future turn.
	 * @param object    promise or immediate reference for target object
	 * @param name      name of method to invoke
	 * @param ...args   array of invocation arguments
	 * @return promise for the return value
	 */
	Q.send = // XXX Mark Miller's proposed parlance
	Q.mcall = // XXX As proposed by "Redsandro"
	Q.invoke = function (object, name /*...args*/) {
	    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
	};
	
	Promise.prototype.send = // XXX Mark Miller's proposed parlance
	Promise.prototype.mcall = // XXX As proposed by "Redsandro"
	Promise.prototype.invoke = function (name /*...args*/) {
	    return this.dispatch("post", [name, array_slice(arguments, 1)]);
	};
	
	/**
	 * Applies the promised function in a future turn.
	 * @param object    promise or immediate reference for target function
	 * @param args      array of application arguments
	 */
	Q.fapply = function (object, args) {
	    return Q(object).dispatch("apply", [void 0, args]);
	};
	
	Promise.prototype.fapply = function (args) {
	    return this.dispatch("apply", [void 0, args]);
	};
	
	/**
	 * Calls the promised function in a future turn.
	 * @param object    promise or immediate reference for target function
	 * @param ...args   array of application arguments
	 */
	Q["try"] =
	Q.fcall = function (object /* ...args*/) {
	    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
	};
	
	Promise.prototype.fcall = function (/*...args*/) {
	    return this.dispatch("apply", [void 0, array_slice(arguments)]);
	};
	
	/**
	 * Binds the promised function, transforming return values into a fulfilled
	 * promise and thrown errors into a rejected one.
	 * @param object    promise or immediate reference for target function
	 * @param ...args   array of application arguments
	 */
	Q.fbind = function (object /*...args*/) {
	    var promise = Q(object);
	    var args = array_slice(arguments, 1);
	    return function fbound() {
	        return promise.dispatch("apply", [
	            this,
	            args.concat(array_slice(arguments))
	        ]);
	    };
	};
	Promise.prototype.fbind = function (/*...args*/) {
	    var promise = this;
	    var args = array_slice(arguments);
	    return function fbound() {
	        return promise.dispatch("apply", [
	            this,
	            args.concat(array_slice(arguments))
	        ]);
	    };
	};
	
	/**
	 * Requests the names of the owned properties of a promised
	 * object in a future turn.
	 * @param object    promise or immediate reference for target object
	 * @return promise for the keys of the eventually settled object
	 */
	Q.keys = function (object) {
	    return Q(object).dispatch("keys", []);
	};
	
	Promise.prototype.keys = function () {
	    return this.dispatch("keys", []);
	};
	
	/**
	 * Turns an array of promises into a promise for an array.  If any of
	 * the promises gets rejected, the whole array is rejected immediately.
	 * @param {Array*} an array (or promise for an array) of values (or
	 * promises for values)
	 * @returns a promise for an array of the corresponding values
	 */
	// By Mark Miller
	// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
	Q.all = all;
	function all(promises) {
	    return when(promises, function (promises) {
	        var pendingCount = 0;
	        var deferred = defer();
	        array_reduce(promises, function (undefined, promise, index) {
	            var snapshot;
	            if (
	                isPromise(promise) &&
	                (snapshot = promise.inspect()).state === "fulfilled"
	            ) {
	                promises[index] = snapshot.value;
	            } else {
	                ++pendingCount;
	                when(
	                    promise,
	                    function (value) {
	                        promises[index] = value;
	                        if (--pendingCount === 0) {
	                            deferred.resolve(promises);
	                        }
	                    },
	                    deferred.reject,
	                    function (progress) {
	                        deferred.notify({ index: index, value: progress });
	                    }
	                );
	            }
	        }, void 0);
	        if (pendingCount === 0) {
	            deferred.resolve(promises);
	        }
	        return deferred.promise;
	    });
	}
	
	Promise.prototype.all = function () {
	    return all(this);
	};
	
	/**
	 * Returns the first resolved promise of an array. Prior rejected promises are
	 * ignored.  Rejects only if all promises are rejected.
	 * @param {Array*} an array containing values or promises for values
	 * @returns a promise fulfilled with the value of the first resolved promise,
	 * or a rejected promise if all promises are rejected.
	 */
	Q.any = any;
	
	function any(promises) {
	    if (promises.length === 0) {
	        return Q.resolve();
	    }
	
	    var deferred = Q.defer();
	    var pendingCount = 0;
	    array_reduce(promises, function (prev, current, index) {
	        var promise = promises[index];
	
	        pendingCount++;
	
	        when(promise, onFulfilled, onRejected, onProgress);
	        function onFulfilled(result) {
	            deferred.resolve(result);
	        }
	        function onRejected() {
	            pendingCount--;
	            if (pendingCount === 0) {
	                deferred.reject(new Error(
	                    "Can't get fulfillment value from any promise, all " +
	                    "promises were rejected."
	                ));
	            }
	        }
	        function onProgress(progress) {
	            deferred.notify({
	                index: index,
	                value: progress
	            });
	        }
	    }, undefined);
	
	    return deferred.promise;
	}
	
	Promise.prototype.any = function () {
	    return any(this);
	};
	
	/**
	 * Waits for all promises to be settled, either fulfilled or
	 * rejected.  This is distinct from `all` since that would stop
	 * waiting at the first rejection.  The promise returned by
	 * `allResolved` will never be rejected.
	 * @param promises a promise for an array (or an array) of promises
	 * (or values)
	 * @return a promise for an array of promises
	 */
	Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
	function allResolved(promises) {
	    return when(promises, function (promises) {
	        promises = array_map(promises, Q);
	        return when(all(array_map(promises, function (promise) {
	            return when(promise, noop, noop);
	        })), function () {
	            return promises;
	        });
	    });
	}
	
	Promise.prototype.allResolved = function () {
	    return allResolved(this);
	};
	
	/**
	 * @see Promise#allSettled
	 */
	Q.allSettled = allSettled;
	function allSettled(promises) {
	    return Q(promises).allSettled();
	}
	
	/**
	 * Turns an array of promises into a promise for an array of their states (as
	 * returned by `inspect`) when they have all settled.
	 * @param {Array[Any*]} values an array (or promise for an array) of values (or
	 * promises for values)
	 * @returns {Array[State]} an array of states for the respective values.
	 */
	Promise.prototype.allSettled = function () {
	    return this.then(function (promises) {
	        return all(array_map(promises, function (promise) {
	            promise = Q(promise);
	            function regardless() {
	                return promise.inspect();
	            }
	            return promise.then(regardless, regardless);
	        }));
	    });
	};
	
	/**
	 * Captures the failure of a promise, giving an oportunity to recover
	 * with a callback.  If the given promise is fulfilled, the returned
	 * promise is fulfilled.
	 * @param {Any*} promise for something
	 * @param {Function} callback to fulfill the returned promise if the
	 * given promise is rejected
	 * @returns a promise for the return value of the callback
	 */
	Q.fail = // XXX legacy
	Q["catch"] = function (object, rejected) {
	    return Q(object).then(void 0, rejected);
	};
	
	Promise.prototype.fail = // XXX legacy
	Promise.prototype["catch"] = function (rejected) {
	    return this.then(void 0, rejected);
	};
	
	/**
	 * Attaches a listener that can respond to progress notifications from a
	 * promise's originating deferred. This listener receives the exact arguments
	 * passed to ``deferred.notify``.
	 * @param {Any*} promise for something
	 * @param {Function} callback to receive any progress notifications
	 * @returns the given promise, unchanged
	 */
	Q.progress = progress;
	function progress(object, progressed) {
	    return Q(object).then(void 0, void 0, progressed);
	}
	
	Promise.prototype.progress = function (progressed) {
	    return this.then(void 0, void 0, progressed);
	};
	
	/**
	 * Provides an opportunity to observe the settling of a promise,
	 * regardless of whether the promise is fulfilled or rejected.  Forwards
	 * the resolution to the returned promise when the callback is done.
	 * The callback can return a promise to defer completion.
	 * @param {Any*} promise
	 * @param {Function} callback to observe the resolution of the given
	 * promise, takes no arguments.
	 * @returns a promise for the resolution of the given promise when
	 * ``fin`` is done.
	 */
	Q.fin = // XXX legacy
	Q["finally"] = function (object, callback) {
	    return Q(object)["finally"](callback);
	};
	
	Promise.prototype.fin = // XXX legacy
	Promise.prototype["finally"] = function (callback) {
	    callback = Q(callback);
	    return this.then(function (value) {
	        return callback.fcall().then(function () {
	            return value;
	        });
	    }, function (reason) {
	        // TODO attempt to recycle the rejection with "this".
	        return callback.fcall().then(function () {
	            throw reason;
	        });
	    });
	};
	
	/**
	 * Terminates a chain of promises, forcing rejections to be
	 * thrown as exceptions.
	 * @param {Any*} promise at the end of a chain of promises
	 * @returns nothing
	 */
	Q.done = function (object, fulfilled, rejected, progress) {
	    return Q(object).done(fulfilled, rejected, progress);
	};
	
	Promise.prototype.done = function (fulfilled, rejected, progress) {
	    var onUnhandledError = function (error) {
	        // forward to a future turn so that ``when``
	        // does not catch it and turn it into a rejection.
	        Q.nextTick(function () {
	            makeStackTraceLong(error, promise);
	            if (Q.onerror) {
	                Q.onerror(error);
	            } else {
	                throw error;
	            }
	        });
	    };
	
	    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
	    var promise = fulfilled || rejected || progress ?
	        this.then(fulfilled, rejected, progress) :
	        this;
	
	    if (typeof process === "object" && process && process.domain) {
	        onUnhandledError = process.domain.bind(onUnhandledError);
	    }
	
	    promise.then(void 0, onUnhandledError);
	};
	
	/**
	 * Causes a promise to be rejected if it does not get fulfilled before
	 * some milliseconds time out.
	 * @param {Any*} promise
	 * @param {Number} milliseconds timeout
	 * @param {Any*} custom error message or Error object (optional)
	 * @returns a promise for the resolution of the given promise if it is
	 * fulfilled before the timeout, otherwise rejected.
	 */
	Q.timeout = function (object, ms, error) {
	    return Q(object).timeout(ms, error);
	};
	
	Promise.prototype.timeout = function (ms, error) {
	    var deferred = defer();
	    var timeoutId = setTimeout(function () {
	        if (!error || "string" === typeof error) {
	            error = new Error(error || "Timed out after " + ms + " ms");
	            error.code = "ETIMEDOUT";
	        }
	        deferred.reject(error);
	    }, ms);
	
	    this.then(function (value) {
	        clearTimeout(timeoutId);
	        deferred.resolve(value);
	    }, function (exception) {
	        clearTimeout(timeoutId);
	        deferred.reject(exception);
	    }, deferred.notify);
	
	    return deferred.promise;
	};
	
	/**
	 * Returns a promise for the given value (or promised value), some
	 * milliseconds after it resolved. Passes rejections immediately.
	 * @param {Any*} promise
	 * @param {Number} milliseconds
	 * @returns a promise for the resolution of the given promise after milliseconds
	 * time has elapsed since the resolution of the given promise.
	 * If the given promise rejects, that is passed immediately.
	 */
	Q.delay = function (object, timeout) {
	    if (timeout === void 0) {
	        timeout = object;
	        object = void 0;
	    }
	    return Q(object).delay(timeout);
	};
	
	Promise.prototype.delay = function (timeout) {
	    return this.then(function (value) {
	        var deferred = defer();
	        setTimeout(function () {
	            deferred.resolve(value);
	        }, timeout);
	        return deferred.promise;
	    });
	};
	
	/**
	 * Passes a continuation to a Node function, which is called with the given
	 * arguments provided as an array, and returns a promise.
	 *
	 *      Q.nfapply(FS.readFile, [__filename])
	 *      .then(function (content) {
	 *      })
	 *
	 */
	Q.nfapply = function (callback, args) {
	    return Q(callback).nfapply(args);
	};
	
	Promise.prototype.nfapply = function (args) {
	    var deferred = defer();
	    var nodeArgs = array_slice(args);
	    nodeArgs.push(deferred.makeNodeResolver());
	    this.fapply(nodeArgs).fail(deferred.reject);
	    return deferred.promise;
	};
	
	/**
	 * Passes a continuation to a Node function, which is called with the given
	 * arguments provided individually, and returns a promise.
	 * @example
	 * Q.nfcall(FS.readFile, __filename)
	 * .then(function (content) {
	 * })
	 *
	 */
	Q.nfcall = function (callback /*...args*/) {
	    var args = array_slice(arguments, 1);
	    return Q(callback).nfapply(args);
	};
	
	Promise.prototype.nfcall = function (/*...args*/) {
	    var nodeArgs = array_slice(arguments);
	    var deferred = defer();
	    nodeArgs.push(deferred.makeNodeResolver());
	    this.fapply(nodeArgs).fail(deferred.reject);
	    return deferred.promise;
	};
	
	/**
	 * Wraps a NodeJS continuation passing function and returns an equivalent
	 * version that returns a promise.
	 * @example
	 * Q.nfbind(FS.readFile, __filename)("utf-8")
	 * .then(console.log)
	 * .done()
	 */
	Q.nfbind =
	Q.denodeify = function (callback /*...args*/) {
	    var baseArgs = array_slice(arguments, 1);
	    return function () {
	        var nodeArgs = baseArgs.concat(array_slice(arguments));
	        var deferred = defer();
	        nodeArgs.push(deferred.makeNodeResolver());
	        Q(callback).fapply(nodeArgs).fail(deferred.reject);
	        return deferred.promise;
	    };
	};
	
	Promise.prototype.nfbind =
	Promise.prototype.denodeify = function (/*...args*/) {
	    var args = array_slice(arguments);
	    args.unshift(this);
	    return Q.denodeify.apply(void 0, args);
	};
	
	Q.nbind = function (callback, thisp /*...args*/) {
	    var baseArgs = array_slice(arguments, 2);
	    return function () {
	        var nodeArgs = baseArgs.concat(array_slice(arguments));
	        var deferred = defer();
	        nodeArgs.push(deferred.makeNodeResolver());
	        function bound() {
	            return callback.apply(thisp, arguments);
	        }
	        Q(bound).fapply(nodeArgs).fail(deferred.reject);
	        return deferred.promise;
	    };
	};
	
	Promise.prototype.nbind = function (/*thisp, ...args*/) {
	    var args = array_slice(arguments, 0);
	    args.unshift(this);
	    return Q.nbind.apply(void 0, args);
	};
	
	/**
	 * Calls a method of a Node-style object that accepts a Node-style
	 * callback with a given array of arguments, plus a provided callback.
	 * @param object an object that has the named method
	 * @param {String} name name of the method of object
	 * @param {Array} args arguments to pass to the method; the callback
	 * will be provided by Q and appended to these arguments.
	 * @returns a promise for the value or error
	 */
	Q.nmapply = // XXX As proposed by "Redsandro"
	Q.npost = function (object, name, args) {
	    return Q(object).npost(name, args);
	};
	
	Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
	Promise.prototype.npost = function (name, args) {
	    var nodeArgs = array_slice(args || []);
	    var deferred = defer();
	    nodeArgs.push(deferred.makeNodeResolver());
	    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
	    return deferred.promise;
	};
	
	/**
	 * Calls a method of a Node-style object that accepts a Node-style
	 * callback, forwarding the given variadic arguments, plus a provided
	 * callback argument.
	 * @param object an object that has the named method
	 * @param {String} name name of the method of object
	 * @param ...args arguments to pass to the method; the callback will
	 * be provided by Q and appended to these arguments.
	 * @returns a promise for the value or error
	 */
	Q.nsend = // XXX Based on Mark Miller's proposed "send"
	Q.nmcall = // XXX Based on "Redsandro's" proposal
	Q.ninvoke = function (object, name /*...args*/) {
	    var nodeArgs = array_slice(arguments, 2);
	    var deferred = defer();
	    nodeArgs.push(deferred.makeNodeResolver());
	    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
	    return deferred.promise;
	};
	
	Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
	Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
	Promise.prototype.ninvoke = function (name /*...args*/) {
	    var nodeArgs = array_slice(arguments, 1);
	    var deferred = defer();
	    nodeArgs.push(deferred.makeNodeResolver());
	    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
	    return deferred.promise;
	};
	
	/**
	 * If a function would like to support both Node continuation-passing-style and
	 * promise-returning-style, it can end its internal promise chain with
	 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
	 * elects to use a nodeback, the result will be sent there.  If they do not
	 * pass a nodeback, they will receive the result promise.
	 * @param object a result (or a promise for a result)
	 * @param {Function} nodeback a Node.js-style callback
	 * @returns either the promise or nothing
	 */
	Q.nodeify = nodeify;
	function nodeify(object, nodeback) {
	    return Q(object).nodeify(nodeback);
	}
	
	Promise.prototype.nodeify = function (nodeback) {
	    if (nodeback) {
	        this.then(function (value) {
	            Q.nextTick(function () {
	                nodeback(null, value);
	            });
	        }, function (error) {
	            Q.nextTick(function () {
	                nodeback(error);
	            });
	        });
	    } else {
	        return this;
	    }
	};
	
	Q.noConflict = function() {
	    throw new Error("Q.noConflict only works when Q is used as a global");
	};
	
	// All code before this point will be filtered from stack traces.
	var qEndingLine = captureLine();
	
	return Q;
	
	});
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(/*! (webpack)/~/node-libs-browser/~/process/browser.js */ 16)))

/***/ },
/* 11 */
/*!************************************************************!*\
  !*** /Users/tim/code/webrtc-kademlia/~/peerjs/lib/peer.js ***!
  \************************************************************/
/***/ function(module, exports, __webpack_require__) {

	var util = __webpack_require__(/*! ./util */ 12);
	var EventEmitter = __webpack_require__(/*! eventemitter3 */ 17);
	var Socket = __webpack_require__(/*! ./socket */ 13);
	var MediaConnection = __webpack_require__(/*! ./mediaconnection */ 14);
	var DataConnection = __webpack_require__(/*! ./dataconnection */ 15);
	
	/**
	 * A peer who can initiate connections with other peers.
	 */
	function Peer(id, options) {
	  if (!(this instanceof Peer)) return new Peer(id, options);
	  EventEmitter.call(this);
	
	  // Deal with overloading
	  if (id && id.constructor == Object) {
	    options = id;
	    id = undefined;
	  } else if (id) {
	    // Ensure id is a string
	    id = id.toString();
	  }
	  //
	
	  // Configurize options
	  options = util.extend({
	    debug: 0, // 1: Errors, 2: Warnings, 3: All logs
	    host: util.CLOUD_HOST,
	    port: util.CLOUD_PORT,
	    key: 'peerjs',
	    path: '/',
	    token: util.randomToken(),
	    config: util.defaultConfig
	  }, options);
	  this.options = options;
	  // Detect relative URL host.
	  if (options.host === '/') {
	    options.host = window.location.hostname;
	  }
	  // Set path correctly.
	  if (options.path[0] !== '/') {
	    options.path = '/' + options.path;
	  }
	  if (options.path[options.path.length - 1] !== '/') {
	    options.path += '/';
	  }
	
	  // Set whether we use SSL to same as current host
	  if (options.secure === undefined && options.host !== util.CLOUD_HOST) {
	    options.secure = util.isSecure();
	  }
	  // Set a custom log function if present
	  if (options.logFunction) {
	    util.setLogFunction(options.logFunction);
	  }
	  util.setLogLevel(options.debug);
	  //
	
	  // Sanity checks
	  // Ensure WebRTC supported
	  if (!util.supports.audioVideo && !util.supports.data ) {
	    this._delayedAbort('browser-incompatible', 'The current browser does not support WebRTC');
	    return;
	  }
	  // Ensure alphanumeric id
	  if (!util.validateId(id)) {
	    this._delayedAbort('invalid-id', 'ID "' + id + '" is invalid');
	    return;
	  }
	  // Ensure valid key
	  if (!util.validateKey(options.key)) {
	    this._delayedAbort('invalid-key', 'API KEY "' + options.key + '" is invalid');
	    return;
	  }
	  // Ensure not using unsecure cloud server on SSL page
	  if (options.secure && options.host === '0.peerjs.com') {
	    this._delayedAbort('ssl-unavailable',
	      'The cloud server currently does not support HTTPS. Please run your own PeerServer to use HTTPS.');
	    return;
	  }
	  //
	
	  // States.
	  this.destroyed = false; // Connections have been killed
	  this.disconnected = false; // Connection to PeerServer killed but P2P connections still active
	  this.open = false; // Sockets and such are not yet open.
	  //
	
	  // References
	  this.connections = {}; // DataConnections for this peer.
	  this._lostMessages = {}; // src => [list of messages]
	  //
	
	  // Start the server connection
	  this._initializeServerConnection();
	  if (id) {
	    this._initialize(id);
	  } else {
	    this._retrieveId();
	  }
	  //
	}
	
	util.inherits(Peer, EventEmitter);
	
	// Initialize the 'socket' (which is actually a mix of XHR streaming and
	// websockets.)
	Peer.prototype._initializeServerConnection = function() {
	  var self = this;
	  this.socket = new Socket(this.options.secure, this.options.host, this.options.port, this.options.path, this.options.key);
	  this.socket.on('message', function(data) {
	    self._handleMessage(data);
	  });
	  this.socket.on('error', function(error) {
	    self._abort('socket-error', error);
	  });
	  this.socket.on('disconnected', function() {
	    // If we haven't explicitly disconnected, emit error and disconnect.
	    if (!self.disconnected) {
	      self.emitError('network', 'Lost connection to server.');
	      self.disconnect();
	    }
	  });
	  this.socket.on('close', function() {
	    // If we haven't explicitly disconnected, emit error.
	    if (!self.disconnected) {
	      self._abort('socket-closed', 'Underlying socket is already closed.');
	    }
	  });
	};
	
	/** Get a unique ID from the server via XHR. */
	Peer.prototype._retrieveId = function(cb) {
	  var self = this;
	  var http = new XMLHttpRequest();
	  var protocol = this.options.secure ? 'https://' : 'http://';
	  var url = protocol + this.options.host + ':' + this.options.port +
	    this.options.path + this.options.key + '/id';
	  var queryString = '?ts=' + new Date().getTime() + '' + Math.random();
	  url += queryString;
	
	  // If there's no ID we need to wait for one before trying to init socket.
	  http.open('get', url, true);
	  http.onerror = function(e) {
	    util.error('Error retrieving ID', e);
	    var pathError = '';
	    if (self.options.path === '/' && self.options.host !== util.CLOUD_HOST) {
	      pathError = ' If you passed in a `path` to your self-hosted PeerServer, ' +
	        'you\'ll also need to pass in that same path when creating a new ' +
	        'Peer.';
	    }
	    self._abort('server-error', 'Could not get an ID from the server.' + pathError);
	  };
	  http.onreadystatechange = function() {
	    if (http.readyState !== 4) {
	      return;
	    }
	    if (http.status !== 200) {
	      http.onerror();
	      return;
	    }
	    self._initialize(http.responseText);
	  };
	  http.send(null);
	};
	
	/** Initialize a connection with the server. */
	Peer.prototype._initialize = function(id) {
	  this.id = id;
	  this.socket.start(this.id, this.options.token);
	};
	
	/** Handles messages from the server. */
	Peer.prototype._handleMessage = function(message) {
	  var type = message.type;
	  var payload = message.payload;
	  var peer = message.src;
	  var connection;
	
	  switch (type) {
	    case 'OPEN': // The connection to the server is open.
	      this.emit('open', this.id);
	      this.open = true;
	      break;
	    case 'ERROR': // Server error.
	      this._abort('server-error', payload.msg);
	      break;
	    case 'ID-TAKEN': // The selected ID is taken.
	      this._abort('unavailable-id', 'ID `' + this.id + '` is taken');
	      break;
	    case 'INVALID-KEY': // The given API key cannot be found.
	      this._abort('invalid-key', 'API KEY "' + this.options.key + '" is invalid');
	      break;
	
	    //
	    case 'LEAVE': // Another peer has closed its connection to this peer.
	      util.log('Received leave message from', peer);
	      this._cleanupPeer(peer);
	      break;
	
	    case 'EXPIRE': // The offer sent to a peer has expired without response.
	      this.emitError('peer-unavailable', 'Could not connect to peer ' + peer);
	      break;
	    case 'OFFER': // we should consider switching this to CALL/CONNECT, but this is the least breaking option.
	      var connectionId = payload.connectionId;
	      connection = this.getConnection(peer, connectionId);
	
	      if (connection) {
	        util.warn('Offer received for existing Connection ID:', connectionId);
	        //connection.handleMessage(message);
	      } else {
	        // Create a new connection.
	        if (payload.type === 'media') {
	          connection = new MediaConnection(peer, this, {
	            connectionId: connectionId,
	            _payload: payload,
	            metadata: payload.metadata
	          });
	          this._addConnection(peer, connection);
	          this.emit('call', connection);
	        } else if (payload.type === 'data') {
	          connection = new DataConnection(peer, this, {
	            connectionId: connectionId,
	            _payload: payload,
	            metadata: payload.metadata,
	            label: payload.label,
	            serialization: payload.serialization,
	            reliable: payload.reliable
	          });
	          this._addConnection(peer, connection);
	          this.emit('connection', connection);
	        } else {
	          util.warn('Received malformed connection type:', payload.type);
	          return;
	        }
	        // Find messages.
	        var messages = this._getMessages(connectionId);
	        for (var i = 0, ii = messages.length; i < ii; i += 1) {
	          connection.handleMessage(messages[i]);
	        }
	      }
	      break;
	    default:
	      if (!payload) {
	        util.warn('You received a malformed message from ' + peer + ' of type ' + type);
	        return;
	      }
	
	      var id = payload.connectionId;
	      connection = this.getConnection(peer, id);
	
	      if (connection && connection.pc) {
	        // Pass it on.
	        connection.handleMessage(message);
	      } else if (id) {
	        // Store for possible later use
	        this._storeMessage(id, message);
	      } else {
	        util.warn('You received an unrecognized message:', message);
	      }
	      break;
	  }
	};
	
	/** Stores messages without a set up connection, to be claimed later. */
	Peer.prototype._storeMessage = function(connectionId, message) {
	  if (!this._lostMessages[connectionId]) {
	    this._lostMessages[connectionId] = [];
	  }
	  this._lostMessages[connectionId].push(message);
	};
	
	/** Retrieve messages from lost message store */
	Peer.prototype._getMessages = function(connectionId) {
	  var messages = this._lostMessages[connectionId];
	  if (messages) {
	    delete this._lostMessages[connectionId];
	    return messages;
	  } else {
	    return [];
	  }
	};
	
	/**
	 * Returns a DataConnection to the specified peer. See documentation for a
	 * complete list of options.
	 */
	Peer.prototype.connect = function(peer, options) {
	  if (this.disconnected) {
	    util.warn('You cannot connect to a new Peer because you called ' +
	      '.disconnect() on this Peer and ended your connection with the ' +
	      'server. You can create a new Peer to reconnect, or call reconnect ' +
	      'on this peer if you believe its ID to still be available.');
	    this.emitError('disconnected', 'Cannot connect to new Peer after disconnecting from server.');
	    return;
	  }
	  var connection = new DataConnection(peer, this, options);
	  this._addConnection(peer, connection);
	  return connection;
	};
	
	/**
	 * Returns a MediaConnection to the specified peer. See documentation for a
	 * complete list of options.
	 */
	Peer.prototype.call = function(peer, stream, options) {
	  if (this.disconnected) {
	    util.warn('You cannot connect to a new Peer because you called ' +
	      '.disconnect() on this Peer and ended your connection with the ' +
	      'server. You can create a new Peer to reconnect.');
	    this.emitError('disconnected', 'Cannot connect to new Peer after disconnecting from server.');
	    return;
	  }
	  if (!stream) {
	    util.error('To call a peer, you must provide a stream from your browser\'s `getUserMedia`.');
	    return;
	  }
	  options = options || {};
	  options._stream = stream;
	  var call = new MediaConnection(peer, this, options);
	  this._addConnection(peer, call);
	  return call;
	};
	
	/** Add a data/media connection to this peer. */
	Peer.prototype._addConnection = function(peer, connection) {
	  if (!this.connections[peer]) {
	    this.connections[peer] = [];
	  }
	  this.connections[peer].push(connection);
	};
	
	/** Retrieve a data/media connection for this peer. */
	Peer.prototype.getConnection = function(peer, id) {
	  var connections = this.connections[peer];
	  if (!connections) {
	    return null;
	  }
	  for (var i = 0, ii = connections.length; i < ii; i++) {
	    if (connections[i].id === id) {
	      return connections[i];
	    }
	  }
	  return null;
	};
	
	Peer.prototype._delayedAbort = function(type, message) {
	  var self = this;
	  util.setZeroTimeout(function(){
	    self._abort(type, message);
	  });
	};
	
	/**
	 * Destroys the Peer and emits an error message.
	 * The Peer is not destroyed if it's in a disconnected state, in which case
	 * it retains its disconnected state and its existing connections.
	 */
	Peer.prototype._abort = function(type, message) {
	  util.error('Aborting!');
	  if (!this._lastServerId) {
	    this.destroy();
	  } else {
	    this.disconnect();
	  }
	  this.emitError(type, message);
	};
	
	/** Emits a typed error message. */
	Peer.prototype.emitError = function(type, err) {
	  util.error('Error:', err);
	  if (typeof err === 'string') {
	    err = new Error(err);
	  }
	  err.type = type;
	  this.emit('error', err);
	};
	
	/**
	 * Destroys the Peer: closes all active connections as well as the connection
	 *  to the server.
	 * Warning: The peer can no longer create or accept connections after being
	 *  destroyed.
	 */
	Peer.prototype.destroy = function() {
	  if (!this.destroyed) {
	    this._cleanup();
	    this.disconnect();
	    this.destroyed = true;
	  }
	};
	
	
	/** Disconnects every connection on this peer. */
	Peer.prototype._cleanup = function() {
	  if (this.connections) {
	    var peers = Object.keys(this.connections);
	    for (var i = 0, ii = peers.length; i < ii; i++) {
	      this._cleanupPeer(peers[i]);
	    }
	  }
	  this.emit('close');
	};
	
	/** Closes all connections to this peer. */
	Peer.prototype._cleanupPeer = function(peer) {
	  var connections = this.connections[peer];
	  for (var j = 0, jj = connections.length; j < jj; j += 1) {
	    connections[j].close();
	  }
	};
	
	/**
	 * Disconnects the Peer's connection to the PeerServer. Does not close any
	 *  active connections.
	 * Warning: The peer can no longer create or accept connections after being
	 *  disconnected. It also cannot reconnect to the server.
	 */
	Peer.prototype.disconnect = function() {
	  var self = this;
	  util.setZeroTimeout(function(){
	    if (!self.disconnected) {
	      self.disconnected = true;
	      self.open = false;
	      if (self.socket) {
	        self.socket.close();
	      }
	      self.emit('disconnected', self.id);
	      self._lastServerId = self.id;
	      self.id = null;
	    }
	  });
	};
	
	/** Attempts to reconnect with the same ID. */
	Peer.prototype.reconnect = function() {
	  if (this.disconnected && !this.destroyed) {
	    util.log('Attempting reconnection to server with ID ' + this._lastServerId);
	    this.disconnected = false;
	    this._initializeServerConnection();
	    this._initialize(this._lastServerId);
	  } else if (this.destroyed) {
	    throw new Error('This peer cannot reconnect to the server. It has already been destroyed.');
	  } else if (!this.disconnected && !this.open) {
	    // Do nothing. We're still connecting the first time.
	    util.error('In a hurry? We\'re still trying to make the initial connection!');
	  } else {
	    throw new Error('Peer ' + this.id + ' cannot reconnect because it is not disconnected from the server!');
	  }
	};
	
	/**
	 * Get a list of available peer IDs. If you're running your own server, you'll
	 * want to set allow_discovery: true in the PeerServer options. If you're using
	 * the cloud server, email team@peerjs.com to get the functionality enabled for
	 * your key.
	 */
	Peer.prototype.listAllPeers = function(cb) {
	  cb = cb || function() {};
	  var self = this;
	  var http = new XMLHttpRequest();
	  var protocol = this.options.secure ? 'https://' : 'http://';
	  var url = protocol + this.options.host + ':' + this.options.port +
	    this.options.path + this.options.key + '/peers';
	  var queryString = '?ts=' + new Date().getTime() + '' + Math.random();
	  url += queryString;
	
	  // If there's no ID we need to wait for one before trying to init socket.
	  http.open('get', url, true);
	  http.onerror = function(e) {
	    self._abort('server-error', 'Could not get peers from the server.');
	    cb([]);
	  };
	  http.onreadystatechange = function() {
	    if (http.readyState !== 4) {
	      return;
	    }
	    if (http.status === 401) {
	      var helpfulError = '';
	      if (self.options.host !== util.CLOUD_HOST) {
	        helpfulError = 'It looks like you\'re using the cloud server. You can email ' +
	          'team@peerjs.com to enable peer listing for your API key.';
	      } else {
	        helpfulError = 'You need to enable `allow_discovery` on your self-hosted ' +
	          'PeerServer to use this feature.';
	      }
	      cb([]);
	      throw new Error('It doesn\'t look like you have permission to list peers IDs. ' + helpfulError);
	    } else if (http.status !== 200) {
	      cb([]);
	    } else {
	      cb(JSON.parse(http.responseText));
	    }
	  };
	  http.send(null);
	};
	
	module.exports = Peer;


/***/ },
/* 12 */
/*!************************************************************!*\
  !*** /Users/tim/code/webrtc-kademlia/~/peerjs/lib/util.js ***!
  \************************************************************/
/***/ function(module, exports, __webpack_require__) {

	var defaultConfig = {'iceServers': [{ 'url': 'stun:stun.l.google.com:19302' }]};
	var dataCount = 1;
	
	var BinaryPack = __webpack_require__(/*! js-binarypack */ 20);
	var RTCPeerConnection = __webpack_require__(/*! ./adapter */ 18).RTCPeerConnection;
	
	var util = {
	  noop: function() {},
	
	  CLOUD_HOST: '0.peerjs.com',
	  CLOUD_PORT: 9000,
	
	  // Browsers that need chunking:
	  chunkedBrowsers: {'Chrome': 1},
	  chunkedMTU: 16300, // The original 60000 bytes setting does not work when sending data from Firefox to Chrome, which is "cut off" after 16384 bytes and delivered individually.
	
	  // Logging logic
	  logLevel: 0,
	  setLogLevel: function(level) {
	    var debugLevel = parseInt(level, 10);
	    if (!isNaN(parseInt(level, 10))) {
	      util.logLevel = debugLevel;
	    } else {
	      // If they are using truthy/falsy values for debug
	      util.logLevel = level ? 3 : 0;
	    }
	    util.log = util.warn = util.error = util.noop;
	    if (util.logLevel > 0) {
	      util.error = util._printWith('ERROR');
	    }
	    if (util.logLevel > 1) {
	      util.warn = util._printWith('WARNING');
	    }
	    if (util.logLevel > 2) {
	      util.log = util._print;
	    }
	  },
	  setLogFunction: function(fn) {
	    if (fn.constructor !== Function) {
	      util.warn('The log function you passed in is not a function. Defaulting to regular logs.');
	    } else {
	      util._print = fn;
	    }
	  },
	
	  _printWith: function(prefix) {
	    return function() {
	      var copy = Array.prototype.slice.call(arguments);
	      copy.unshift(prefix);
	      util._print.apply(util, copy);
	    };
	  },
	  _print: function () {
	    var err = false;
	    var copy = Array.prototype.slice.call(arguments);
	    copy.unshift('PeerJS: ');
	    for (var i = 0, l = copy.length; i < l; i++){
	      if (copy[i] instanceof Error) {
	        copy[i] = '(' + copy[i].name + ') ' + copy[i].message;
	        err = true;
	      }
	    }
	    err ? console.error.apply(console, copy) : console.log.apply(console, copy);
	  },
	  //
	
	  // Returns browser-agnostic default config
	  defaultConfig: defaultConfig,
	  //
	
	  // Returns the current browser.
	  browser: (function() {
	    if (window.mozRTCPeerConnection) {
	      return 'Firefox';
	    } else if (window.webkitRTCPeerConnection) {
	      return 'Chrome';
	    } else if (window.RTCPeerConnection) {
	      return 'Supported';
	    } else {
	      return 'Unsupported';
	    }
	  })(),
	  //
	
	  // Lists which features are supported
	  supports: (function() {
	    if (typeof RTCPeerConnection === 'undefined') {
	      return {};
	    }
	
	    var data = true;
	    var audioVideo = true;
	
	    var binaryBlob = false;
	    var sctp = false;
	    var onnegotiationneeded = !!window.webkitRTCPeerConnection;
	
	    var pc, dc;
	    try {
	      pc = new RTCPeerConnection(defaultConfig, {optional: [{RtpDataChannels: true}]});
	    } catch (e) {
	      data = false;
	      audioVideo = false;
	    }
	
	    if (data) {
	      try {
	        dc = pc.createDataChannel('_PEERJSTEST');
	      } catch (e) {
	        data = false;
	      }
	    }
	
	    if (data) {
	      // Binary test
	      try {
	        dc.binaryType = 'blob';
	        binaryBlob = true;
	      } catch (e) {
	      }
	
	      // Reliable test.
	      // Unfortunately Chrome is a bit unreliable about whether or not they
	      // support reliable.
	      var reliablePC = new RTCPeerConnection(defaultConfig, {});
	      try {
	        var reliableDC = reliablePC.createDataChannel('_PEERJSRELIABLETEST', {});
	        sctp = reliableDC.reliable;
	      } catch (e) {
	      }
	      reliablePC.close();
	    }
	
	    // FIXME: not really the best check...
	    if (audioVideo) {
	      audioVideo = !!pc.addStream;
	    }
	
	    // FIXME: this is not great because in theory it doesn't work for
	    // av-only browsers (?).
	    if (!onnegotiationneeded && data) {
	      // sync default check.
	      var negotiationPC = new RTCPeerConnection(defaultConfig, {optional: [{RtpDataChannels: true}]});
	      negotiationPC.onnegotiationneeded = function() {
	        onnegotiationneeded = true;
	        // async check.
	        if (util && util.supports) {
	          util.supports.onnegotiationneeded = true;
	        }
	      };
	      negotiationPC.createDataChannel('_PEERJSNEGOTIATIONTEST');
	
	      setTimeout(function() {
	        negotiationPC.close();
	      }, 1000);
	    }
	
	    if (pc) {
	      pc.close();
	    }
	
	    return {
	      audioVideo: audioVideo,
	      data: data,
	      binaryBlob: binaryBlob,
	      binary: sctp, // deprecated; sctp implies binary support.
	      reliable: sctp, // deprecated; sctp implies reliable data.
	      sctp: sctp,
	      onnegotiationneeded: onnegotiationneeded
	    };
	  }()),
	  //
	
	  // Ensure alphanumeric ids
	  validateId: function(id) {
	    // Allow empty ids
	    return !id || /^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/.exec(id);
	  },
	
	  validateKey: function(key) {
	    // Allow empty keys
	    return !key || /^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/.exec(key);
	  },
	
	
	  debug: false,
	
	  inherits: function(ctor, superCtor) {
	    ctor.super_ = superCtor;
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  },
	  extend: function(dest, source) {
	    for(var key in source) {
	      if(source.hasOwnProperty(key)) {
	        dest[key] = source[key];
	      }
	    }
	    return dest;
	  },
	  pack: BinaryPack.pack,
	  unpack: BinaryPack.unpack,
	
	  log: function () {
	    if (util.debug) {
	      var err = false;
	      var copy = Array.prototype.slice.call(arguments);
	      copy.unshift('PeerJS: ');
	      for (var i = 0, l = copy.length; i < l; i++){
	        if (copy[i] instanceof Error) {
	          copy[i] = '(' + copy[i].name + ') ' + copy[i].message;
	          err = true;
	        }
	      }
	      err ? console.error.apply(console, copy) : console.log.apply(console, copy);
	    }
	  },
	
	  setZeroTimeout: (function(global) {
	    var timeouts = [];
	    var messageName = 'zero-timeout-message';
	
	    // Like setTimeout, but only takes a function argument.	 There's
	    // no time argument (always zero) and no arguments (you have to
	    // use a closure).
	    function setZeroTimeoutPostMessage(fn) {
	      timeouts.push(fn);
	      global.postMessage(messageName, '*');
	    }
	
	    function handleMessage(event) {
	      if (event.source == global && event.data == messageName) {
	        if (event.stopPropagation) {
	          event.stopPropagation();
	        }
	        if (timeouts.length) {
	          timeouts.shift()();
	        }
	      }
	    }
	    if (global.addEventListener) {
	      global.addEventListener('message', handleMessage, true);
	    } else if (global.attachEvent) {
	      global.attachEvent('onmessage', handleMessage);
	    }
	    return setZeroTimeoutPostMessage;
	  }(window)),
	
	  // Binary stuff
	
	  // chunks a blob.
	  chunk: function(bl) {
	    var chunks = [];
	    var size = bl.size;
	    var start = index = 0;
	    var total = Math.ceil(size / util.chunkedMTU);
	    while (start < size) {
	      var end = Math.min(size, start + util.chunkedMTU);
	      var b = bl.slice(start, end);
	
	      var chunk = {
	        __peerData: dataCount,
	        n: index,
	        data: b,
	        total: total
	      };
	
	      chunks.push(chunk);
	
	      start = end;
	      index += 1;
	    }
	    dataCount += 1;
	    return chunks;
	  },
	
	  blobToArrayBuffer: function(blob, cb){
	    var fr = new FileReader();
	    fr.onload = function(evt) {
	      cb(evt.target.result);
	    };
	    fr.readAsArrayBuffer(blob);
	  },
	  blobToBinaryString: function(blob, cb){
	    var fr = new FileReader();
	    fr.onload = function(evt) {
	      cb(evt.target.result);
	    };
	    fr.readAsBinaryString(blob);
	  },
	  binaryStringToArrayBuffer: function(binary) {
	    var byteArray = new Uint8Array(binary.length);
	    for (var i = 0; i < binary.length; i++) {
	      byteArray[i] = binary.charCodeAt(i) & 0xff;
	    }
	    return byteArray.buffer;
	  },
	  randomToken: function () {
	    return Math.random().toString(36).substr(2);
	  },
	  //
	
	  isSecure: function() {
	    return location.protocol === 'https:';
	  }
	};
	
	module.exports = util;


/***/ },
/* 13 */
/*!**************************************************************!*\
  !*** /Users/tim/code/webrtc-kademlia/~/peerjs/lib/socket.js ***!
  \**************************************************************/
/***/ function(module, exports, __webpack_require__) {

	var util = __webpack_require__(/*! ./util */ 12);
	var EventEmitter = __webpack_require__(/*! eventemitter3 */ 17);
	
	/**
	 * An abstraction on top of WebSockets and XHR streaming to provide fastest
	 * possible connection for peers.
	 */
	function Socket(secure, host, port, path, key) {
	  if (!(this instanceof Socket)) return new Socket(secure, host, port, path, key);
	
	  EventEmitter.call(this);
	
	  // Disconnected manually.
	  this.disconnected = false;
	  this._queue = [];
	
	  var httpProtocol = secure ? 'https://' : 'http://';
	  var wsProtocol = secure ? 'wss://' : 'ws://';
	  this._httpUrl = httpProtocol + host + ':' + port + path + key;
	  this._wsUrl = wsProtocol + host + ':' + port + path + 'peerjs?key=' + key;
	}
	
	util.inherits(Socket, EventEmitter);
	
	
	/** Check in with ID or get one from server. */
	Socket.prototype.start = function(id, token) {
	  this.id = id;
	
	  this._httpUrl += '/' + id + '/' + token;
	  this._wsUrl += '&id=' + id + '&token=' + token;
	
	  this._startXhrStream();
	  this._startWebSocket();
	}
	
	
	/** Start up websocket communications. */
	Socket.prototype._startWebSocket = function(id) {
	  var self = this;
	
	  if (this._socket) {
	    return;
	  }
	
	  this._socket = new WebSocket(this._wsUrl);
	
	  this._socket.onmessage = function(event) {
	    try {
	      var data = JSON.parse(event.data);
	    } catch(e) {
	      util.log('Invalid server message', event.data);
	      return;
	    }
	    self.emit('message', data);
	  };
	
	  this._socket.onclose = function(event) {
	    util.log('Socket closed.');
	    self.disconnected = true;
	    self.emit('disconnected');
	  };
	
	  // Take care of the queue of connections if necessary and make sure Peer knows
	  // socket is open.
	  this._socket.onopen = function() {
	    if (self._timeout) {
	      clearTimeout(self._timeout);
	      setTimeout(function(){
	        self._http.abort();
	        self._http = null;
	      }, 5000);
	    }
	    self._sendQueuedMessages();
	    util.log('Socket open');
	  };
	}
	
	/** Start XHR streaming. */
	Socket.prototype._startXhrStream = function(n) {
	  try {
	    var self = this;
	    this._http = new XMLHttpRequest();
	    this._http._index = 1;
	    this._http._streamIndex = n || 0;
	    this._http.open('post', this._httpUrl + '/id?i=' + this._http._streamIndex, true);
	    this._http.onerror = function() {
	      // If we get an error, likely something went wrong.
	      // Stop streaming.
	      clearTimeout(self._timeout);
	      self.emit('disconnected');
	    }
	    this._http.onreadystatechange = function() {
	      if (this.readyState == 2 && this.old) {
	        this.old.abort();
	        delete this.old;
	      } else if (this.readyState > 2 && this.status === 200 && this.responseText) {
	        self._handleStream(this);
	      }
	    };
	    this._http.send(null);
	    this._setHTTPTimeout();
	  } catch(e) {
	    util.log('XMLHttpRequest not available; defaulting to WebSockets');
	  }
	}
	
	
	/** Handles onreadystatechange response as a stream. */
	Socket.prototype._handleStream = function(http) {
	  // 3 and 4 are loading/done state. All others are not relevant.
	  var messages = http.responseText.split('\n');
	
	  // Check to see if anything needs to be processed on buffer.
	  if (http._buffer) {
	    while (http._buffer.length > 0) {
	      var index = http._buffer.shift();
	      var bufferedMessage = messages[index];
	      try {
	        bufferedMessage = JSON.parse(bufferedMessage);
	      } catch(e) {
	        http._buffer.shift(index);
	        break;
	      }
	      this.emit('message', bufferedMessage);
	    }
	  }
	
	  var message = messages[http._index];
	  if (message) {
	    http._index += 1;
	    // Buffering--this message is incomplete and we'll get to it next time.
	    // This checks if the httpResponse ended in a `\n`, in which case the last
	    // element of messages should be the empty string.
	    if (http._index === messages.length) {
	      if (!http._buffer) {
	        http._buffer = [];
	      }
	      http._buffer.push(http._index - 1);
	    } else {
	      try {
	        message = JSON.parse(message);
	      } catch(e) {
	        util.log('Invalid server message', message);
	        return;
	      }
	      this.emit('message', message);
	    }
	  }
	}
	
	Socket.prototype._setHTTPTimeout = function() {
	  var self = this;
	  this._timeout = setTimeout(function() {
	    var old = self._http;
	    if (!self._wsOpen()) {
	      self._startXhrStream(old._streamIndex + 1);
	      self._http.old = old;
	    } else {
	      old.abort();
	    }
	  }, 25000);
	}
	
	/** Is the websocket currently open? */
	Socket.prototype._wsOpen = function() {
	  return this._socket && this._socket.readyState == 1;
	}
	
	/** Send queued messages. */
	Socket.prototype._sendQueuedMessages = function() {
	  for (var i = 0, ii = this._queue.length; i < ii; i += 1) {
	    this.send(this._queue[i]);
	  }
	}
	
	/** Exposed send for DC & Peer. */
	Socket.prototype.send = function(data) {
	  if (this.disconnected) {
	    return;
	  }
	
	  // If we didn't get an ID yet, we can't yet send anything so we should queue
	  // up these messages.
	  if (!this.id) {
	    this._queue.push(data);
	    return;
	  }
	
	  if (!data.type) {
	    this.emit('error', 'Invalid message');
	    return;
	  }
	
	  var message = JSON.stringify(data);
	  if (this._wsOpen()) {
	    this._socket.send(message);
	  } else {
	    var http = new XMLHttpRequest();
	    var url = this._httpUrl + '/' + data.type.toLowerCase();
	    http.open('post', url, true);
	    http.setRequestHeader('Content-Type', 'application/json');
	    http.send(message);
	  }
	}
	
	Socket.prototype.close = function() {
	  if (!this.disconnected && this._wsOpen()) {
	    this._socket.close();
	    this.disconnected = true;
	  }
	}
	
	module.exports = Socket;


/***/ },
/* 14 */
/*!***********************************************************************!*\
  !*** /Users/tim/code/webrtc-kademlia/~/peerjs/lib/mediaconnection.js ***!
  \***********************************************************************/
/***/ function(module, exports, __webpack_require__) {

	var util = __webpack_require__(/*! ./util */ 12);
	var EventEmitter = __webpack_require__(/*! eventemitter3 */ 17);
	var Negotiator = __webpack_require__(/*! ./negotiator */ 19);
	
	/**
	 * Wraps the streaming interface between two Peers.
	 */
	function MediaConnection(peer, provider, options) {
	  if (!(this instanceof MediaConnection)) return new MediaConnection(peer, provider, options);
	  EventEmitter.call(this);
	
	  this.options = util.extend({}, options);
	
	  this.open = false;
	  this.type = 'media';
	  this.peer = peer;
	  this.provider = provider;
	  this.metadata = this.options.metadata;
	  this.localStream = this.options._stream;
	
	  this.id = this.options.connectionId || MediaConnection._idPrefix + util.randomToken();
	  if (this.localStream) {
	    Negotiator.startConnection(
	      this,
	      {_stream: this.localStream, originator: true}
	    );
	  }
	};
	
	util.inherits(MediaConnection, EventEmitter);
	
	MediaConnection._idPrefix = 'mc_';
	
	MediaConnection.prototype.addStream = function(remoteStream) {
	  util.log('Receiving stream', remoteStream);
	
	  this.remoteStream = remoteStream;
	  this.emit('stream', remoteStream); // Should we call this `open`?
	
	};
	
	MediaConnection.prototype.handleMessage = function(message) {
	  var payload = message.payload;
	
	  switch (message.type) {
	    case 'ANSWER':
	      // Forward to negotiator
	      Negotiator.handleSDP(message.type, this, payload.sdp);
	      this.open = true;
	      break;
	    case 'CANDIDATE':
	      Negotiator.handleCandidate(this, payload.candidate);
	      break;
	    default:
	      util.warn('Unrecognized message type:', message.type, 'from peer:', this.peer);
	      break;
	  }
	}
	
	MediaConnection.prototype.answer = function(stream) {
	  if (this.localStream) {
	    util.warn('Local stream already exists on this MediaConnection. Are you answering a call twice?');
	    return;
	  }
	
	  this.options._payload._stream = stream;
	
	  this.localStream = stream;
	  Negotiator.startConnection(
	    this,
	    this.options._payload
	  )
	  // Retrieve lost messages stored because PeerConnection not set up.
	  var messages = this.provider._getMessages(this.id);
	  for (var i = 0, ii = messages.length; i < ii; i += 1) {
	    this.handleMessage(messages[i]);
	  }
	  this.open = true;
	};
	
	/**
	 * Exposed functionality for users.
	 */
	
	/** Allows user to close connection. */
	MediaConnection.prototype.close = function() {
	  if (!this.open) {
	    return;
	  }
	  this.open = false;
	  Negotiator.cleanup(this);
	  this.emit('close')
	};
	
	module.exports = MediaConnection;


/***/ },
/* 15 */
/*!**********************************************************************!*\
  !*** /Users/tim/code/webrtc-kademlia/~/peerjs/lib/dataconnection.js ***!
  \**********************************************************************/
/***/ function(module, exports, __webpack_require__) {

	var util = __webpack_require__(/*! ./util */ 12);
	var EventEmitter = __webpack_require__(/*! eventemitter3 */ 17);
	var Negotiator = __webpack_require__(/*! ./negotiator */ 19);
	var Reliable = __webpack_require__(/*! reliable */ 21);
	
	/**
	 * Wraps a DataChannel between two Peers.
	 */
	function DataConnection(peer, provider, options) {
	  if (!(this instanceof DataConnection)) return new DataConnection(peer, provider, options);
	  EventEmitter.call(this);
	
	  this.options = util.extend({
	    serialization: 'binary',
	    reliable: false
	  }, options);
	
	  // Connection is not open yet.
	  this.open = false;
	  this.type = 'data';
	  this.peer = peer;
	  this.provider = provider;
	
	  this.id = this.options.connectionId || DataConnection._idPrefix + util.randomToken();
	
	  this.label = this.options.label || this.id;
	  this.metadata = this.options.metadata;
	  this.serialization = this.options.serialization;
	  this.reliable = this.options.reliable;
	
	  // Data channel buffering.
	  this._buffer = [];
	  this._buffering = false;
	  this.bufferSize = 0;
	
	  // For storing large data.
	  this._chunkedData = {};
	
	  if (this.options._payload) {
	    this._peerBrowser = this.options._payload.browser;
	  }
	
	  Negotiator.startConnection(
	    this,
	    this.options._payload || {
	      originator: true
	    }
	  );
	}
	
	util.inherits(DataConnection, EventEmitter);
	
	DataConnection._idPrefix = 'dc_';
	
	/** Called by the Negotiator when the DataChannel is ready. */
	DataConnection.prototype.initialize = function(dc) {
	  this._dc = this.dataChannel = dc;
	  this._configureDataChannel();
	}
	
	DataConnection.prototype._configureDataChannel = function() {
	  var self = this;
	  if (util.supports.sctp) {
	    this._dc.binaryType = 'arraybuffer';
	  }
	  this._dc.onopen = function() {
	    util.log('Data channel connection success');
	    self.open = true;
	    self.emit('open');
	  }
	
	  // Use the Reliable shim for non Firefox browsers
	  if (!util.supports.sctp && this.reliable) {
	    this._reliable = new Reliable(this._dc, util.debug);
	  }
	
	  if (this._reliable) {
	    this._reliable.onmessage = function(msg) {
	      self.emit('data', msg);
	    };
	  } else {
	    this._dc.onmessage = function(e) {
	      self._handleDataMessage(e);
	    };
	  }
	  this._dc.onclose = function(e) {
	    util.log('DataChannel closed for:', self.peer);
	    self.close();
	  };
	}
	
	// Handles a DataChannel message.
	DataConnection.prototype._handleDataMessage = function(e) {
	  var self = this;
	  var data = e.data;
	  var datatype = data.constructor;
	  if (this.serialization === 'binary' || this.serialization === 'binary-utf8') {
	    if (datatype === Blob) {
	      // Datatype should never be blob
	      util.blobToArrayBuffer(data, function(ab) {
	        data = util.unpack(ab);
	        self.emit('data', data);
	      });
	      return;
	    } else if (datatype === ArrayBuffer) {
	      data = util.unpack(data);
	    } else if (datatype === String) {
	      // String fallback for binary data for browsers that don't support binary yet
	      var ab = util.binaryStringToArrayBuffer(data);
	      data = util.unpack(ab);
	    }
	  } else if (this.serialization === 'json') {
	    data = JSON.parse(data);
	  }
	
	  // Check if we've chunked--if so, piece things back together.
	  // We're guaranteed that this isn't 0.
	  if (data.__peerData) {
	    var id = data.__peerData;
	    var chunkInfo = this._chunkedData[id] || {data: [], count: 0, total: data.total};
	
	    chunkInfo.data[data.n] = data.data;
	    chunkInfo.count += 1;
	
	    if (chunkInfo.total === chunkInfo.count) {
	      // Clean up before making the recursive call to `_handleDataMessage`.
	      delete this._chunkedData[id];
	
	      // We've received all the chunks--time to construct the complete data.
	      data = new Blob(chunkInfo.data);
	      this._handleDataMessage({data: data});
	    }
	
	    this._chunkedData[id] = chunkInfo;
	    return;
	  }
	
	  this.emit('data', data);
	}
	
	/**
	 * Exposed functionality for users.
	 */
	
	/** Allows user to close connection. */
	DataConnection.prototype.close = function() {
	  if (!this.open) {
	    return;
	  }
	  this.open = false;
	  Negotiator.cleanup(this);
	  this.emit('close');
	}
	
	/** Allows user to send data. */
	DataConnection.prototype.send = function(data, chunked) {
	  if (!this.open) {
	    this.emit('error', new Error('Connection is not open. You should listen for the `open` event before sending messages.'));
	    return;
	  }
	  if (this._reliable) {
	    // Note: reliable shim sending will make it so that you cannot customize
	    // serialization.
	    this._reliable.send(data);
	    return;
	  }
	  var self = this;
	  if (this.serialization === 'json') {
	    this._bufferedSend(JSON.stringify(data));
	  } else if (this.serialization === 'binary' || this.serialization === 'binary-utf8') {
	    var blob = util.pack(data);
	
	    // For Chrome-Firefox interoperability, we need to make Firefox "chunk"
	    // the data it sends out.
	    var needsChunking = util.chunkedBrowsers[this._peerBrowser] || util.chunkedBrowsers[util.browser];
	    if (needsChunking && !chunked && blob.size > util.chunkedMTU) {
	      this._sendChunks(blob);
	      return;
	    }
	
	    // DataChannel currently only supports strings.
	    if (!util.supports.sctp) {
	      util.blobToBinaryString(blob, function(str) {
	        self._bufferedSend(str);
	      });
	    } else if (!util.supports.binaryBlob) {
	      // We only do this if we really need to (e.g. blobs are not supported),
	      // because this conversion is costly.
	      util.blobToArrayBuffer(blob, function(ab) {
	        self._bufferedSend(ab);
	      });
	    } else {
	      this._bufferedSend(blob);
	    }
	  } else {
	    this._bufferedSend(data);
	  }
	}
	
	DataConnection.prototype._bufferedSend = function(msg) {
	  if (this._buffering || !this._trySend(msg)) {
	    this._buffer.push(msg);
	    this.bufferSize = this._buffer.length;
	  }
	}
	
	// Returns true if the send succeeds.
	DataConnection.prototype._trySend = function(msg) {
	  try {
	    this._dc.send(msg);
	  } catch (e) {
	    this._buffering = true;
	
	    var self = this;
	    setTimeout(function() {
	      // Try again.
	      self._buffering = false;
	      self._tryBuffer();
	    }, 100);
	    return false;
	  }
	  return true;
	}
	
	// Try to send the first message in the buffer.
	DataConnection.prototype._tryBuffer = function() {
	  if (this._buffer.length === 0) {
	    return;
	  }
	
	  var msg = this._buffer[0];
	
	  if (this._trySend(msg)) {
	    this._buffer.shift();
	    this.bufferSize = this._buffer.length;
	    this._tryBuffer();
	  }
	}
	
	DataConnection.prototype._sendChunks = function(blob) {
	  var blobs = util.chunk(blob);
	  for (var i = 0, ii = blobs.length; i < ii; i += 1) {
	    var blob = blobs[i];
	    this.send(blob, true);
	  }
	}
	
	DataConnection.prototype.handleMessage = function(message) {
	  var payload = message.payload;
	
	  switch (message.type) {
	    case 'ANSWER':
	      this._peerBrowser = payload.browser;
	
	      // Forward to negotiator
	      Negotiator.handleSDP(message.type, this, payload.sdp);
	      break;
	    case 'CANDIDATE':
	      Negotiator.handleCandidate(this, payload.candidate);
	      break;
	    default:
	      util.warn('Unrecognized message type:', message.type, 'from peer:', this.peer);
	      break;
	  }
	}
	
	module.exports = DataConnection;


/***/ },
/* 16 */
/*!**********************************************************!*\
  !*** (webpack)/~/node-libs-browser/~/process/browser.js ***!
  \**********************************************************/
/***/ function(module, exports, __webpack_require__) {

	// shim for using process in browser
	
	var process = module.exports = {};
	
	process.nextTick = (function () {
	    var canSetImmediate = typeof window !== 'undefined'
	    && window.setImmediate;
	    var canPost = typeof window !== 'undefined'
	    && window.postMessage && window.addEventListener
	    ;
	
	    if (canSetImmediate) {
	        return function (f) { return window.setImmediate(f) };
	    }
	
	    if (canPost) {
	        var queue = [];
	        window.addEventListener('message', function (ev) {
	            var source = ev.source;
	            if ((source === window || source === null) && ev.data === 'process-tick') {
	                ev.stopPropagation();
	                if (queue.length > 0) {
	                    var fn = queue.shift();
	                    fn();
	                }
	            }
	        }, true);
	
	        return function nextTick(fn) {
	            queue.push(fn);
	            window.postMessage('process-tick', '*');
	        };
	    }
	
	    return function nextTick(fn) {
	        setTimeout(fn, 0);
	    };
	})();
	
	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];
	
	function noop() {}
	
	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;
	
	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	}
	
	// TODO(shtylman)
	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};


/***/ },
/* 17 */
/*!*************************************************************************!*\
  !*** /Users/tim/code/webrtc-kademlia/~/peerjs/~/eventemitter3/index.js ***!
  \*************************************************************************/
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	/**
	 * Representation of a single EventEmitter function.
	 *
	 * @param {Function} fn Event handler to be called.
	 * @param {Mixed} context Context for function execution.
	 * @param {Boolean} once Only emit once
	 * @api private
	 */
	function EE(fn, context, once) {
	  this.fn = fn;
	  this.context = context;
	  this.once = once || false;
	}
	
	/**
	 * Minimal EventEmitter interface that is molded against the Node.js
	 * EventEmitter interface.
	 *
	 * @constructor
	 * @api public
	 */
	function EventEmitter() { /* Nothing to set */ }
	
	/**
	 * Holds the assigned EventEmitters by name.
	 *
	 * @type {Object}
	 * @private
	 */
	EventEmitter.prototype._events = undefined;
	
	/**
	 * Return a list of assigned event listeners.
	 *
	 * @param {String} event The events that should be listed.
	 * @returns {Array}
	 * @api public
	 */
	EventEmitter.prototype.listeners = function listeners(event) {
	  if (!this._events || !this._events[event]) return [];
	  if (this._events[event].fn) return [this._events[event].fn];
	
	  for (var i = 0, l = this._events[event].length, ee = new Array(l); i < l; i++) {
	    ee[i] = this._events[event][i].fn;
	  }
	
	  return ee;
	};
	
	/**
	 * Emit an event to all registered event listeners.
	 *
	 * @param {String} event The name of the event.
	 * @returns {Boolean} Indication if we've emitted an event.
	 * @api public
	 */
	EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
	  if (!this._events || !this._events[event]) return false;
	
	  var listeners = this._events[event]
	    , len = arguments.length
	    , args
	    , i;
	
	  if ('function' === typeof listeners.fn) {
	    if (listeners.once) this.removeListener(event, listeners.fn, true);
	
	    switch (len) {
	      case 1: return listeners.fn.call(listeners.context), true;
	      case 2: return listeners.fn.call(listeners.context, a1), true;
	      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
	      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
	      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
	      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
	    }
	
	    for (i = 1, args = new Array(len -1); i < len; i++) {
	      args[i - 1] = arguments[i];
	    }
	
	    listeners.fn.apply(listeners.context, args);
	  } else {
	    var length = listeners.length
	      , j;
	
	    for (i = 0; i < length; i++) {
	      if (listeners[i].once) this.removeListener(event, listeners[i].fn, true);
	
	      switch (len) {
	        case 1: listeners[i].fn.call(listeners[i].context); break;
	        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
	        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
	        default:
	          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
	            args[j - 1] = arguments[j];
	          }
	
	          listeners[i].fn.apply(listeners[i].context, args);
	      }
	    }
	  }
	
	  return true;
	};
	
	/**
	 * Register a new EventListener for the given event.
	 *
	 * @param {String} event Name of the event.
	 * @param {Functon} fn Callback function.
	 * @param {Mixed} context The context of the function.
	 * @api public
	 */
	EventEmitter.prototype.on = function on(event, fn, context) {
	  var listener = new EE(fn, context || this);
	
	  if (!this._events) this._events = {};
	  if (!this._events[event]) this._events[event] = listener;
	  else {
	    if (!this._events[event].fn) this._events[event].push(listener);
	    else this._events[event] = [
	      this._events[event], listener
	    ];
	  }
	
	  return this;
	};
	
	/**
	 * Add an EventListener that's only called once.
	 *
	 * @param {String} event Name of the event.
	 * @param {Function} fn Callback function.
	 * @param {Mixed} context The context of the function.
	 * @api public
	 */
	EventEmitter.prototype.once = function once(event, fn, context) {
	  var listener = new EE(fn, context || this, true);
	
	  if (!this._events) this._events = {};
	  if (!this._events[event]) this._events[event] = listener;
	  else {
	    if (!this._events[event].fn) this._events[event].push(listener);
	    else this._events[event] = [
	      this._events[event], listener
	    ];
	  }
	
	  return this;
	};
	
	/**
	 * Remove event listeners.
	 *
	 * @param {String} event The event we want to remove.
	 * @param {Function} fn The listener that we need to find.
	 * @param {Boolean} once Only remove once listeners.
	 * @api public
	 */
	EventEmitter.prototype.removeListener = function removeListener(event, fn, once) {
	  if (!this._events || !this._events[event]) return this;
	
	  var listeners = this._events[event]
	    , events = [];
	
	  if (fn) {
	    if (listeners.fn && (listeners.fn !== fn || (once && !listeners.once))) {
	      events.push(listeners);
	    }
	    if (!listeners.fn) for (var i = 0, length = listeners.length; i < length; i++) {
	      if (listeners[i].fn !== fn || (once && !listeners[i].once)) {
	        events.push(listeners[i]);
	      }
	    }
	  }
	
	  //
	  // Reset the array, or remove it completely if we have no more listeners.
	  //
	  if (events.length) {
	    this._events[event] = events.length === 1 ? events[0] : events;
	  } else {
	    delete this._events[event];
	  }
	
	  return this;
	};
	
	/**
	 * Remove all listeners or only the listeners for the specified event.
	 *
	 * @param {String} event The event want to remove all listeners for.
	 * @api public
	 */
	EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
	  if (!this._events) return this;
	
	  if (event) delete this._events[event];
	  else this._events = {};
	
	  return this;
	};
	
	//
	// Alias methods names because people roll like that.
	//
	EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
	EventEmitter.prototype.addListener = EventEmitter.prototype.on;
	
	//
	// This function doesn't apply anymore.
	//
	EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
	  return this;
	};
	
	//
	// Expose the module.
	//
	EventEmitter.EventEmitter = EventEmitter;
	EventEmitter.EventEmitter2 = EventEmitter;
	EventEmitter.EventEmitter3 = EventEmitter;
	
	//
	// Expose the module.
	//
	module.exports = EventEmitter;


/***/ },
/* 18 */
/*!***************************************************************!*\
  !*** /Users/tim/code/webrtc-kademlia/~/peerjs/lib/adapter.js ***!
  \***************************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports.RTCSessionDescription = window.RTCSessionDescription ||
		window.mozRTCSessionDescription;
	module.exports.RTCPeerConnection = window.RTCPeerConnection ||
		window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
	module.exports.RTCIceCandidate = window.RTCIceCandidate ||
		window.mozRTCIceCandidate;


/***/ },
/* 19 */
/*!******************************************************************!*\
  !*** /Users/tim/code/webrtc-kademlia/~/peerjs/lib/negotiator.js ***!
  \******************************************************************/
/***/ function(module, exports, __webpack_require__) {

	var util = __webpack_require__(/*! ./util */ 12);
	var RTCPeerConnection = __webpack_require__(/*! ./adapter */ 18).RTCPeerConnection;
	var RTCSessionDescription = __webpack_require__(/*! ./adapter */ 18).RTCSessionDescription;
	var RTCIceCandidate = __webpack_require__(/*! ./adapter */ 18).RTCIceCandidate;
	
	/**
	 * Manages all negotiations between Peers.
	 */
	var Negotiator = {
	  pcs: {
	    data: {},
	    media: {}
	  }, // type => {peerId: {pc_id: pc}}.
	  //providers: {}, // provider's id => providers (there may be multiple providers/client.
	  queue: [] // connections that are delayed due to a PC being in use.
	}
	
	Negotiator._idPrefix = 'pc_';
	
	/** Returns a PeerConnection object set up correctly (for data, media). */
	Negotiator.startConnection = function(connection, options) {
	  var pc = Negotiator._getPeerConnection(connection, options);
	
	  if (connection.type === 'media' && options._stream) {
	    // Add the stream.
	    pc.addStream(options._stream);
	  }
	
	  // Set the connection's PC.
	  connection.pc = connection.peerConnection = pc;
	  // What do we need to do now?
	  if (options.originator) {
	    if (connection.type === 'data') {
	      // Create the datachannel.
	      var config = {};
	      // Dropping reliable:false support, since it seems to be crashing
	      // Chrome.
	      /*if (util.supports.sctp && !options.reliable) {
	        // If we have canonical reliable support...
	        config = {maxRetransmits: 0};
	      }*/
	      // Fallback to ensure older browsers don't crash.
	      if (!util.supports.sctp) {
	        config = {reliable: options.reliable};
	      }
	      var dc = pc.createDataChannel(connection.label, config);
	      connection.initialize(dc);
	    }
	
	    if (!util.supports.onnegotiationneeded) {
	      Negotiator._makeOffer(connection);
	    }
	  } else {
	    Negotiator.handleSDP('OFFER', connection, options.sdp);
	  }
	}
	
	Negotiator._getPeerConnection = function(connection, options) {
	  if (!Negotiator.pcs[connection.type]) {
	    util.error(connection.type + ' is not a valid connection type. Maybe you overrode the `type` property somewhere.');
	  }
	
	  if (!Negotiator.pcs[connection.type][connection.peer]) {
	    Negotiator.pcs[connection.type][connection.peer] = {};
	  }
	  var peerConnections = Negotiator.pcs[connection.type][connection.peer];
	
	  var pc;
	  // Not multiplexing while FF and Chrome have not-great support for it.
	  /*if (options.multiplex) {
	    ids = Object.keys(peerConnections);
	    for (var i = 0, ii = ids.length; i < ii; i += 1) {
	      pc = peerConnections[ids[i]];
	      if (pc.signalingState === 'stable') {
	        break; // We can go ahead and use this PC.
	      }
	    }
	  } else */
	  if (options.pc) { // Simplest case: PC id already provided for us.
	    pc = Negotiator.pcs[connection.type][connection.peer][options.pc];
	  }
	
	  if (!pc || pc.signalingState !== 'stable') {
	    pc = Negotiator._startPeerConnection(connection);
	  }
	  return pc;
	}
	
	/*
	Negotiator._addProvider = function(provider) {
	  if ((!provider.id && !provider.disconnected) || !provider.socket.open) {
	    // Wait for provider to obtain an ID.
	    provider.on('open', function(id) {
	      Negotiator._addProvider(provider);
	    });
	  } else {
	    Negotiator.providers[provider.id] = provider;
	  }
	}*/
	
	
	/** Start a PC. */
	Negotiator._startPeerConnection = function(connection) {
	  util.log('Creating RTCPeerConnection.');
	
	  var id = Negotiator._idPrefix + util.randomToken();
	  var optional = {};
	
	  if (connection.type === 'data' && !util.supports.sctp) {
	    optional = {optional: [{RtpDataChannels: true}]};
	  } else if (connection.type === 'media') {
	    // Interop req for chrome.
	    optional = {optional: [{DtlsSrtpKeyAgreement: true}]};
	  }
	
	  var pc = new RTCPeerConnection(connection.provider.options.config, optional);
	  Negotiator.pcs[connection.type][connection.peer][id] = pc;
	
	  Negotiator._setupListeners(connection, pc, id);
	
	  return pc;
	}
	
	/** Set up various WebRTC listeners. */
	Negotiator._setupListeners = function(connection, pc, pc_id) {
	  var peerId = connection.peer;
	  var connectionId = connection.id;
	  var provider = connection.provider;
	
	  // ICE CANDIDATES.
	  util.log('Listening for ICE candidates.');
	  pc.onicecandidate = function(evt) {
	    if (evt.candidate) {
	      util.log('Received ICE candidates for:', connection.peer);
	      provider.socket.send({
	        type: 'CANDIDATE',
	        payload: {
	          candidate: evt.candidate,
	          type: connection.type,
	          connectionId: connection.id
	        },
	        dst: peerId
	      });
	    }
	  };
	
	  pc.oniceconnectionstatechange = function() {
	    switch (pc.iceConnectionState) {
	      case 'disconnected':
	      case 'failed':
	        util.log('iceConnectionState is disconnected, closing connections to ' + peerId);
	        connection.close();
	        break;
	      case 'completed':
	        pc.onicecandidate = util.noop;
	        break;
	    }
	  };
	
	  // Fallback for older Chrome impls.
	  pc.onicechange = pc.oniceconnectionstatechange;
	
	  // ONNEGOTIATIONNEEDED (Chrome)
	  util.log('Listening for `negotiationneeded`');
	  pc.onnegotiationneeded = function() {
	    util.log('`negotiationneeded` triggered');
	    if (pc.signalingState == 'stable') {
	      Negotiator._makeOffer(connection);
	    } else {
	      util.log('onnegotiationneeded triggered when not stable. Is another connection being established?');
	    }
	  };
	
	  // DATACONNECTION.
	  util.log('Listening for data channel');
	  // Fired between offer and answer, so options should already be saved
	  // in the options hash.
	  pc.ondatachannel = function(evt) {
	    util.log('Received data channel');
	    var dc = evt.channel;
	    var connection = provider.getConnection(peerId, connectionId);
	    connection.initialize(dc);
	  };
	
	  // MEDIACONNECTION.
	  util.log('Listening for remote stream');
	  pc.onaddstream = function(evt) {
	    util.log('Received remote stream');
	    var stream = evt.stream;
	    var connection = provider.getConnection(peerId, connectionId);
	    // 10/10/2014: looks like in Chrome 38, onaddstream is triggered after
	    // setting the remote description. Our connection object in these cases
	    // is actually a DATA connection, so addStream fails.
	    // TODO: This is hopefully just a temporary fix. We should try to
	    // understand why this is happening.
	    if (connection.type === 'media') {
	      connection.addStream(stream);
	    }
	  };
	}
	
	Negotiator.cleanup = function(connection) {
	  util.log('Cleaning up PeerConnection to ' + connection.peer);
	
	  var pc = connection.pc;
	
	  if (!!pc && (pc.readyState !== 'closed' || pc.signalingState !== 'closed')) {
	    pc.close();
	    connection.pc = null;
	  }
	}
	
	Negotiator._makeOffer = function(connection) {
	  var pc = connection.pc;
	  pc.createOffer(function(offer) {
	    util.log('Created offer.');
	
	    if (!util.supports.sctp && connection.type === 'data' && connection.reliable) {
	      offer.sdp = Reliable.higherBandwidthSDP(offer.sdp);
	    }
	
	    pc.setLocalDescription(offer, function() {
	      util.log('Set localDescription: offer', 'for:', connection.peer);
	      connection.provider.socket.send({
	        type: 'OFFER',
	        payload: {
	          sdp: offer,
	          type: connection.type,
	          label: connection.label,
	          connectionId: connection.id,
	          reliable: connection.reliable,
	          serialization: connection.serialization,
	          metadata: connection.metadata,
	          browser: util.browser
	        },
	        dst: connection.peer
	      });
	    }, function(err) {
	      connection.provider.emitError('webrtc', err);
	      util.log('Failed to setLocalDescription, ', err);
	    });
	  }, function(err) {
	    connection.provider.emitError('webrtc', err);
	    util.log('Failed to createOffer, ', err);
	  }, connection.options.constraints);
	}
	
	Negotiator._makeAnswer = function(connection) {
	  var pc = connection.pc;
	
	  pc.createAnswer(function(answer) {
	    util.log('Created answer.');
	
	    if (!util.supports.sctp && connection.type === 'data' && connection.reliable) {
	      answer.sdp = Reliable.higherBandwidthSDP(answer.sdp);
	    }
	
	    pc.setLocalDescription(answer, function() {
	      util.log('Set localDescription: answer', 'for:', connection.peer);
	      connection.provider.socket.send({
	        type: 'ANSWER',
	        payload: {
	          sdp: answer,
	          type: connection.type,
	          connectionId: connection.id,
	          browser: util.browser
	        },
	        dst: connection.peer
	      });
	    }, function(err) {
	      connection.provider.emitError('webrtc', err);
	      util.log('Failed to setLocalDescription, ', err);
	    });
	  }, function(err) {
	    connection.provider.emitError('webrtc', err);
	    util.log('Failed to create answer, ', err);
	  });
	}
	
	/** Handle an SDP. */
	Negotiator.handleSDP = function(type, connection, sdp) {
	  sdp = new RTCSessionDescription(sdp);
	  var pc = connection.pc;
	
	  util.log('Setting remote description', sdp);
	  pc.setRemoteDescription(sdp, function() {
	    util.log('Set remoteDescription:', type, 'for:', connection.peer);
	
	    if (type === 'OFFER') {
	      Negotiator._makeAnswer(connection);
	    }
	  }, function(err) {
	    connection.provider.emitError('webrtc', err);
	    util.log('Failed to setRemoteDescription, ', err);
	  });
	}
	
	/** Handle a candidate. */
	Negotiator.handleCandidate = function(connection, ice) {
	  var candidate = ice.candidate;
	  var sdpMLineIndex = ice.sdpMLineIndex;
	  connection.pc.addIceCandidate(new RTCIceCandidate({
	    sdpMLineIndex: sdpMLineIndex,
	    candidate: candidate
	  }));
	  util.log('Added ICE candidate for:', connection.peer);
	}
	
	module.exports = Negotiator;


/***/ },
/* 20 */
/*!**********************************************************************************!*\
  !*** /Users/tim/code/webrtc-kademlia/~/peerjs/~/js-binarypack/lib/binarypack.js ***!
  \**********************************************************************************/
/***/ function(module, exports, __webpack_require__) {

	var BufferBuilder = __webpack_require__(/*! ./bufferbuilder */ 22).BufferBuilder;
	var binaryFeatures = __webpack_require__(/*! ./bufferbuilder */ 22).binaryFeatures;
	
	var BinaryPack = {
	  unpack: function(data){
	    var unpacker = new Unpacker(data);
	    return unpacker.unpack();
	  },
	  pack: function(data){
	    var packer = new Packer();
	    packer.pack(data);
	    var buffer = packer.getBuffer();
	    return buffer;
	  }
	};
	
	module.exports = BinaryPack;
	
	function Unpacker (data){
	  // Data is ArrayBuffer
	  this.index = 0;
	  this.dataBuffer = data;
	  this.dataView = new Uint8Array(this.dataBuffer);
	  this.length = this.dataBuffer.byteLength;
	}
	
	Unpacker.prototype.unpack = function(){
	  var type = this.unpack_uint8();
	  if (type < 0x80){
	    var positive_fixnum = type;
	    return positive_fixnum;
	  } else if ((type ^ 0xe0) < 0x20){
	    var negative_fixnum = (type ^ 0xe0) - 0x20;
	    return negative_fixnum;
	  }
	  var size;
	  if ((size = type ^ 0xa0) <= 0x0f){
	    return this.unpack_raw(size);
	  } else if ((size = type ^ 0xb0) <= 0x0f){
	    return this.unpack_string(size);
	  } else if ((size = type ^ 0x90) <= 0x0f){
	    return this.unpack_array(size);
	  } else if ((size = type ^ 0x80) <= 0x0f){
	    return this.unpack_map(size);
	  }
	  switch(type){
	    case 0xc0:
	      return null;
	    case 0xc1:
	      return undefined;
	    case 0xc2:
	      return false;
	    case 0xc3:
	      return true;
	    case 0xca:
	      return this.unpack_float();
	    case 0xcb:
	      return this.unpack_double();
	    case 0xcc:
	      return this.unpack_uint8();
	    case 0xcd:
	      return this.unpack_uint16();
	    case 0xce:
	      return this.unpack_uint32();
	    case 0xcf:
	      return this.unpack_uint64();
	    case 0xd0:
	      return this.unpack_int8();
	    case 0xd1:
	      return this.unpack_int16();
	    case 0xd2:
	      return this.unpack_int32();
	    case 0xd3:
	      return this.unpack_int64();
	    case 0xd4:
	      return undefined;
	    case 0xd5:
	      return undefined;
	    case 0xd6:
	      return undefined;
	    case 0xd7:
	      return undefined;
	    case 0xd8:
	      size = this.unpack_uint16();
	      return this.unpack_string(size);
	    case 0xd9:
	      size = this.unpack_uint32();
	      return this.unpack_string(size);
	    case 0xda:
	      size = this.unpack_uint16();
	      return this.unpack_raw(size);
	    case 0xdb:
	      size = this.unpack_uint32();
	      return this.unpack_raw(size);
	    case 0xdc:
	      size = this.unpack_uint16();
	      return this.unpack_array(size);
	    case 0xdd:
	      size = this.unpack_uint32();
	      return this.unpack_array(size);
	    case 0xde:
	      size = this.unpack_uint16();
	      return this.unpack_map(size);
	    case 0xdf:
	      size = this.unpack_uint32();
	      return this.unpack_map(size);
	  }
	}
	
	Unpacker.prototype.unpack_uint8 = function(){
	  var byte = this.dataView[this.index] & 0xff;
	  this.index++;
	  return byte;
	};
	
	Unpacker.prototype.unpack_uint16 = function(){
	  var bytes = this.read(2);
	  var uint16 =
	    ((bytes[0] & 0xff) * 256) + (bytes[1] & 0xff);
	  this.index += 2;
	  return uint16;
	}
	
	Unpacker.prototype.unpack_uint32 = function(){
	  var bytes = this.read(4);
	  var uint32 =
	     ((bytes[0]  * 256 +
	       bytes[1]) * 256 +
	       bytes[2]) * 256 +
	       bytes[3];
	  this.index += 4;
	  return uint32;
	}
	
	Unpacker.prototype.unpack_uint64 = function(){
	  var bytes = this.read(8);
	  var uint64 =
	   ((((((bytes[0]  * 256 +
	       bytes[1]) * 256 +
	       bytes[2]) * 256 +
	       bytes[3]) * 256 +
	       bytes[4]) * 256 +
	       bytes[5]) * 256 +
	       bytes[6]) * 256 +
	       bytes[7];
	  this.index += 8;
	  return uint64;
	}
	
	
	Unpacker.prototype.unpack_int8 = function(){
	  var uint8 = this.unpack_uint8();
	  return (uint8 < 0x80 ) ? uint8 : uint8 - (1 << 8);
	};
	
	Unpacker.prototype.unpack_int16 = function(){
	  var uint16 = this.unpack_uint16();
	  return (uint16 < 0x8000 ) ? uint16 : uint16 - (1 << 16);
	}
	
	Unpacker.prototype.unpack_int32 = function(){
	  var uint32 = this.unpack_uint32();
	  return (uint32 < Math.pow(2, 31) ) ? uint32 :
	    uint32 - Math.pow(2, 32);
	}
	
	Unpacker.prototype.unpack_int64 = function(){
	  var uint64 = this.unpack_uint64();
	  return (uint64 < Math.pow(2, 63) ) ? uint64 :
	    uint64 - Math.pow(2, 64);
	}
	
	Unpacker.prototype.unpack_raw = function(size){
	  if ( this.length < this.index + size){
	    throw new Error('BinaryPackFailure: index is out of range'
	      + ' ' + this.index + ' ' + size + ' ' + this.length);
	  }
	  var buf = this.dataBuffer.slice(this.index, this.index + size);
	  this.index += size;
	
	    //buf = util.bufferToString(buf);
	
	  return buf;
	}
	
	Unpacker.prototype.unpack_string = function(size){
	  var bytes = this.read(size);
	  var i = 0, str = '', c, code;
	  while(i < size){
	    c = bytes[i];
	    if ( c < 128){
	      str += String.fromCharCode(c);
	      i++;
	    } else if ((c ^ 0xc0) < 32){
	      code = ((c ^ 0xc0) << 6) | (bytes[i+1] & 63);
	      str += String.fromCharCode(code);
	      i += 2;
	    } else {
	      code = ((c & 15) << 12) | ((bytes[i+1] & 63) << 6) |
	        (bytes[i+2] & 63);
	      str += String.fromCharCode(code);
	      i += 3;
	    }
	  }
	  this.index += size;
	  return str;
	}
	
	Unpacker.prototype.unpack_array = function(size){
	  var objects = new Array(size);
	  for(var i = 0; i < size ; i++){
	    objects[i] = this.unpack();
	  }
	  return objects;
	}
	
	Unpacker.prototype.unpack_map = function(size){
	  var map = {};
	  for(var i = 0; i < size ; i++){
	    var key  = this.unpack();
	    var value = this.unpack();
	    map[key] = value;
	  }
	  return map;
	}
	
	Unpacker.prototype.unpack_float = function(){
	  var uint32 = this.unpack_uint32();
	  var sign = uint32 >> 31;
	  var exp  = ((uint32 >> 23) & 0xff) - 127;
	  var fraction = ( uint32 & 0x7fffff ) | 0x800000;
	  return (sign == 0 ? 1 : -1) *
	    fraction * Math.pow(2, exp - 23);
	}
	
	Unpacker.prototype.unpack_double = function(){
	  var h32 = this.unpack_uint32();
	  var l32 = this.unpack_uint32();
	  var sign = h32 >> 31;
	  var exp  = ((h32 >> 20) & 0x7ff) - 1023;
	  var hfrac = ( h32 & 0xfffff ) | 0x100000;
	  var frac = hfrac * Math.pow(2, exp - 20) +
	    l32   * Math.pow(2, exp - 52);
	  return (sign == 0 ? 1 : -1) * frac;
	}
	
	Unpacker.prototype.read = function(length){
	  var j = this.index;
	  if (j + length <= this.length) {
	    return this.dataView.subarray(j, j + length);
	  } else {
	    throw new Error('BinaryPackFailure: read index out of range');
	  }
	}
	
	function Packer(){
	  this.bufferBuilder = new BufferBuilder();
	}
	
	Packer.prototype.getBuffer = function(){
	  return this.bufferBuilder.getBuffer();
	}
	
	Packer.prototype.pack = function(value){
	  var type = typeof(value);
	  if (type == 'string'){
	    this.pack_string(value);
	  } else if (type == 'number'){
	    if (Math.floor(value) === value){
	      this.pack_integer(value);
	    } else{
	      this.pack_double(value);
	    }
	  } else if (type == 'boolean'){
	    if (value === true){
	      this.bufferBuilder.append(0xc3);
	    } else if (value === false){
	      this.bufferBuilder.append(0xc2);
	    }
	  } else if (type == 'undefined'){
	    this.bufferBuilder.append(0xc0);
	  } else if (type == 'object'){
	    if (value === null){
	      this.bufferBuilder.append(0xc0);
	    } else {
	      var constructor = value.constructor;
	      if (constructor == Array){
	        this.pack_array(value);
	      } else if (constructor == Blob || constructor == File) {
	        this.pack_bin(value);
	      } else if (constructor == ArrayBuffer) {
	        if(binaryFeatures.useArrayBufferView) {
	          this.pack_bin(new Uint8Array(value));
	        } else {
	          this.pack_bin(value);
	        }
	      } else if ('BYTES_PER_ELEMENT' in value){
	        if(binaryFeatures.useArrayBufferView) {
	          this.pack_bin(new Uint8Array(value.buffer));
	        } else {
	          this.pack_bin(value.buffer);
	        }
	      } else if (constructor == Object){
	        this.pack_object(value);
	      } else if (constructor == Date){
	        this.pack_string(value.toString());
	      } else if (typeof value.toBinaryPack == 'function'){
	        this.bufferBuilder.append(value.toBinaryPack());
	      } else {
	        throw new Error('Type "' + constructor.toString() + '" not yet supported');
	      }
	    }
	  } else {
	    throw new Error('Type "' + type + '" not yet supported');
	  }
	  this.bufferBuilder.flush();
	}
	
	
	Packer.prototype.pack_bin = function(blob){
	  var length = blob.length || blob.byteLength || blob.size;
	  if (length <= 0x0f){
	    this.pack_uint8(0xa0 + length);
	  } else if (length <= 0xffff){
	    this.bufferBuilder.append(0xda) ;
	    this.pack_uint16(length);
	  } else if (length <= 0xffffffff){
	    this.bufferBuilder.append(0xdb);
	    this.pack_uint32(length);
	  } else{
	    throw new Error('Invalid length');
	  }
	  this.bufferBuilder.append(blob);
	}
	
	Packer.prototype.pack_string = function(str){
	  var length = utf8Length(str);
	
	  if (length <= 0x0f){
	    this.pack_uint8(0xb0 + length);
	  } else if (length <= 0xffff){
	    this.bufferBuilder.append(0xd8) ;
	    this.pack_uint16(length);
	  } else if (length <= 0xffffffff){
	    this.bufferBuilder.append(0xd9);
	    this.pack_uint32(length);
	  } else{
	    throw new Error('Invalid length');
	  }
	  this.bufferBuilder.append(str);
	}
	
	Packer.prototype.pack_array = function(ary){
	  var length = ary.length;
	  if (length <= 0x0f){
	    this.pack_uint8(0x90 + length);
	  } else if (length <= 0xffff){
	    this.bufferBuilder.append(0xdc)
	    this.pack_uint16(length);
	  } else if (length <= 0xffffffff){
	    this.bufferBuilder.append(0xdd);
	    this.pack_uint32(length);
	  } else{
	    throw new Error('Invalid length');
	  }
	  for(var i = 0; i < length ; i++){
	    this.pack(ary[i]);
	  }
	}
	
	Packer.prototype.pack_integer = function(num){
	  if ( -0x20 <= num && num <= 0x7f){
	    this.bufferBuilder.append(num & 0xff);
	  } else if (0x00 <= num && num <= 0xff){
	    this.bufferBuilder.append(0xcc);
	    this.pack_uint8(num);
	  } else if (-0x80 <= num && num <= 0x7f){
	    this.bufferBuilder.append(0xd0);
	    this.pack_int8(num);
	  } else if ( 0x0000 <= num && num <= 0xffff){
	    this.bufferBuilder.append(0xcd);
	    this.pack_uint16(num);
	  } else if (-0x8000 <= num && num <= 0x7fff){
	    this.bufferBuilder.append(0xd1);
	    this.pack_int16(num);
	  } else if ( 0x00000000 <= num && num <= 0xffffffff){
	    this.bufferBuilder.append(0xce);
	    this.pack_uint32(num);
	  } else if (-0x80000000 <= num && num <= 0x7fffffff){
	    this.bufferBuilder.append(0xd2);
	    this.pack_int32(num);
	  } else if (-0x8000000000000000 <= num && num <= 0x7FFFFFFFFFFFFFFF){
	    this.bufferBuilder.append(0xd3);
	    this.pack_int64(num);
	  } else if (0x0000000000000000 <= num && num <= 0xFFFFFFFFFFFFFFFF){
	    this.bufferBuilder.append(0xcf);
	    this.pack_uint64(num);
	  } else{
	    throw new Error('Invalid integer');
	  }
	}
	
	Packer.prototype.pack_double = function(num){
	  var sign = 0;
	  if (num < 0){
	    sign = 1;
	    num = -num;
	  }
	  var exp  = Math.floor(Math.log(num) / Math.LN2);
	  var frac0 = num / Math.pow(2, exp) - 1;
	  var frac1 = Math.floor(frac0 * Math.pow(2, 52));
	  var b32   = Math.pow(2, 32);
	  var h32 = (sign << 31) | ((exp+1023) << 20) |
	      (frac1 / b32) & 0x0fffff;
	  var l32 = frac1 % b32;
	  this.bufferBuilder.append(0xcb);
	  this.pack_int32(h32);
	  this.pack_int32(l32);
	}
	
	Packer.prototype.pack_object = function(obj){
	  var keys = Object.keys(obj);
	  var length = keys.length;
	  if (length <= 0x0f){
	    this.pack_uint8(0x80 + length);
	  } else if (length <= 0xffff){
	    this.bufferBuilder.append(0xde);
	    this.pack_uint16(length);
	  } else if (length <= 0xffffffff){
	    this.bufferBuilder.append(0xdf);
	    this.pack_uint32(length);
	  } else{
	    throw new Error('Invalid length');
	  }
	  for(var prop in obj){
	    if (obj.hasOwnProperty(prop)){
	      this.pack(prop);
	      this.pack(obj[prop]);
	    }
	  }
	}
	
	Packer.prototype.pack_uint8 = function(num){
	  this.bufferBuilder.append(num);
	}
	
	Packer.prototype.pack_uint16 = function(num){
	  this.bufferBuilder.append(num >> 8);
	  this.bufferBuilder.append(num & 0xff);
	}
	
	Packer.prototype.pack_uint32 = function(num){
	  var n = num & 0xffffffff;
	  this.bufferBuilder.append((n & 0xff000000) >>> 24);
	  this.bufferBuilder.append((n & 0x00ff0000) >>> 16);
	  this.bufferBuilder.append((n & 0x0000ff00) >>>  8);
	  this.bufferBuilder.append((n & 0x000000ff));
	}
	
	Packer.prototype.pack_uint64 = function(num){
	  var high = num / Math.pow(2, 32);
	  var low  = num % Math.pow(2, 32);
	  this.bufferBuilder.append((high & 0xff000000) >>> 24);
	  this.bufferBuilder.append((high & 0x00ff0000) >>> 16);
	  this.bufferBuilder.append((high & 0x0000ff00) >>>  8);
	  this.bufferBuilder.append((high & 0x000000ff));
	  this.bufferBuilder.append((low  & 0xff000000) >>> 24);
	  this.bufferBuilder.append((low  & 0x00ff0000) >>> 16);
	  this.bufferBuilder.append((low  & 0x0000ff00) >>>  8);
	  this.bufferBuilder.append((low  & 0x000000ff));
	}
	
	Packer.prototype.pack_int8 = function(num){
	  this.bufferBuilder.append(num & 0xff);
	}
	
	Packer.prototype.pack_int16 = function(num){
	  this.bufferBuilder.append((num & 0xff00) >> 8);
	  this.bufferBuilder.append(num & 0xff);
	}
	
	Packer.prototype.pack_int32 = function(num){
	  this.bufferBuilder.append((num >>> 24) & 0xff);
	  this.bufferBuilder.append((num & 0x00ff0000) >>> 16);
	  this.bufferBuilder.append((num & 0x0000ff00) >>> 8);
	  this.bufferBuilder.append((num & 0x000000ff));
	}
	
	Packer.prototype.pack_int64 = function(num){
	  var high = Math.floor(num / Math.pow(2, 32));
	  var low  = num % Math.pow(2, 32);
	  this.bufferBuilder.append((high & 0xff000000) >>> 24);
	  this.bufferBuilder.append((high & 0x00ff0000) >>> 16);
	  this.bufferBuilder.append((high & 0x0000ff00) >>>  8);
	  this.bufferBuilder.append((high & 0x000000ff));
	  this.bufferBuilder.append((low  & 0xff000000) >>> 24);
	  this.bufferBuilder.append((low  & 0x00ff0000) >>> 16);
	  this.bufferBuilder.append((low  & 0x0000ff00) >>>  8);
	  this.bufferBuilder.append((low  & 0x000000ff));
	}
	
	function _utf8Replace(m){
	  var code = m.charCodeAt(0);
	
	  if(code <= 0x7ff) return '00';
	  if(code <= 0xffff) return '000';
	  if(code <= 0x1fffff) return '0000';
	  if(code <= 0x3ffffff) return '00000';
	  return '000000';
	}
	
	function utf8Length(str){
	  if (str.length > 600) {
	    // Blob method faster for large strings
	    return (new Blob([str])).size;
	  } else {
	    return str.replace(/[^\u0000-\u007F]/g, _utf8Replace).length;
	  }
	}


/***/ },
/* 21 */
/*!***************************************************************************!*\
  !*** /Users/tim/code/webrtc-kademlia/~/peerjs/~/reliable/lib/reliable.js ***!
  \***************************************************************************/
/***/ function(module, exports, __webpack_require__) {

	var util = __webpack_require__(/*! ./util */ 23);
	
	/**
	 * Reliable transfer for Chrome Canary DataChannel impl.
	 * Author: @michellebu
	 */
	function Reliable(dc, debug) {
	  if (!(this instanceof Reliable)) return new Reliable(dc);
	  this._dc = dc;
	
	  util.debug = debug;
	
	  // Messages sent/received so far.
	  // id: { ack: n, chunks: [...] }
	  this._outgoing = {};
	  // id: { ack: ['ack', id, n], chunks: [...] }
	  this._incoming = {};
	  this._received = {};
	
	  // Window size.
	  this._window = 1000;
	  // MTU.
	  this._mtu = 500;
	  // Interval for setInterval. In ms.
	  this._interval = 0;
	
	  // Messages sent.
	  this._count = 0;
	
	  // Outgoing message queue.
	  this._queue = [];
	
	  this._setupDC();
	};
	
	// Send a message reliably.
	Reliable.prototype.send = function(msg) {
	  // Determine if chunking is necessary.
	  var bl = util.pack(msg);
	  if (bl.size < this._mtu) {
	    this._handleSend(['no', bl]);
	    return;
	  }
	
	  this._outgoing[this._count] = {
	    ack: 0,
	    chunks: this._chunk(bl)
	  };
	
	  if (util.debug) {
	    this._outgoing[this._count].timer = new Date();
	  }
	
	  // Send prelim window.
	  this._sendWindowedChunks(this._count);
	  this._count += 1;
	};
	
	// Set up interval for processing queue.
	Reliable.prototype._setupInterval = function() {
	  // TODO: fail gracefully.
	
	  var self = this;
	  this._timeout = setInterval(function() {
	    // FIXME: String stuff makes things terribly async.
	    var msg = self._queue.shift();
	    if (msg._multiple) {
	      for (var i = 0, ii = msg.length; i < ii; i += 1) {
	        self._intervalSend(msg[i]);
	      }
	    } else {
	      self._intervalSend(msg);
	    }
	  }, this._interval);
	};
	
	Reliable.prototype._intervalSend = function(msg) {
	  var self = this;
	  msg = util.pack(msg);
	  util.blobToBinaryString(msg, function(str) {
	    self._dc.send(str);
	  });
	  if (self._queue.length === 0) {
	    clearTimeout(self._timeout);
	    self._timeout = null;
	    //self._processAcks();
	  }
	};
	
	// Go through ACKs to send missing pieces.
	Reliable.prototype._processAcks = function() {
	  for (var id in this._outgoing) {
	    if (this._outgoing.hasOwnProperty(id)) {
	      this._sendWindowedChunks(id);
	    }
	  }
	};
	
	// Handle sending a message.
	// FIXME: Don't wait for interval time for all messages...
	Reliable.prototype._handleSend = function(msg) {
	  var push = true;
	  for (var i = 0, ii = this._queue.length; i < ii; i += 1) {
	    var item = this._queue[i];
	    if (item === msg) {
	      push = false;
	    } else if (item._multiple && item.indexOf(msg) !== -1) {
	      push = false;
	    }
	  }
	  if (push) {
	    this._queue.push(msg);
	    if (!this._timeout) {
	      this._setupInterval();
	    }
	  }
	};
	
	// Set up DataChannel handlers.
	Reliable.prototype._setupDC = function() {
	  // Handle various message types.
	  var self = this;
	  this._dc.onmessage = function(e) {
	    var msg = e.data;
	    var datatype = msg.constructor;
	    // FIXME: msg is String until binary is supported.
	    // Once that happens, this will have to be smarter.
	    if (datatype === String) {
	      var ab = util.binaryStringToArrayBuffer(msg);
	      msg = util.unpack(ab);
	      self._handleMessage(msg);
	    }
	  };
	};
	
	// Handles an incoming message.
	Reliable.prototype._handleMessage = function(msg) {
	  var id = msg[1];
	  var idata = this._incoming[id];
	  var odata = this._outgoing[id];
	  var data;
	  switch (msg[0]) {
	    // No chunking was done.
	    case 'no':
	      var message = id;
	      if (!!message) {
	        this.onmessage(util.unpack(message));
	      }
	      break;
	    // Reached the end of the message.
	    case 'end':
	      data = idata;
	
	      // In case end comes first.
	      this._received[id] = msg[2];
	
	      if (!data) {
	        break;
	      }
	
	      this._ack(id);
	      break;
	    case 'ack':
	      data = odata;
	      if (!!data) {
	        var ack = msg[2];
	        // Take the larger ACK, for out of order messages.
	        data.ack = Math.max(ack, data.ack);
	
	        // Clean up when all chunks are ACKed.
	        if (data.ack >= data.chunks.length) {
	          util.log('Time: ', new Date() - data.timer);
	          delete this._outgoing[id];
	        } else {
	          this._processAcks();
	        }
	      }
	      // If !data, just ignore.
	      break;
	    // Received a chunk of data.
	    case 'chunk':
	      // Create a new entry if none exists.
	      data = idata;
	      if (!data) {
	        var end = this._received[id];
	        if (end === true) {
	          break;
	        }
	        data = {
	          ack: ['ack', id, 0],
	          chunks: []
	        };
	        this._incoming[id] = data;
	      }
	
	      var n = msg[2];
	      var chunk = msg[3];
	      data.chunks[n] = new Uint8Array(chunk);
	
	      // If we get the chunk we're looking for, ACK for next missing.
	      // Otherwise, ACK the same N again.
	      if (n === data.ack[2]) {
	        this._calculateNextAck(id);
	      }
	      this._ack(id);
	      break;
	    default:
	      // Shouldn't happen, but would make sense for message to just go
	      // through as is.
	      this._handleSend(msg);
	      break;
	  }
	};
	
	// Chunks BL into smaller messages.
	Reliable.prototype._chunk = function(bl) {
	  var chunks = [];
	  var size = bl.size;
	  var start = 0;
	  while (start < size) {
	    var end = Math.min(size, start + this._mtu);
	    var b = bl.slice(start, end);
	    var chunk = {
	      payload: b
	    }
	    chunks.push(chunk);
	    start = end;
	  }
	  util.log('Created', chunks.length, 'chunks.');
	  return chunks;
	};
	
	// Sends ACK N, expecting Nth blob chunk for message ID.
	Reliable.prototype._ack = function(id) {
	  var ack = this._incoming[id].ack;
	
	  // if ack is the end value, then call _complete.
	  if (this._received[id] === ack[2]) {
	    this._complete(id);
	    this._received[id] = true;
	  }
	
	  this._handleSend(ack);
	};
	
	// Calculates the next ACK number, given chunks.
	Reliable.prototype._calculateNextAck = function(id) {
	  var data = this._incoming[id];
	  var chunks = data.chunks;
	  for (var i = 0, ii = chunks.length; i < ii; i += 1) {
	    // This chunk is missing!!! Better ACK for it.
	    if (chunks[i] === undefined) {
	      data.ack[2] = i;
	      return;
	    }
	  }
	  data.ack[2] = chunks.length;
	};
	
	// Sends the next window of chunks.
	Reliable.prototype._sendWindowedChunks = function(id) {
	  util.log('sendWindowedChunks for: ', id);
	  var data = this._outgoing[id];
	  var ch = data.chunks;
	  var chunks = [];
	  var limit = Math.min(data.ack + this._window, ch.length);
	  for (var i = data.ack; i < limit; i += 1) {
	    if (!ch[i].sent || i === data.ack) {
	      ch[i].sent = true;
	      chunks.push(['chunk', id, i, ch[i].payload]);
	    }
	  }
	  if (data.ack + this._window >= ch.length) {
	    chunks.push(['end', id, ch.length])
	  }
	  chunks._multiple = true;
	  this._handleSend(chunks);
	};
	
	// Puts together a message from chunks.
	Reliable.prototype._complete = function(id) {
	  util.log('Completed called for', id);
	  var self = this;
	  var chunks = this._incoming[id].chunks;
	  var bl = new Blob(chunks);
	  util.blobToArrayBuffer(bl, function(ab) {
	    self.onmessage(util.unpack(ab));
	  });
	  delete this._incoming[id];
	};
	
	// Ups bandwidth limit on SDP. Meant to be called during offer/answer.
	Reliable.higherBandwidthSDP = function(sdp) {
	  // AS stands for Application-Specific Maximum.
	  // Bandwidth number is in kilobits / sec.
	  // See RFC for more info: http://www.ietf.org/rfc/rfc2327.txt
	
	  // Chrome 31+ doesn't want us munging the SDP, so we'll let them have their
	  // way.
	  var version = navigator.appVersion.match(/Chrome\/(.*?) /);
	  if (version) {
	    version = parseInt(version[1].split('.').shift());
	    if (version < 31) {
	      var parts = sdp.split('b=AS:30');
	      var replace = 'b=AS:102400'; // 100 Mbps
	      if (parts.length > 1) {
	        return parts[0] + replace + parts[1];
	      }
	    }
	  }
	
	  return sdp;
	};
	
	// Overwritten, typically.
	Reliable.prototype.onmessage = function(msg) {};
	
	module.exports.Reliable = Reliable;


/***/ },
/* 22 */
/*!*************************************************************************************!*\
  !*** /Users/tim/code/webrtc-kademlia/~/peerjs/~/js-binarypack/lib/bufferbuilder.js ***!
  \*************************************************************************************/
/***/ function(module, exports, __webpack_require__) {

	var binaryFeatures = {};
	binaryFeatures.useBlobBuilder = (function(){
	  try {
	    new Blob([]);
	    return false;
	  } catch (e) {
	    return true;
	  }
	})();
	
	binaryFeatures.useArrayBufferView = !binaryFeatures.useBlobBuilder && (function(){
	  try {
	    return (new Blob([new Uint8Array([])])).size === 0;
	  } catch (e) {
	    return true;
	  }
	})();
	
	module.exports.binaryFeatures = binaryFeatures;
	var BlobBuilder = module.exports.BlobBuilder;
	if (typeof window != 'undefined') {
	  BlobBuilder = module.exports.BlobBuilder = window.WebKitBlobBuilder ||
	    window.MozBlobBuilder || window.MSBlobBuilder || window.BlobBuilder;
	}
	
	function BufferBuilder(){
	  this._pieces = [];
	  this._parts = [];
	}
	
	BufferBuilder.prototype.append = function(data) {
	  if(typeof data === 'number') {
	    this._pieces.push(data);
	  } else {
	    this.flush();
	    this._parts.push(data);
	  }
	};
	
	BufferBuilder.prototype.flush = function() {
	  if (this._pieces.length > 0) {
	    var buf = new Uint8Array(this._pieces);
	    if(!binaryFeatures.useArrayBufferView) {
	      buf = buf.buffer;
	    }
	    this._parts.push(buf);
	    this._pieces = [];
	  }
	};
	
	BufferBuilder.prototype.getBuffer = function() {
	  this.flush();
	  if(binaryFeatures.useBlobBuilder) {
	    var builder = new BlobBuilder();
	    for(var i = 0, ii = this._parts.length; i < ii; i++) {
	      builder.append(this._parts[i]);
	    }
	    return builder.getBlob();
	  } else {
	    return new Blob(this._parts);
	  }
	};
	
	module.exports.BufferBuilder = BufferBuilder;


/***/ },
/* 23 */
/*!***********************************************************************!*\
  !*** /Users/tim/code/webrtc-kademlia/~/peerjs/~/reliable/lib/util.js ***!
  \***********************************************************************/
/***/ function(module, exports, __webpack_require__) {

	var BinaryPack = __webpack_require__(/*! js-binarypack */ 20);
	
	var util = {
	  debug: false,
	  
	  inherits: function(ctor, superCtor) {
	    ctor.super_ = superCtor;
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  },
	  extend: function(dest, source) {
	    for(var key in source) {
	      if(source.hasOwnProperty(key)) {
	        dest[key] = source[key];
	      }
	    }
	    return dest;
	  },
	  pack: BinaryPack.pack,
	  unpack: BinaryPack.unpack,
	  
	  log: function () {
	    if (util.debug) {
	      var copy = [];
	      for (var i = 0; i < arguments.length; i++) {
	        copy[i] = arguments[i];
	      }
	      copy.unshift('Reliable: ');
	      console.log.apply(console, copy);
	    }
	  },
	
	  setZeroTimeout: (function(global) {
	    var timeouts = [];
	    var messageName = 'zero-timeout-message';
	
	    // Like setTimeout, but only takes a function argument.	 There's
	    // no time argument (always zero) and no arguments (you have to
	    // use a closure).
	    function setZeroTimeoutPostMessage(fn) {
	      timeouts.push(fn);
	      global.postMessage(messageName, '*');
	    }		
	
	    function handleMessage(event) {
	      if (event.source == global && event.data == messageName) {
	        if (event.stopPropagation) {
	          event.stopPropagation();
	        }
	        if (timeouts.length) {
	          timeouts.shift()();
	        }
	      }
	    }
	    if (global.addEventListener) {
	      global.addEventListener('message', handleMessage, true);
	    } else if (global.attachEvent) {
	      global.attachEvent('onmessage', handleMessage);
	    }
	    return setZeroTimeoutPostMessage;
	  }(this)),
	  
	  blobToArrayBuffer: function(blob, cb){
	    var fr = new FileReader();
	    fr.onload = function(evt) {
	      cb(evt.target.result);
	    };
	    fr.readAsArrayBuffer(blob);
	  },
	  blobToBinaryString: function(blob, cb){
	    var fr = new FileReader();
	    fr.onload = function(evt) {
	      cb(evt.target.result);
	    };
	    fr.readAsBinaryString(blob);
	  },
	  binaryStringToArrayBuffer: function(binary) {
	    var byteArray = new Uint8Array(binary.length);
	    for (var i = 0; i < binary.length; i++) {
	      byteArray[i] = binary.charCodeAt(i) & 0xff;
	    }
	    return byteArray.buffer;
	  },
	  randomToken: function () {
	    return Math.random().toString(36).substr(2);
	  }
	};
	
	module.exports = util;


/***/ },
/* 24 */
/*!**********************!*\
  !*** ./Transport.js ***!
  \**********************/
/***/ function(module, exports, __webpack_require__) {

	var Peer = __webpack_require__(/*! peerjs */ 11);
	var constants = __webpack_require__(/*! ./constants */ 5);
	var EventEmitter = __webpack_require__(/*! eventemitter3 */ 25);
	
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

/***/ },
/* 25 */
/*!****************************************************************!*\
  !*** /Users/tim/code/webrtc-kademlia/~/eventemitter3/index.js ***!
  \****************************************************************/
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	//
	// We store our EE objects in a plain object whose properties are event names.
	// If `Object.create(null)` is not supported we prefix the event names with a
	// `~` to make sure that the built-in object properties are not overridden or
	// used as an attack vector.
	// We also assume that `Object.create(null)` is available when the event name
	// is an ES6 Symbol.
	//
	var prefix = typeof Object.create !== 'function' ? '~' : false;
	
	/**
	 * Representation of a single EventEmitter function.
	 *
	 * @param {Function} fn Event handler to be called.
	 * @param {Mixed} context Context for function execution.
	 * @param {Boolean} once Only emit once
	 * @api private
	 */
	function EE(fn, context, once) {
	  this.fn = fn;
	  this.context = context;
	  this.once = once || false;
	}
	
	/**
	 * Minimal EventEmitter interface that is molded against the Node.js
	 * EventEmitter interface.
	 *
	 * @constructor
	 * @api public
	 */
	function EventEmitter() { /* Nothing to set */ }
	
	/**
	 * Holds the assigned EventEmitters by name.
	 *
	 * @type {Object}
	 * @private
	 */
	EventEmitter.prototype._events = undefined;
	
	/**
	 * Return a list of assigned event listeners.
	 *
	 * @param {String} event The events that should be listed.
	 * @param {Boolean} exists We only need to know if there are listeners.
	 * @returns {Array|Boolean}
	 * @api public
	 */
	EventEmitter.prototype.listeners = function listeners(event, exists) {
	  var evt = prefix ? prefix + event : event
	    , available = this._events && this._events[evt];
	
	  if (exists) return !!available;
	  if (!available) return [];
	  if (available.fn) return [available.fn];
	
	  for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
	    ee[i] = available[i].fn;
	  }
	
	  return ee;
	};
	
	/**
	 * Emit an event to all registered event listeners.
	 *
	 * @param {String} event The name of the event.
	 * @returns {Boolean} Indication if we've emitted an event.
	 * @api public
	 */
	EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
	  var evt = prefix ? prefix + event : event;
	
	  if (!this._events || !this._events[evt]) return false;
	
	  var listeners = this._events[evt]
	    , len = arguments.length
	    , args
	    , i;
	
	  if ('function' === typeof listeners.fn) {
	    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);
	
	    switch (len) {
	      case 1: return listeners.fn.call(listeners.context), true;
	      case 2: return listeners.fn.call(listeners.context, a1), true;
	      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
	      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
	      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
	      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
	    }
	
	    for (i = 1, args = new Array(len -1); i < len; i++) {
	      args[i - 1] = arguments[i];
	    }
	
	    listeners.fn.apply(listeners.context, args);
	  } else {
	    var length = listeners.length
	      , j;
	
	    for (i = 0; i < length; i++) {
	      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);
	
	      switch (len) {
	        case 1: listeners[i].fn.call(listeners[i].context); break;
	        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
	        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
	        default:
	          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
	            args[j - 1] = arguments[j];
	          }
	
	          listeners[i].fn.apply(listeners[i].context, args);
	      }
	    }
	  }
	
	  return true;
	};
	
	/**
	 * Register a new EventListener for the given event.
	 *
	 * @param {String} event Name of the event.
	 * @param {Functon} fn Callback function.
	 * @param {Mixed} context The context of the function.
	 * @api public
	 */
	EventEmitter.prototype.on = function on(event, fn, context) {
	  var listener = new EE(fn, context || this)
	    , evt = prefix ? prefix + event : event;
	
	  if (!this._events) this._events = prefix ? {} : Object.create(null);
	  if (!this._events[evt]) this._events[evt] = listener;
	  else {
	    if (!this._events[evt].fn) this._events[evt].push(listener);
	    else this._events[evt] = [
	      this._events[evt], listener
	    ];
	  }
	
	  return this;
	};
	
	/**
	 * Add an EventListener that's only called once.
	 *
	 * @param {String} event Name of the event.
	 * @param {Function} fn Callback function.
	 * @param {Mixed} context The context of the function.
	 * @api public
	 */
	EventEmitter.prototype.once = function once(event, fn, context) {
	  var listener = new EE(fn, context || this, true)
	    , evt = prefix ? prefix + event : event;
	
	  if (!this._events) this._events = prefix ? {} : Object.create(null);
	  if (!this._events[evt]) this._events[evt] = listener;
	  else {
	    if (!this._events[evt].fn) this._events[evt].push(listener);
	    else this._events[evt] = [
	      this._events[evt], listener
	    ];
	  }
	
	  return this;
	};
	
	/**
	 * Remove event listeners.
	 *
	 * @param {String} event The event we want to remove.
	 * @param {Function} fn The listener that we need to find.
	 * @param {Mixed} context Only remove listeners matching this context.
	 * @param {Boolean} once Only remove once listeners.
	 * @api public
	 */
	EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
	  var evt = prefix ? prefix + event : event;
	
	  if (!this._events || !this._events[evt]) return this;
	
	  var listeners = this._events[evt]
	    , events = [];
	
	  if (fn) {
	    if (listeners.fn) {
	      if (
	           listeners.fn !== fn
	        || (once && !listeners.once)
	        || (context && listeners.context !== context)
	      ) {
	        events.push(listeners);
	      }
	    } else {
	      for (var i = 0, length = listeners.length; i < length; i++) {
	        if (
	             listeners[i].fn !== fn
	          || (once && !listeners[i].once)
	          || (context && listeners[i].context !== context)
	        ) {
	          events.push(listeners[i]);
	        }
	      }
	    }
	  }
	
	  //
	  // Reset the array, or remove it completely if we have no more listeners.
	  //
	  if (events.length) {
	    this._events[evt] = events.length === 1 ? events[0] : events;
	  } else {
	    delete this._events[evt];
	  }
	
	  return this;
	};
	
	/**
	 * Remove all listeners or only the listeners for the specified event.
	 *
	 * @param {String} event The event want to remove all listeners for.
	 * @api public
	 */
	EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
	  if (!this._events) return this;
	
	  if (event) delete this._events[prefix ? prefix + event : event];
	  else this._events = prefix ? {} : Object.create(null);
	
	  return this;
	};
	
	//
	// Alias methods names because people roll like that.
	//
	EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
	EventEmitter.prototype.addListener = EventEmitter.prototype.on;
	
	//
	// This function doesn't apply anymore.
	//
	EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
	  return this;
	};
	
	//
	// Expose the prefix.
	//
	EventEmitter.prefixed = prefix;
	
	//
	// Expose the module.
	//
	if (true) {
	  module.exports = EventEmitter;
	}


/***/ }
/******/ ])
//# sourceMappingURL=build.js.map