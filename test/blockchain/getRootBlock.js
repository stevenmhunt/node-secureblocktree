/* eslint-disable no-await-in-loop */
const assert = require('assert');
const constants = require('../../src/constants');
const { SerializationError } = require('../../src/errors');

module.exports = (context) => ({
    'should walk across the blocks to find the first one in the chain': async () => {
        const { blockchain } = context;
        const data = Buffer.from("I'm a string!", 'utf-8');
        let block = null; let
            first = null;
        for (let i = 0; i < 100; i += 1) {
            block = await blockchain.writeBlock({ prev: block, data });
            if (i === 0) {
                first = block;
            }
        }
        const root = await blockchain.getRootBlock(block);
        const rootBlock = await blockchain.readBlock(root);

        assert.ok(root !== null);
        assert.ok(Buffer.compare(root, first) === 0);
        assert.ok(rootBlock !== null);
        assert.strictEqual(rootBlock.prev, null);
    },
    'should return null if there is not a valid block': async () => {
        const { blockchain } = context;
        const root = await blockchain.getRootBlock(0);
        assert.strictEqual(root, null);
    },
    'should fail if the requested block hash is an incorrect size': async () => {
        const { blockchain } = context;
        const invalidBlock = Buffer.from('aabbccdd', 'utf-8');
        let isExecuted = false;
        try {
            await blockchain.getRootBlock(invalidBlock);
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof SerializationError);
            assert.strictEqual(err.layer, constants.layer.blockchain);
            assert.strictEqual(err.reason, SerializationError.reasons.invalidBlockHash);
        }
        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
});
