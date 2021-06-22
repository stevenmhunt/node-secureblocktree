/* eslint-disable global-require */
const {
    initSecureBlocktree, initializeSecureRoot, generateTestKey, signAs, loadTests,
} = require('./test-helper');

function loadSecureBlocktreeTests(context) {
    describe('readSecureBlock()',
        loadTests(require('./secure-blocktree/readSecureBlock'), context));
    describe('createZone()',
        loadTests(require('./secure-blocktree/createZone'), context));
    describe('createIdentity()',
        loadTests(require('./secure-blocktree/createIdentity'), context));
    describe('addKey()',
        loadTests(require('./secure-blocktree/addKey'), context));
    describe('revokeKey()',
        loadTests(require('./secure-blocktree/revokeKey'), context));
    describe('addSecret()',
        loadTests(require('./secure-blocktree/addSecret'), context));
    describe('addOptions()',
        loadTests(require('./secure-blocktree/addOptions'), context));
    describe('createCollection()',
        loadTests(require('./secure-blocktree/createCollection'), context));
}

describe('Blocktree Layer 3 - Secure Blocktree', () => {
    describe('without cache', () => {
        const context = {};

        before(async () => {
            context.generateTestKey = generateTestKey;
            context.rootKey = await context.generateTestKey();
            context.rootZoneKey = await context.generateTestKey();
        });

        beforeEach(async () => {
            context.secureBlocktree = initSecureBlocktree(false);
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
            context.generateTestKey = generateTestKey;
            context.rootKey = await context.generateTestKey();
            context.rootZoneKey = await context.generateTestKey();
        });

        beforeEach(async () => {
            context.secureBlocktree = initSecureBlocktree(true);
            context.signAs = (key, altKey) => signAs(context.secureBlocktree, key, altKey);
            context.secureRoot = await initializeSecureRoot(
                context.secureBlocktree, context.rootKey, context.rootZoneKey,
            );
        });

        loadSecureBlocktreeTests(context);
    });
});
