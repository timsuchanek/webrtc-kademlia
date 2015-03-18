var DHT = window.DHT = require('./DHT');
var util = require('./util');

var dht = new DHT();

dht.init()
.then(function(dht) {
  
  util.success('Successfully joined the network', dht);

  util.addGetFunctionality(dht);
  util.addStoreFunctionality(dht);
  util.addMyId(dht);

  // dht.store('B42TibbFgJ2pPBt0y2Pk_nBWC_eqgbD7o7gB6sCNavp5', {some: 'object'})
  // .then(function(numStores) {
  //   util.log('OMG SAVED AWESOME DATA to ', numStores, 'people');
  // }, function(err) {
  //   util.log('Error saving the data', err);
  // });

  // dht.get('B42TibbFgJ2pPBt0y2Pk_nBWC_eqgbD7o7gB6sCNavp5')
  // .then(function(data) {
  //   util.log('OMG GOT AWESOME DATA', data);
  // }, function(err) {
  //   util.log('Error while getting the data', err);
  // });


}, function(err) {
  util.error('Cant participate at the network', err);
});


document.addEventListener("DOMContentLoaded", function(event) { 
  util.addHashFunctionality();  
});