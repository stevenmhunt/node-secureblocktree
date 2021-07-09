const assert = require('assert');
const constants = require('../../src/constants');
const { InvalidBlockError } = require('../../src/errors');
const { getRandomHash } = require('../test-helper');

module.exports = (context) => ({
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
    'should return null for null block hash and validation is disabled': async () => {
        const { secureBlocktree } = context;
        const options = { validate: false };
        const result = await secureBlocktree.readSecureBlock(constants.block.zero, options);
        assert.strictEqual(null, result);
    },
    'should return null if no block is found and validation is disabled': async () => {
        const { secureBlocktree } = context;
        const options = { validate: false };
        const result = await secureBlocktree.readSecureBlock(getRandomHash(), options);
        assert.strictEqual(null, result);
    },
    'should return null if block is false and validation is disabled': async () => {
        const { secureBlocktree } = context;
        const options = { validate: false };
        const result = await secureBlocktree.readSecureBlock(false, options);
        assert.strictEqual(null, result);
    },
    'should return null if block is null and validation is disabled': async () => {
        const { secureBlocktree } = context;
        const options = { validate: false };
        const result = await secureBlocktree.readSecureBlock(null, options);
        assert.strictEqual(null, result);
    },
    'should fail for null block hash': async () => {
        const { secureBlocktree } = context;
        let isExecuted = false;
        try {
            await secureBlocktree.readSecureBlock(constants.block.zero);
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidBlockError);
            assert.strictEqual(err.reason, InvalidBlockError.reasons.notFound);
        }
        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should fail if no block is found': async () => {
        const { secureBlocktree } = context;
        let isExecuted = false;
        try {
            await secureBlocktree.readSecureBlock(getRandomHash());
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidBlockError);
            assert.strictEqual(err.reason, InvalidBlockError.reasons.notFound);
        }
        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should fail if block is false': async () => {
        const { secureBlocktree } = context;
        let isExecuted = false;
        try {
            await secureBlocktree.readSecureBlock(false);
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidBlockError);
            assert.strictEqual(err.reason, InvalidBlockError.reasons.notFound);
        }
        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should fail if block is null': async () => {
        const { secureBlocktree } = context;
        let isExecuted = false;
        try {
            await secureBlocktree.readSecureBlock(null);
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidBlockError);
            assert.strictEqual(err.reason, InvalidBlockError.reasons.notFound);
        }
        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
});
