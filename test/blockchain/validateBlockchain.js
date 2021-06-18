const assert = require('assert');
const constants = require('../../src/constants');
const { getRandomHash } = require('../test-helper');

module.exports = (context) => ({
    'should report that a valid blockchain is valid': async () => {
        const { blockchain } = context;
        const data1 = Buffer.from("I'm a string!", 'utf-8');
        const block1 = await blockchain.writeBlock({ prev: null, data: data1 });
        const data2 = Buffer.from("I'm another string!", 'utf-8');
        const block2 = await blockchain.writeBlock({ prev: block1, data: data2 });
        const result = await blockchain.validateBlockchain(block2);

        assert.strictEqual(result.isValid, true);
        assert.strictEqual(result.blockCount, 2);
        assert.strictEqual(result.reason, undefined);
        assert.strictEqual(result.block, undefined);
    },
    'should report that a blockchain missing a block is invalid': async () => {
        const { blockchain } = context;
        const options = { validate: false };
        const block1 = getRandomHash();
        const data2 = Buffer.from("I'm another string!", 'utf-8');
        const block2 = await blockchain.writeBlock({ prev: block1, data: data2 }, options);
        const result = await blockchain.validateBlockchain(block2);

        assert.strictEqual(result.isValid, false);
        assert.strictEqual(result.blockCount, 2);
        assert.strictEqual(result.reason, constants.validation.missingBlock);
        assert.ok(Buffer.compare(result.block, block1) === 0);
    },
    'should report that a blockchain with inconsistent timestamps is invalid': async () => {
        const { blockchain } = context;
        const options = { validate: false };
        const data1 = Buffer.from("I'm a string!", 'utf-8');
        const block1 = await blockchain.writeBlock({ prev: null, data: data1 });
        const data2 = Buffer.from("I'm another string!", 'utf-8');
        blockchain.mocks.time.setNextTimestamp(0n);
        const block2 = await blockchain.writeBlock({ prev: block1, data: data2 }, options);
        const result = await blockchain.validateBlockchain(block2);

        assert.strictEqual(result.isValid, false);
        assert.strictEqual(result.blockCount, 2);
        assert.strictEqual(result.reason, constants.validation.invalidTimestamp);
        assert.ok(Buffer.compare(result.block, block1) === 0);
    },
});
