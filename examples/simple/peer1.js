var Kademlia = require('../../src/Kademlia');

var kademlia = new Kademlia('H76xxR_Cv3V4ZfudykmK1mDA-kx');

kademlia.join()
.then(function success(res) {
	console.log('Successfully joined the network');



	kademlia.put('GCEPadpr4y3uHt9sehf9xbRHD_C', 'Deine MUDUUDUDUDUDUAAAAA')
	.then(function success() {
		console.log('YEESSS, store worked');
	}, function fail(err) {
		console.log('storing is not my thing :/', err.stack);
	});

	kademlia.get('GCEPadpr4y3uHt9sehf9xbRHD_C')
	.then(function success(value) {
		console.log('OMG, got the DAMN value', value);
	}, function fail(err) {
		console.log('nooot', err);
	});

}, function fail(err) {
	console.log('Oopsy. couldnt join the network :/', err.stack);
});