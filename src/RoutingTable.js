var KBucket = require('./KBucket');
var constants = require('./constants');
var util = require('./util');


function _findBucket(id) {

  if (this.buckets && this.buckets.hasOwnProperty('-1')) {

    // the easiest case

    return this.buckets['-1'];

  } else {

    // search for bucket with longest common prefix
    // sort descending and take the first element
    var bestFittingBucket =
      Object.keys(this.buckets).sort(function(a, b) {
        return util.commonPrefix(id, b) - util.commonPrefix(id, a);
      })[0];

    return this.buckets[bestFittingBucket];
  }

}


function _splitBucket(bucket) {

  var prefix = util.commonPrefix(this.myID, bucket.prefix);

  // TODO: detect special case in blue ...
  if (prefix.length === bucket.prefix.length) {
    if (Object.keys(this.buckets).length < constants.HASH_SPACE) {
      var nodes = bucket.getNodes();
      var prefix = bucket.getPrefix();
      delete this.buckets[prefix.length > 0 ? prefix : '-1'];
      this.buckets[prefix + '0'] = new KBucket(this.k, prefix + '0', this.kademlia, this);
      this.buckets[prefix + '1'] = new KBucket(this.k, prefix + '1', this.kademlia, this);
      this.insertNodes(nodes);
      return true;
    }
  }

  return false;

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
  var storage = this.storage;

  var nearKeys = storage.getSimiliarKeys(node, function(keys) {
    keys = Array.isArray(keys) ? keys : [];

    keys.filter(function(key) {

      var nodesDistance = util.distance(node, key);
      // look, if there ARENT exactly K better nodes (better means nearer at the key)
      var betterNodes = this.getKNearest(constants.K, key).filter(function(id) {
        return util.lowerThan(util.distance(id, key), nodesDistance);
      });

      // if there aren't k better nodes, `node` has the responsibility to save the content
      if (betterNodes.length < constants.K) {

        storage.get(key)
        .then(function(value) {
          value = value || null;
          if (value !== null) {

            this.kademlia.STORE(node, key, value)
            .then(function success() {
              // nice
              // log
              // console.log('Could save ' + key + ' to ' + node);
            }, function failure() {
              // log
              // console.log('COULDNT save ' + key + ' to ' + node);
            });

          }
        });

      }
    }, this);

  }, this);

}



function RoutingTable(myID, storage) {

  // Initialize with the first bucket on stage -1
  // this bucket starts to split when it's full

  this.k        = constants.K;
  this.myID     = myID;
  this.storage  = storage;
  this.kademlia = null;
  this.buckets  = {};

}

RoutingTable.prototype.setKademlia = function(kademlia) {
  this.kademlia = kademlia;

  if (Object.keys(this.buckets).length === 0) {
    this.buckets = {
      '-1':  new KBucket(this.k, '', this.kademlia, this)
    };
  }

}

RoutingTable.prototype.insertNode = function(id, online) {

  // is the ID our own ID?

  if (id === this.myID) {
    // console.log('SAW OWN ID');
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


    var ownBucket = _findBucket.call(this, this.myID);

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

      // util.drawRoutingTable(this);
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
      return util.commonPrefix(id, b) - util.commonPrefix(id, a);
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