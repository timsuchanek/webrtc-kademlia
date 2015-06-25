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

var distance = function(a, b) {
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
var sortByDistance = function(array, id, desc) {
  var sorting = !!desc;
  if (sorting) {
    return array.sort(function(a, b) {
      return distance(b, id) - distance(a, id);
    });
  } else {
    return array.sort(function(a, b) {
      return distance(a, id) - distance(b, id);
    });
  }
}

var commonPrefix = function(idB64, binaryPrefix) {
  var idBin = b64ToBinary(idB64);
  return idBin.commonPrefix(binaryPrefix);
}

var getRandomID = function(bits) {
  return binaryToB64(getRandomBinarySequence(bits))
}

/**
 * Return if the binary string `a` is greater than `b`
 * @param  {String} a
 * @param  {String} b
 */
var greaterThan = function(a, b) {
  return a.greaterThan(b);
}

var lowerThan = function(a, b) {
  return a.lowerThan(b);
}


/**
 * Binary API
 */

module.exports.distance = distance;
module.exports.commonPrefix = commonPrefix;
module.exports.getRandomBinarySequence = getRandomBinarySequence;
module.exports.greaterThan = greaterThan;
module.exports.lowerThan = lowerThan;

/**
 * B64 API
 */

module.exports.binaryToB64 = binaryToB64;
module.exports.b64ToBinary = b64ToBinary;

module.exports.sortByDistance = sortByDistance;

module.exports.getRandomID = getRandomID;