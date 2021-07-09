const assert = require('assert');
const constants = require('../../src/constants');
const { SerializationError } = require('../../src/errors');

module.exports = (context) => ({
    'should return null if no parent block found': async () => {
        const { blocktree } = context;
        const data = Buffer.from("I'm a string!", 'utf-8');
        const block = await blocktree.writeBlock({ prev: null, parent: null, data });
        const result = await blocktree.getParentBlock(block);

        assert.strictEqual(result, null);
    },
    'should return the parent block if found': async () => {
        const { blocktree } = context;
        const data = Buffer.from("I'm a string!", 'utf-8');
        const parent = await blocktree.writeBlock({ prev: null, parent: null, data });
        const block = await blocktree.writeBlock({ prev: null, parent, data });
        const result = await blocktree.getParentBlock(block);

        assert.ok(Buffer.compare(result, parent) === 0);
    },
    'should fail if the requested block hash is an incorrect size': async () => {
        const { blocktree } = context;
        const invalidBlock = Buffer.from('aabbccdd', 'utf-8');
        let isExecuted = false;
        try {
            await blocktree.getParentBlock(invalidBlock);
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof SerializationError);
            assert.strictEqual(err.layer, constants.layer.blocktree);
            assert.strictEqual(err.reason, SerializationError.reasons.invalidBlockHash);
        }
        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
});
