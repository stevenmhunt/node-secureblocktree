/* eslint-disable no-await-in-loop */
const assert = require('assert');
const constants = require('../../src/constants');
const { InvalidBlockError } = require('../../src/errors');
const { getRandomHash } = require('../test-helper');

module.exports = (context) => ({
    'should ignore user-provided values other than prev and data': async () => {
        const { blocktree } = context;
        const data = Buffer.from("I'm a string!", 'utf-8');
        const block1 = await blocktree.writeBlock({
            prev: null, data, timestamp: 0, nonce: 0, hash: 'ff',
        });
        const result = await blocktree.readBlock(block1);

        assert.ok(Buffer.compare(data, result.data) === 0, 'Expected data to match.');
        assert.ok(result.timestamp !== 0, 'Expected timestamp to be valid.');
        assert.strictEqual(result.prev, null);
        assert.ok(result.hash !== 'ff', 'Expected prev pointer to be null.');
        assert.ok(result.nonce !== 0, 'Expected valid nonce value.');
    },
    'should support 100 blocks in a chain': async () => {
        const { blocktree } = context;
        const data = Buffer.from("I'm a string!", 'utf-8');
        let block = null;
        for (let i = 0; i < 100; i += 1) {
            block = await blocktree.writeBlock({ prev: block, data });
        }
        const result = await blocktree.readBlock(block);
        const prev = await blocktree.readBlock(result.prev);

        assert.ok(Buffer.compare(data, result.data) === 0, 'Expected data to match.');
        assert.ok(Buffer.compare(data, prev.data) === 0, 'Expected data to match.');
        assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
        assert.ok(prev.timestamp > 0, 'Expected timestamp to be valid.');
        assert.ok(Buffer.compare(result.prev, prev.hash) === 0);
        assert.ok(result.nonce, 'Expected valid nonce value.');
        assert.ok(prev.nonce, 'Expected valid nonce value.');
    },
    'should throw an exception if writing to an invalid blocktree': async () => {
        const { blocktree } = context;
        const options = { validate: true };
        const block1 = getRandomHash();
        const data2 = Buffer.from("I'm another string!", 'utf-8');
        let isExecuted = false;
        try {
            await blocktree.writeBlock({ prev: block1, data: data2 }, options);
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidBlockError);
            assert.strictEqual(err.layer, constants.layer.blockchain);
            assert.strictEqual(err.reason, InvalidBlockError.reasons.notFound);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should throw an exception if writing to a blockchain with a newer timestamp': async () => {
        const { blocktree } = context;
        const options = { validate: true };
        const data1 = Buffer.from("I'm a string!", 'utf-8');
        const block1 = await blocktree.writeBlock({ prev: null, data: data1 }, options);
        const data2 = Buffer.from("I'm another string!", 'utf-8');
        let isExecuted = false;
        try {
            blocktree.mocks.time.setNextTimestamp(0);
            await blocktree.writeBlock({ prev: block1, data: data2 }, options);
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidBlockError);
            assert.strictEqual(err.layer, constants.layer.blockchain);
            assert.strictEqual(err.reason, InvalidBlockError.reasons.invalidTimestamp);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should throw an exception if writing to a blockchain with another block present': async () => {
        const { blocktree } = context;
        const options = { validate: true };
        const data1 = Buffer.from("I'm a string!", 'utf-8');
        const block1 = await blocktree.writeBlock({ prev: null, data: data1 }, options);
        const data2 = Buffer.from("I'm another string!", 'utf-8');
        await blocktree.writeBlock({ prev: block1, data: data1 }, options);
        let isExecuted = false;
        try {
            await blocktree.writeBlock({ prev: block1, data: data2 }, options);
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidBlockError);
            assert.strictEqual(err.layer, constants.layer.blockchain);
            assert.strictEqual(err.reason, InvalidBlockError.reasons.nextBlockExists);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
});
