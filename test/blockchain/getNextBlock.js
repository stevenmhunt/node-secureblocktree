/* eslint-disable no-await-in-loop */
const assert = require('assert');
const constants = require('../../src/constants');
const { SerializationError } = require('../../src/errors');

module.exports = (context) => ({
    'should scan the blocks to find the next one in the chain': async () => {
        const { blockchain } = context;
        const data = Buffer.from("I'm a string!", 'utf-8');
        let block = null;
        for (let i = 0; i < 100; i += 1) {
            block = await blockchain.writeBlock({ prev: block, data });
        }
        const result = await blockchain.readBlock(block);
        const prev = await blockchain.readBlock(result.prev);
        const next = await blockchain.getNextBlock(result.prev);

        assert.ok(Buffer.compare(next, block) === 0);
        assert.ok(Buffer.compare(data, result.data) === 0, 'Expected data to match.');
        assert.ok(Buffer.compare(data, prev.data) === 0, 'Expected data to match.');
        assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
        assert.ok(prev.timestamp > 0, 'Expected timestamp to be valid.');
        assert.ok(Buffer.compare(result.prev, prev.hash) === 0);
        assert.ok(result.nonce, 'Expected valid nonce value.');
        assert.ok(prev.nonce, 'Expected valid nonce value.');
    },
    'should return null if there are no more blocks in the chain': async () => {
        const { blockchain } = context;
        const data = Buffer.from("I'm a string!", 'utf-8');
        const block = await blockchain.writeBlock({
            prev: null, data, timestamp: 0, nonce: 0, hash: 'ff',
        });
        const result = await blockchain.readBlock(block);
        const next = await blockchain.getNextBlock(block);

        assert.strictEqual(next, null);
        assert.ok(Buffer.compare(data, result.data) === 0, 'Expected data to match.');
        assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
        assert.ok(result.nonce, 'Expected valid nonce value.');
    },
    'should fail if the requested block hash is an incorrect size': async () => {
        const { blockchain } = context;
        const invalidBlock = Buffer.from('aabbccdd', 'utf-8');
        let isExecuted = false;
        try {
            await blockchain.getNextBlock(invalidBlock);
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof SerializationError);
            assert.strictEqual(err.layer, constants.layer.blockchain);
            assert.strictEqual(err.reason, SerializationError.reasons.invalidBlockHash);
        }
        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
});
