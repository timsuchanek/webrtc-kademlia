var $logWindow = document.querySelector('.console .content');
var xor = require('./xor');
var constants = require('./constants');

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