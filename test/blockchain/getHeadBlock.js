/* eslint-disable no-await-in-loop */
const assert = require('assert');
const constants = require('../../src/constants');
const { SerializationError } = require('../../src/errors');

module.exports = (context) => ({
    'should scan the blocks to find the last one in the chain': async () => {
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
        const result = await blockchain.readBlock(block);
        const head = await blockchain.getHeadBlock(first);
        const headBlock = await blockchain.readBlock(head);

        assert.ok(head !== null);
        assert.ok(Buffer.compare(result.prev, headBlock.prev) === 0);
        assert.strictEqual(headBlock.timestamp, result.timestamp);
        assert.strictEqual(headBlock.nonce, result.nonce);
        assert.ok(Buffer.compare(data, result.data) === 0, 'Expected data to match.');
    },
    'should return null if there is not a valid block': async () => {
        const { blockchain } = context;
        const head = await blockchain.getHeadBlock(constants.block.zero);
        assert.strictEqual(head, null);
    },
    'should fail if the requested block hash is an incorrect size': async () => {
        const { blockchain } = context;
        const invalidBlock = Buffer.from('aabbccdd', 'utf-8');
        let isExecuted = false;
        try {
            await blockchain.getHeadBlock(invalidBlock);
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof SerializationError);
            assert.strictEqual(err.layer, constants.layer.blockchain);
            assert.strictEqual(err.reason, SerializationError.reasons.invalidBlockHash);
        }
        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
});
