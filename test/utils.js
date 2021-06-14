const crypto = require('crypto');
const constants = require('../src/constants');

// blocktree layers
const securityLayerFactory = require('../src/layers/security');
const blocktreeLayerFactory = require('../src/layers/blocktree');
const blockchainLayerFactory = require('../src/layers/blockchain');
const systemLayerFactory = require('../src/layers/system');

// mocks
const cacheFactory = require('./mocks/cache');
const certificatesFactory = require('./mocks/certificates');
const osFactory = require('./mocks/os');
const storageFactory = require('./mocks/storage');

function getRandomHash() {
    return crypto.randomBytes(constants.size.hash).toString(constants.format.hash);
}

function initSystem() {
    const cache = cacheFactory();
    const os = osFactory();
    const storage = storageFactory();
    return { cache, os, storage };
}

function initBlockchain() {
    const { cache, storage, os } = initSystem();
    const system = systemLayerFactory({ cache, storage, os });
    const blockchain = blockchainLayerFactory({ system, cache, os });
    return blockchain;
}

function initBlocktree() {
    const blockchain = initBlockchain();
    const blocktree = blocktreeLayerFactory({ blockchain });
    return blocktree;
}

function initSecurity() {
    const blocktree = initBlocktree();
    const secureCache = cacheFactory();
    const os = osFactory();
    const certificates = certificatesFactory();
    const security = securityLayerFactory({
        blocktree, secureCache, os, certificates,
    });
    return security;
}

async function initializeSecureRoot(security) {
    const rootWriteKey = 'bbbb';
    const rootKeys = { [constants.action.read]: ['aaaa'], [constants.action.write]: ['bbbb'] };
    const rootZoneKeys = { [constants.action.read]: ['cccc'], [constants.action.write]: ['dddd'] };
    const signAsRoot = (block) => security.signBlock(rootWriteKey, block);
    const result = await security.installRoot({ rootKeys, rootZoneKeys, signAsRoot });
    return result;
}

module.exports = {
    getRandomHash,
    initBlockchain,
    initBlocktree,
    initSecurity,
    initializeSecureRoot,
};
