WebRTC Kademlia
===============
This is an implementation of the wonderful Kademlia DHT (Distributed HashTable) protocol,
using [peerjs](https://github.com/peers/peerjs) as the network layer.

## Caution
For the peer.js Server you need to use a modified version, that has some DHT specific features:
[peerjs-server fork](https://github.com/timsuchanek/peerjs-server.git)

## Usage
### Init PeerJS Server
1. `git clone https://github.com/timsuchanek/peerjs-server.git`
2. `cd peerjs-server`
3. `npm install`
4. `bin/peerjs --port 9000 --key peerjs`

### Run Kademlia Implementation
1. `git clone git clone https://github.com/timsuchanek/webrtc-kademlia.git`
2. `cd webrtc-kademlia`
3. `npm install`
4. `npm start`

### Open you Browser
Point 2 Browser Tabs to `http://localhost:8000` and enjoy the demo.
(We need two, because they need to connect to have a working demo)

### License
MIT