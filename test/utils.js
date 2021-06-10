const crypto = require('crypto');

// blocktree layers
const blocktreeLayerFactory = require('../src/layers/blocktree');
const blockchainLayerFactory = require('../src/layers/blockchain');
const systemLayerFactory = require('../src/layers/system');

// mocks
const cacheFactory = require('./mocks/cache');
const osFactory = require('./mocks/os');
const storageFactory = require('./mocks/storage');
const constants = require('../src/constants');

function getRandomHash() {
    return crypto.randomBytes(constants.size.hash).toString(constants.format.hash);
}

function initBlockchain() {
    const cache = cacheFactory();
    const os = osFactory();
    const storage = storageFactory();
    const system = systemLayerFactory({ cache, storage, os });
    const blockchain = blockchainLayerFactory({ system });
    return blockchain;
}

function initBlocktree() {
    const blockchain = initBlockchain();
    const blocktree = blocktreeLayerFactory({ blockchain });
    return blocktree;
}

module.exports = {
    getRandomHash,
    initBlockchain,
    initBlocktree
};
