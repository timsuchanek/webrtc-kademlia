var util = require('./util');

var k = 8;
var a = [];
var b = [];

for (var i = 0; i < k; i++) {
	a.push(util.getRandomID());
	b.push(util.getRandomID());
}

var key = util.getRandomID();
console.log('abefore', a);
console.log(util.sortByDistance(a, key));
console.log('a', a);
console.log('bbefore', b);
var merged = util.mergeKNearest(key, a, b);

console.log('key');
console.log('a', a);
console.log('b', b);
console.log('merged', merged);