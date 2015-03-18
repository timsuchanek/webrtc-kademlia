var xor = require('./xor');
var util = require('./util');


function KBucket(k, prefix, kademlia, routingTable) {
  this._list = [];
  this.k = k;
  this.prefix = prefix;
  this.kademlia = kademlia;
  this.routingTable = routingTable;
}

KBucket.prototype.update = function(id, online) {
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