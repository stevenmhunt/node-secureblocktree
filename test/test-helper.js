const crypto = require('crypto');
const constants = require('../src/constants');

// blocktree layers
const secureBlocktreeLayerFactory = require('../src/layers/secure-blocktree');
const blocktreeLayerFactory = require('../src/layers/blocktree');
const blockchainLayerFactory = require('../src/layers/blockchain');
const systemLayerFactory = require('../src/layers/system');

// mocks
const cacheFactory = require('./mocks/cache');
const noCacheFactory = require('./mocks/no-cache');
const encryptionFactory = require('./mocks/encryption');
const timeFactory = require('./mocks/time');
const storageFactory = require('./mocks/storage');

function getRandomHash() {
    return crypto.randomBytes(constants.size.hash);
}

function initSystem(withCache) {
    const cache = withCache ? cacheFactory() : noCacheFactory();
    const time = timeFactory();
    const storage = storageFactory();
    return { cache, time, storage };
}

function initBlockchain(withCache) {
    const { cache, storage, time } = initSystem(withCache);
    const system = systemLayerFactory({ cache, storage, time });
    const blockchain = blockchainLayerFactory({ system, cache, time });
    return { ...blockchain, mocks: { cache, storage, time } };
}

function initBlocktree(withCache) {
    const blockchain = initBlockchain(withCache);
    const blocktree = blocktreeLayerFactory({ blockchain, cache: blockchain.mocks.cache });
    return { ...blocktree, mocks: blockchain.mocks };
}

function getEncryption() {
    return encryptionFactory();
}

function initSecureBlocktree(encryption, withCache) {
    const blocktree = initBlocktree(withCache);
    const secureCache = withCache ? cacheFactory() : noCacheFactory();
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

async function generateTestKey(encryption) {
    const key = await encryption.generateKeyPair();

    // FOR TESTING PURPOSES ONLY!!!!
    const { publicKey } = key;
    const { privateKey } = key;

    privateKeys[publicKey] = privateKey;

    return publicKey;
}

async function initializeSecureRoot(secureBlocktree, rootKey, rootZoneKey) {
    const signAsRoot = signAs(secureBlocktree, rootKey);

    // create the root block.
    const rootBlock = await secureBlocktree.createRoot({
        key: rootKey,
    });

    // establish the root zone.
    const rootZone = await secureBlocktree.createZone({
        sig: signAsRoot,
        block: rootBlock,
    });

    // set the root zone keys.
    await secureBlocktree.setKey({
        sig: signAsRoot,
        block: rootZone,
        parentKey: rootKey,
        key: rootZoneKey,
        action: constants.action.any,
    });

    return { rootBlock, rootZone };
}

const loadTests = (fn, context) => () => {
    const tests = fn(context);
    Object.keys(tests).forEach((test) => it(test, tests[test]));
};

module.exports = {
    getRandomHash,
    initBlockchain,
    initBlocktree,
    initSecureBlocktree,
    initializeSecureRoot,
    getEncryption,
    generateTestKey,
    getPrivateKey,
    signAs,
    loadTests,
};
