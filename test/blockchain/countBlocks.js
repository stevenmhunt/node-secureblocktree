/* eslint-disable no-await-in-loop */
const assert = require('assert');

module.exports = (context) => ({
    'should return zero if no blocks have been added': async () => {
        const { blockchain } = context;
        const result = await blockchain.countBlocks();
        assert.strictEqual(result, 0n);
    },
    'should return the number of blocks in the system': async () => {
        const { blockchain } = context;
        const blockCount = 50n;
        const data = Buffer.from("I'm a string!", 'utf-8');
        let block = null;
        for (let i = 0n; i < blockCount; i += 1n) {
            block = await blockchain.writeBlock({ prev: block, data });
        }
        const result = await blockchain.countBlocks();

        assert.strictEqual(result, blockCount);
    },
});
