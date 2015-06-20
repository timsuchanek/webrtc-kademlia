var Kademlia = require('./Kademlia');
var Q = require('Q');


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
