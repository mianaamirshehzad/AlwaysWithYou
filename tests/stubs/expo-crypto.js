const nodeCrypto = require('crypto');
module.exports = {
  getRandomValues: (array) => {
    nodeCrypto.randomFillSync(array);
    return array;
  },
  getRandomBytes: (n) => new Uint8Array(nodeCrypto.randomBytes(n)),
  getRandomBytesAsync: async (n) => new Uint8Array(nodeCrypto.randomBytes(n)),
  digestStringAsync: async (algo, data) =>
    nodeCrypto.createHash(algo === 'SHA256' ? 'sha256' : 'sha1').update(data).digest('hex'),
};
