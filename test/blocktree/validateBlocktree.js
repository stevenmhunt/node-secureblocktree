const assert = require('assert');
const constants = require('../../src/constants');
const { getRandomHash } = require('../test-helper');

module.exports = (context) => ({
    'should report that a valid blocktree is valid': async () => {
        const { blocktree } = context;
        const data1 = Buffer.from("I'm a string!", 'utf-8');
        const block1 = await blocktree.writeBlock({ prev: null, data: data1 });
        const data2 = Buffer.from("I'm another string!", 'utf-8');
        const block2 = await blocktree.writeBlock({ prev: block1, data: data2 });
        const data3 = Buffer.from("I'm yet another string!", 'utf-8');
        const block3 = await blocktree.writeBlock({ parent: block2, data: data3 });
        const result = await blocktree.validateBlocktree(block3);

        assert.strictEqual(result.isValid, true);
        assert.strictEqual(result.blockCount, 3);
        assert.strictEqual(result.reason, undefined);
        assert.strictEqual(result.block, undefined);
    },
    'should report that a blocktree with a missing parent is invalid': async () => {
        const { blocktree } = context;
        const options = { validate: false };
        const block0 = getRandomHash();
        const data1 = Buffer.from("I'm a string!", 'utf-8');
        const block1 = await blocktree.writeBlock({ parent: block0, data: data1 }, options);
        const data2 = Buffer.from("I'm another string!", 'utf-8');
        const block2 = await blocktree.writeBlock({ parent: block1, data: data2 });
        const data3 = Buffer.from("I'm yet another string!", 'utf-8');
        const block3 = await blocktree.writeBlock({ parent: block2, data: data3 });
        const result = await blocktree.validateBlocktree(block3);

        assert.strictEqual(result.isValid, false);
        assert.strictEqual(result.blockCount, 4);
        assert.strictEqual(result.reason, constants.validation.missingBlock);
        assert.ok(Buffer.compare(result.block, block0) === 0);
    },
});
