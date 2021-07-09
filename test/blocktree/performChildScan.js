const assert = require('assert');

module.exports = (context) => ({
    'should return an empty array if no children are found': async () => {
        const { blocktree } = context;
        const data = Buffer.from("I'm a string!", 'utf-8');
        const block = await blocktree.writeBlock({ prev: null, parent: null, data });
        const result = await blocktree.performChildScan(block);

        assert.ok(Array.isArray(result));
        assert.strictEqual(result.length, 0);
    },
    'should return an array of all child blocks if present': async () => {
        const { blocktree } = context;
        const data = Buffer.from("I'm a string!", 'utf-8');
        const block1 = await blocktree.writeBlock({ prev: null, parent: null, data });
        const block2 = await blocktree.writeBlock({ prev: null, parent: block1, data });
        const block3 = await blocktree.writeBlock({ prev: null, parent: block1, data });
        const block4 = await blocktree.writeBlock({ prev: null, parent: block1, data });
        await blocktree.writeBlock({ prev: null, parent: block4, data });
        const result = await blocktree.performChildScan(block1);

        assert.ok(Array.isArray(result));
        assert.strictEqual(result.length, 3);
        assert.ok(Buffer.compare(result[0].hash, block2) === 0);
        assert.ok(Buffer.compare(result[1].hash, block3) === 0);
        assert.ok(Buffer.compare(result[2].hash, block4) === 0);
    },
});
