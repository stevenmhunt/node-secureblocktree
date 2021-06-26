const crypto = require('crypto');
const constants = require('../src/constants');
const { generateKeyPair, sign } = require('../src/utils/crypto');

// blocktree layers
const secureBlocktreeLayerFactory = require('../src/layers/secure-blocktree');
const blocktreeLayerFactory = require('../src/layers/blocktree');
const blockchainLayerFactory = require('../src/layers/blockchain');
const systemLayerFactory = require('../src/layers/system');

// mocks
const timeMock = require('./mocks/time');

// caches
const inMemoryCache = require('../src/cache/inMemoryCache');
const noCache = require('../src/cache/noCache');

// storage
const inMemoryStorage = require('../src/storage/inMemoryStorage');

function getRandomHash() {
    return crypto.randomBytes(constants.size.hash);
}

function initSystem(withCache) {
    const cache = withCache ? inMemoryCache() : noCache();
    const time = timeMock();
    const storage = inMemoryStorage();
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

function initSecureBlocktree(withCache) {
    const blocktree = initBlocktree(withCache);
    const secureCache = withCache ? inMemoryCache() : noCache();
    const time = timeMock();
    const secureBlocktree = secureBlocktreeLayerFactory({
        blocktree, secureCache, time,
    });
    return { ...secureBlocktree, mocks: blocktree.mocks };
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
    return ({ parent, prev, token }) => {
        if (!token) {
            return secureBlocktree.signBlock({
                secret: getPrivateKey(key),
                key: altKey || key,
                parent,
                prev,
            });
        }
        return sign(getPrivateKey(key), token);
    };
}

async function generateTestKey() {
    const key = await generateKeyPair();

    // FOR TESTING PURPOSES ONLY!!!!
    const { publicKey } = key;
    const { privateKey } = key;

    privateKeys[publicKey] = privateKey;

    return Buffer.from(publicKey, 'utf-8');
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
    await secureBlocktree.addKey({
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
    generateTestKey,
    getPrivateKey,
    signAs,
    loadTests,
};
