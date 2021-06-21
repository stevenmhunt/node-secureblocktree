/* eslint-disable global-require */
const {
    initSecureBlocktree, initializeSecureRoot, generateTestKey, signAs,
    getEncryption, loadTests,
} = require('./test-helper');

function loadSecureBlocktreeTests(context) {
    describe('readSecureBlock()',
        loadTests(require('./secure-blocktree/readSecureBlock'), context));
    describe('createZone()',
        loadTests(require('./secure-blocktree/createZone'), context));
    describe('createIdentity()',
        loadTests(require('./secure-blocktree/createIdentity'), context));
    describe('setKey()',
        loadTests(require('./secure-blocktree/setKey'), context));
    describe('revokeKey()',
        loadTests(require('./secure-blocktree/revokeKey'), context));
    describe('setOptions()',
        loadTests(require('./secure-blocktree/setOptions'), context));
    describe('createCollection()',
        loadTests(require('./secure-blocktree/createCollection'), context));
}

describe('Blocktree Layer 3 - Secure Blocktree', () => {
    const encryption = getEncryption();
    describe('without cache', () => {
        const context = {};

        before(async () => {
            context.generateTestKey = () => generateTestKey(encryption);
            context.rootKey = await context.generateTestKey();
            context.rootZoneKey = await context.generateTestKey();
        });

        beforeEach(async () => {
            context.secureBlocktree = initSecureBlocktree(encryption, false);
            context.signAs = (key, altKey) => signAs(context.secureBlocktree, key, altKey);
            context.secureRoot = await initializeSecureRoot(
                context.secureBlocktree, context.rootKey, context.rootZoneKey,
            );
        });

        loadSecureBlocktreeTests(context);
    });
    describe('with cache', () => {
        const context = {};

        before(async () => {
            context.generateTestKey = () => generateTestKey(encryption);
            context.rootKey = await context.generateTestKey();
            context.rootZoneKey = await context.generateTestKey();
        });

        beforeEach(async () => {
            context.secureBlocktree = initSecureBlocktree(encryption, true);
            context.signAs = (key, altKey) => signAs(context.secureBlocktree, key, altKey);
            context.secureRoot = await initializeSecureRoot(
                context.secureBlocktree, context.rootKey, context.rootZoneKey,
            );
        });

        loadSecureBlocktreeTests(context);
    });
});
