const assert = require('assert');

module.exports = (context) => ({
    'should return only the root block if no parent blocks are found': async () => {
        const { blocktree } = context;
        const data = Buffer.from("I'm a string!", 'utf-8');
        const block = await blocktree.writeBlock({ prev: null, parent: null, data });
        const result = await blocktree.performParentScan(block);

        assert.ok(Array.isArray(result));
        assert.strictEqual(result.length, 1);
        assert.ok(Buffer.compare(result[0].hash, block) === 0);
    },
    'should return the block as well as all parent blocks': async () => {
        const { blocktree } = context;
        const data = Buffer.from("I'm a string!", 'utf-8');
        const block1 = await blocktree.writeBlock({ prev: null, parent: null, data });
        const block2 = await blocktree.writeBlock({ prev: null, parent: block1, data });
        const block3 = await blocktree.writeBlock({ prev: null, parent: block2, data });
        const block4 = await blocktree.writeBlock({ prev: null, parent: block3, data });
        const block5 = await blocktree.writeBlock({ prev: null, parent: block4, data });
        const result = await blocktree.performParentScan(block5);

        assert.ok(Array.isArray(result));
        assert.strictEqual(result.length, 5);
        assert.ok(Buffer.compare(result[0].hash, block5) === 0);
        assert.ok(Buffer.compare(result[1].hash, block4) === 0);
        assert.ok(Buffer.compare(result[2].hash, block3) === 0);
        assert.ok(Buffer.compare(result[3].hash, block2) === 0);
        assert.ok(Buffer.compare(result[4].hash, block1) === 0);
    },
});
