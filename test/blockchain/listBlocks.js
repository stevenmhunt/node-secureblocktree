/* eslint-disable no-await-in-loop */
const assert = require('assert');

module.exports = (context) => ({
    'should list all blocks': async () => {
        const { blockchain } = context;
        const blockCount = 50;
        const data = Buffer.from("I'm a string!", 'utf-8');
        let block = null;
        for (let i = 0; i < blockCount; i += 1) {
            block = await blockchain.writeBlock({ prev: block, data });
        }
        const result = await blockchain.listBlocks();

        assert.ok(Array.isArray(result), 'Expected result to be an array.');
        assert.strictEqual(result.length, blockCount);
        assert.ok(result.includes(block));
    },
    'should list blocks matching a partial hash': async () => {
        const { blockchain } = context;
        const blockCount = 50;
        const data = Buffer.from("I'm a string!", 'utf-8');
        let block = null;
        for (let i = 0; i < blockCount; i += 1) {
            block = await blockchain.writeBlock({ prev: block, data });
        }
        const partial = Buffer.allocUnsafe(10);
        block.copy(partial, 0, 0, 10);
        const result = await blockchain.listBlocks(partial);

        assert.ok(Array.isArray(result), 'Expected result to be an array.');
        assert.strictEqual(result.length, 1);
        assert.ok(result.includes(block));
    },
    'should return an empty array if no partial matches are found': async () => {
        const { blockchain } = context;
        const blockCount = 50;
        const data = Buffer.from("I'm a string!", 'utf-8');
        let block = null;
        for (let i = 0; i < blockCount; i += 1) {
            block = await blockchain.writeBlock({ prev: block, data });
        }
        const partial = '000000000000000000000000';
        const result = await blockchain.listBlocks(partial);

        assert.ok(Array.isArray(result), 'Expected result to be an array.');
        assert.strictEqual(result.length, 0);
    },
});
