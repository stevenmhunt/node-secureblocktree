const crypto = require('crypto');
const constants = require('../src/constants');

// blocktree layers
const secureBlocktreeLayerFactory = require('../src/layers/secure-blocktree');
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

function initSecureBlocktree() {
    const blocktree = initBlocktree();
    const secureCache = cacheFactory();
    const os = osFactory();
    const certificates = certificatesFactory();
    const secureBlocktree = secureBlocktreeLayerFactory({
        blocktree, secureCache, os, certificates,
    });
    return secureBlocktree;
}

function signAs(secureBlocktree, key) {
    return ({ parent, prev }) => secureBlocktree.signBlock({
        key,
        parent,
        prev,
    });
}

async function initializeSecureRoot(secureBlocktree) {
    const rootWriteKey = 'bbbb';
    const rootKeys = { [constants.action.read]: ['aaaa'], [constants.action.write]: ['bbbb'] };
    const rootZoneKeys = { [constants.action.read]: ['cccc'], [constants.action.write]: ['dddd'] };
    const signAsRoot = signAs(secureBlocktree, rootWriteKey);
    const result = await secureBlocktree.installRoot({ rootKeys, rootZoneKeys, signAsRoot });
    return { ...result, rootKeys, rootZoneKeys };
}

const testKeys = [
    ['eeee', 'ffff'],
    ['gggg', 'hhhh'],
    ['iiii', 'jjjj'],
    ['abab', 'acac'],
    ['adad', 'aeae'],
    ['agag', 'afaf'],
    ['ahah', 'aiai'],
    ['akak', 'ajaj'],
    ['alal', 'amam'],
];
let testKeyIndex = 0;

function generateKeys() {
    const [readKey, writeKey] = testKeys[testKeyIndex];
    testKeyIndex += 1;
    if (testKeyIndex >= testKeys.length) {
        testKeyIndex = 0;
    }
    const result = {
        [constants.action.read]: [readKey],
        [constants.action.write]: [writeKey],
    };
    return result;
}

module.exports = {
    getRandomHash,
    initBlockchain,
    initBlocktree,
    initSecureBlocktree,
    initializeSecureRoot,
    generateKeys,
    signAs,
};
