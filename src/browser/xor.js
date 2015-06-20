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