var Storage   = require('./Storage');
var KRequester = require('./KRequester');
var KResponder = require('./KResponder');
var Transport  = require('transportjs');
var Q = require('Q');
var util = require('./util');
var MyID = require('./MyID');
var constants = require('./constants');
var RoutingTable = require('./RoutingTable');

var _getBootstrapPeers = function() {
  return new Q.Promise(function(resolve, reject) {
    this.transport.bootstrap(function(peers) {
      peers = peers.filter(function(peer) {
        return peer !== null;
      });

      // console.log('boooot', peers);
      resolve(peers);
    }, this);
  }.bind(this));
}

var _removeOwnId = function(ids) {
  if (ids && Array.isArray(ids) && ids.length > 0) {
    var index = ids.indexOf(this.myRandomId);
    var arrayClone = ids.slice();

    if (index !== -1) {
      return arrayClone.splice(index, 1);
    }

    return ids;
  }

  return [];
}

function Kademlia(id) {
  this.myID         = id || MyID;
  this.storage      = new Storage(this.myID);
  this.routingTable = new RoutingTable(this.myID, this.storage);
  this.transport    = new Transport(this.myID);

  this.requester    = new KRequester(this.myID, this.transport, this.routingTable);
  this.responder    = new KResponder(this.myID, this.transport, this.routingTable, this.storage);

  this.routingTable.setKademlia(this.requester);
}



/**
 * Join the DHT Network.
 * @return {Promise}
 */
Kademlia.prototype.join = function() {

  return new Q.Promise(function(resolve, reject) {

    _getBootstrapPeers.call(this)
    .then(function success(peers) {
      bootstrapPeers = peers;
      // console.log('yi');
      peers = _removeOwnId.call(this, peers);

      // Insert the first peers
      this.routingTable.insertNodes(peers);

      // Get to know the neighbourhood with doing a node lookup
      // with the own id
      this.requester.NODE_LOOKUP(this.myID)
      .then(function success(results) {
        // console.log('yö');
        resolve(results);
      }, function error(err) {
        reject(err);
      });

    }.bind(this), function fail(err) {
      reject({msg: 'Error, couldnt join network', error: err});
    });


  }.bind(this));
}

Kademlia.prototype.put = function(key, value) {

  // FOR TESTING, we don't store at our own address (would be boring to test)
  // this.storage.put(key, value, true)
  // .then(function() {
  //   // log
  // }, function() {
  //   // log
  // });

  return new Q.Promise(function(resolveStore, rejectStore) {

    this.requester.NODE_LOOKUP(key, false, true)
    .then(function(results) {
      var ids = results.nodes;

      var promises = ids.map(function(id) {
        return this.requester.STORE(id, key, value);
      }, this);

      if (promises.length > 0) {
        Q.allSettled(promises)
        .then(function(results) {

          // console.log('all settled');

          resolveStore(results);
        }.bind(this), function(err) {
          rejectGet(err);
        }.bind(this));
      }


    }.bind(this), function(err) {
      rejectStore(err);
    }.bind(this));
  }.bind(this));
}

Kademlia.prototype.get = function(key) {
  return this.storage.get(key)
  .then(function(value) {

    // console.log('VALUE', value);

    return new Q.Promise(function(resolve, reject) {

      if (!value) {

        this.requester.VALUE_LOOKUP(key)
        .then(function success(res) {
          console.log('oben');
          var nodes             = res.nodes
            , value             = res.value;

          this.storage.put(key, value);

          resolve(value);
        }, function fail(err) {
          reject(err);
        });
      } else {
        resolve(value);
      }

    }.bind(this));

  }.bind(this), function(err) {
    reject(err);
  });


}


module.exports = Kademlia;