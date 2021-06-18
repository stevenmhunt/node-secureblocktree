/* eslint-disable global-require */
const {
    initSecureBlocktree, initializeSecureRoot, generateTestKeys, signAs,
    getEncryption, loadTests,
} = require('./test-helper');

function loadSecureBlocktreeTests(context) {
    describe('readSecureBlock()',
        loadTests(require('./secure-blocktree/readSecureBlock'), context));
    describe('createZone()',
        loadTests(require('./secure-blocktree/createZone'), context));
    describe('createIdentity()',
        loadTests(require('./secure-blocktree/createIdentity'), context));
    describe('setKeys()',
        loadTests(require('./secure-blocktree/setKeys'), context));
    describe('revokeKeys()',
        loadTests(require('./secure-blocktree/revokeKeys'), context));
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
            context.generateTestKeys = () => generateTestKeys(encryption);
            context.rootKeys = await context.generateTestKeys();
            context.rootZoneKeys = await context.generateTestKeys();
        });

        beforeEach(async () => {
            context.secureBlocktree = initSecureBlocktree(encryption, false);
            context.signAs = (key, altKey) => signAs(context.secureBlocktree, key, altKey);
            context.secureRoot = await initializeSecureRoot(
                context.secureBlocktree, context.rootKeys, context.rootZoneKeys,
            );
        });

        loadSecureBlocktreeTests(context);
    });
    describe('with cache', () => {
        const context = {};

        before(async () => {
            context.generateTestKeys = () => generateTestKeys(encryption);
            context.rootKeys = await context.generateTestKeys();
            context.rootZoneKeys = await context.generateTestKeys();
        });

        beforeEach(async () => {
            context.secureBlocktree = initSecureBlocktree(encryption, true);
            context.signAs = (key, altKey) => signAs(context.secureBlocktree, key, altKey);
            context.secureRoot = await initializeSecureRoot(
                context.secureBlocktree, context.rootKeys, context.rootZoneKeys,
            );
        });

        loadSecureBlocktreeTests(context);
    });
});
