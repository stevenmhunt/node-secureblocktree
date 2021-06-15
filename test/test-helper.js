const crypto = require('crypto');
const constants = require('../src/constants');

// blocktree layers
const secureBlocktreeLayerFactory = require('../src/layers/secure-blocktree');
const blocktreeLayerFactory = require('../src/layers/blocktree');
const blockchainLayerFactory = require('../src/layers/blockchain');
const systemLayerFactory = require('../src/layers/system');

// mocks
const cacheFactory = require('./mocks/cache');
const encryptionFactory = require('./mocks/encryption');
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
    return { ...blockchain, mocks: { cache, storage, os } };
}

function initBlocktree() {
    const blockchain = initBlockchain();
    const blocktree = blocktreeLayerFactory({ blockchain, cache: blockchain.mocks.cache });
    return { ...blocktree, mocks: blockchain.mocks };
}

function initSecureBlocktree() {
    const blocktree = initBlocktree();
    const secureCache = cacheFactory();
    const os = osFactory();
    const encryption = encryptionFactory();
    const secureBlocktree = secureBlocktreeLayerFactory({
        blocktree, secureCache, os, encryption,
    });
    return { ...secureBlocktree, mocks: blocktree.mocks, encryption };
}

function signAs(secureBlocktree, key) {
    return ({ parent, prev }) => secureBlocktree.signBlock({
        key,
        parent,
        prev,
    });
}

const privateKeys = {};
function getPrivateKey(publicKey) {
    return privateKeys[publicKey];
}

async function generateTestKeys(encryption) {
    const readKey = await encryption.generateKeyPair();
    const writeKey = await encryption.generateKeyPair();

    // FOR TESTING PURPOSES ONLY!!!!
    const publicReadKey = readKey.publicKey.toString(constants.format.key);
    const privateReadKey = readKey.privateKey;
    const publicWriteKey = writeKey.publicKey.toString(constants.format.key);
    const privateWriteKey = writeKey.privateKey;

    privateKeys[publicReadKey] = privateReadKey;
    privateKeys[publicWriteKey] = privateWriteKey;

    return {
        [constants.action.read]: [publicReadKey],
        [constants.action.write]: [publicWriteKey],
    };
}

async function initializeSecureRoot(secureBlocktree) {
    const rootKeys = await generateTestKeys(secureBlocktree.encryption);
    const rootZoneKeys = await generateTestKeys(secureBlocktree.encryption);
    const rootWritePrivateKey = getPrivateKey(rootKeys[constants.action.write][0]);
    const signAsRoot = signAs(secureBlocktree, rootWritePrivateKey);
    const result = await secureBlocktree.installRoot({ rootKeys, rootZoneKeys, signAsRoot });
    return { ...result, rootKeys, rootZoneKeys };
}

module.exports = {
    getRandomHash,
    initBlockchain,
    initBlocktree,
    initSecureBlocktree,
    initializeSecureRoot,
    generateTestKeys,
    getPrivateKey,
    signAs,
};
