var Transport = require('./Transport');
var RoutingTable = require('./RoutingTable');
var xor = require('./xor');
var Storage = require('./Storage');
var constants = require('./constants');
var util = require('./util');
var Q = require('q');

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