module.exports = {
  // Network Config
  PING_TIMEOUT: 400,
  STORE_TIMEOUT: 400,
  FIND_NODE_TIMEOUT: 400,
  FIND_VALUE_TIMEOUT: 400,
  HOST: 'localhost',
  HOST_PORT: 9000,
  
  // Kademlia Config
  HASH_SPACE: 160,
  K: 8,
  CONCURRENCY_FACTOR: 3,

  // Logging Config
  LOG_PING: true,
  LOG_STORE: true,
  LOG_FIND_VALUE: true,
  LOG_FIND_NODE: true,
  LOG_PEERJS: true
}