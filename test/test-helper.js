const crypto = require('crypto');
const constants = require('../src/constants');

// blocktree layers
const secureBlocktreeLayerFactory = require('../src/layers/secure-blocktree');
const blocktreeLayerFactory = require('../src/layers/blocktree');
const blockchainLayerFactory = require('../src/layers/blockchain');
const systemLayerFactory = require('../src/layers/system');

// mocks
const cacheFactory = require('./mocks/no-cache');
const encryptionFactory = require('./mocks/encryption');
const timeFactory = require('./mocks/time');
const storageFactory = require('./mocks/storage');

function getRandomHash() {
    return crypto.randomBytes(constants.size.hash);
}

function initSystem() {
    const cache = cacheFactory();
    const time = timeFactory();
    const storage = storageFactory();
    return { cache, time, storage };
}

function initBlockchain() {
    const { cache, storage, time } = initSystem();
    const system = systemLayerFactory({ cache, storage, time });
    const blockchain = blockchainLayerFactory({ system, cache, time });
    return { ...blockchain, mocks: { cache, storage, time } };
}

function initBlocktree() {
    const blockchain = initBlockchain();
    const blocktree = blocktreeLayerFactory({ blockchain, cache: blockchain.mocks.cache });
    return { ...blocktree, mocks: blockchain.mocks };
}

function getEncryption() {
    return encryptionFactory();
}

function initSecureBlocktree(encryption) {
    const blocktree = initBlocktree();
    const secureCache = cacheFactory();
    const time = timeFactory();
    const secureBlocktree = secureBlocktreeLayerFactory({
        blocktree, secureCache, time, encryption,
    });
    return { ...secureBlocktree, mocks: blocktree.mocks, encryption };
}

const privateKeys = {};
function getPrivateKey(key, isExport = false) {
    if (isExport) {
        return privateKeys[key].export({
            type: 'pkcs1',
            format: 'der',
        });
    }
    return privateKeys[key];
}

function signAs(secureBlocktree, key, altKey) {
    return ({ parent, prev }) => secureBlocktree.signBlock({
        secret: getPrivateKey(key),
        key: altKey || key,
        parent,
        prev,
    });
}

async function generateTestKeys(encryption) {
    const readKey = await encryption.generateKeyPair();
    const writeKey = await encryption.generateKeyPair();

    // FOR TESTING PURPOSES ONLY!!!!
    const publicReadKey = readKey.publicKey;
    const privateReadKey = readKey.privateKey;
    const publicWriteKey = writeKey.publicKey;
    const privateWriteKey = writeKey.privateKey;

    privateKeys[publicReadKey] = privateReadKey;
    privateKeys[publicWriteKey] = privateWriteKey;

    return {
        [constants.action.read]: [publicReadKey],
        [constants.action.write]: [publicWriteKey],
    };
}

async function initializeSecureRoot(secureBlocktree, rootKeys, rootZoneKeys) {
    const signAsRoot = signAs(secureBlocktree, rootKeys[constants.action.write][0]);
    return secureBlocktree.installRoot({ rootKeys, rootZoneKeys, signAsRoot });
}

module.exports = {
    getRandomHash,
    initBlockchain,
    initBlocktree,
    initSecureBlocktree,
    initializeSecureRoot,
    getEncryption,
    generateTestKeys,
    getPrivateKey,
    signAs,
};
