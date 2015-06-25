var Kademlia = require('../../src/Kademlia');

var kademlia = new Kademlia('GVfDvq2zDA8iMNsTudN19TTjr59');

kademlia.join()
.then(function() {
	console.log('yeay');
}, function(errr) {
	console.log('not :/', errr);
});