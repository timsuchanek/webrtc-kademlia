module.exports = {
  // Network Config
  PING_TIMEOUT: 1000,
  STORE_TIMEOUT: 1000,
  FIND_NODE_TIMEOUT: 1000,
  FIND_VALUE_TIMEOUT: 1000,
  LOOKUP_TIMEOUT: 5000,

  STORE_KEY_BITS: 9, // 2^9 = 512

  TIMEOUT: 5000,

  HOST: 'localhost',
  HOST_PORT: 9000,

  PORT: 3000,

  // Kademlia Config
  HASH_SPACE: 160,
  B64_LENGTH: 27,

  K: 8,
  CONCURRENCY_FACTOR: 3,

  // Logging Config
  LOG_PING: true,
  LOG_STORE: true,
  LOG_FIND_VALUE: true,
  LOG_FIND_NODE: true,
  LOG_PEERJS: true,

  // Limit the amount of data, that is stored at the own machine,
  // if it is triggered on THIS machine
  MAX_OWN_DATA: 100,

  RPCS: {
    PING_REQ: 0,
    PING_RES: 1,

    FIND_NODE_REQ: 2,
    FIND_NODE_RES: 3,

    FIND_VALUE_REQ: 4,
    FIND_VALUE_RES: 5,

    STORE_REQ: 6,
    STORE_RES: 7,

    NODE_LOOKUP_REQ: 8,
    NODE_LOOKUP_RES: 9,

    VALUE_LOOKUP_REQ: 10,
    VALUE_LOOKUP_RES: 11
  },

  STATES: {
    SUCCESS: 0,
    FAIL: 1
  }
}