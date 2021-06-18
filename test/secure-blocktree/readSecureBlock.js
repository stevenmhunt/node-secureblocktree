const assert = require('assert');
const constants = require('../../src/constants');

module.exports = (context) => ({
    'should return null if no value is found': async () => {
        const { secureBlocktree } = context;
        const result = await secureBlocktree.readSecureBlock(constants.block.zero);
        assert.strictEqual(null, result);
    },
    'should retrieve block data if found from the root block': async () => {
        const { secureBlocktree, secureRoot } = context;
        const { rootBlock } = secureRoot;
        const result = await secureBlocktree.readSecureBlock(rootBlock);

        assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
        assert.strictEqual(result.prev, null);
        assert.strictEqual(result.parent, null);
        assert.strictEqual(result.type, constants.blockType.root);
        assert.ok(result.nonce, 'Expected valid nonce value.');
    },
    'should retrieve block data if found from the root zone': async () => {
        const { secureBlocktree, secureRoot } = context;
        const { rootBlock, rootZone } = secureRoot;
        const result = await secureBlocktree.readSecureBlock(rootZone);

        assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
        assert.strictEqual(result.prev, null);
        assert.ok(Buffer.compare(result.parent, rootBlock) === 0);
        assert.strictEqual(result.type, constants.blockType.zone);
        assert.ok(result.nonce, 'Expected valid nonce value.');
    },
});
