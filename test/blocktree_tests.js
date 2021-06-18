/* eslint-disable no-await-in-loop */
const assert = require('assert');
const constants = require('../src/constants');
const { InvalidBlockError } = require('../src/errors');
const { initBlocktree, getRandomHash } = require('./test-helper');

describe('Blocktree Layer 2 - Blocktree', () => {
    let blocktree;

    beforeEach(async () => {
        blocktree = initBlocktree();
    });

    describe('read block', () => {
        it('should return null if no value is found', async () => {
            const result = await blocktree.readBlock(constants.block.zero);
            assert.strictEqual(null, result);
        });
        it('should return null if no value is found', async () => {
            const result = await blocktree.readBlock(null);
            assert.strictEqual(null, result);
        });
        it('should return null if no value is found', async () => {
            const result = await blocktree.readBlock(false);
            assert.strictEqual(null, result);
        });
        it('should retrieve block data if found from a root', async () => {
            const data = Buffer.from("I'm a string!", 'utf-8');
            const block1 = await blocktree.writeBlock({ prev: null, data });
            const result = await blocktree.readBlock(block1);

            assert.ok(Buffer.compare(data, result.data) === 0, 'Expected data to match.');
            assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
            assert.strictEqual(result.prev, null);
            assert.ok(result.nonce, 'Expected valid nonce value.');
        });
        it('should retrieve block data if found from a block in a chain', async () => {
            const data1 = Buffer.from("I'm a string!", 'utf-8');
            const block1 = await blocktree.writeBlock({ prev: null, data: data1 });
            const data2 = Buffer.from("I'm another string!", 'utf-8');
            const block2 = await blocktree.writeBlock({ prev: block1, data: data2 });
            const result = await blocktree.readBlock(block2);

            assert.ok(Buffer.compare(data2, result.data) === 0, 'Expected data to match.');
            assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
            assert.ok(Buffer.compare(result.prev, block1) === 0);
            assert.ok(result.nonce, 'Expected valid nonce value.');
        });
    });
    describe('write block', () => {
        it('should ignore user-provided values other than prev and data', async () => {
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
        });
        it('should support 100 blocks in a chain', async () => {
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
        });
        it('should throw an exception if writing to an invalid blocktree', async () => {
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
                assert.strictEqual(err.reason, InvalidBlockError.reasons.isNull);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should throw an exception if writing to a blockchain with a newer timestamp', async () => {
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
        });
        it('should throw an exception if writing to a blockchain with another block present', async () => {
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
        });
    });
    describe('parent scan', () => {
        it('should return only the root block if no parent blocks are found', async () => {
            const data = Buffer.from("I'm a string!", 'utf-8');
            const block = await blocktree.writeBlock({ prev: null, parent: null, data });
            const result = await blocktree.performParentScan(block);

            assert.ok(Array.isArray(result));
            assert.strictEqual(result.length, 1);
            assert.ok(Buffer.compare(result[0].hash, block) === 0);
        });
        it('should return the block as well as all parent blocks', async () => {
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
        });
    });
    describe('child scan', () => {
        it('should return an empty array if no children are found', async () => {
            const data = Buffer.from("I'm a string!", 'utf-8');
            const block = await blocktree.writeBlock({ prev: null, parent: null, data });
            const result = await blocktree.performChildScan(block);

            assert.ok(Array.isArray(result));
            assert.strictEqual(result.length, 0);
        });
        it('should return an array of all child blocks if present', async () => {
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
        });
    });
    describe('get parent block', () => {
        it('should return null if no parent block found', async () => {
            const data = Buffer.from("I'm a string!", 'utf-8');
            const block = await blocktree.writeBlock({ prev: null, parent: null, data });
            const result = await blocktree.getParentBlock(block);

            assert.strictEqual(result, null);
        });
        it('should return the parent block if found', async () => {
            const data = Buffer.from("I'm a string!", 'utf-8');
            const parent = await blocktree.writeBlock({ prev: null, parent: null, data });
            const block = await blocktree.writeBlock({ prev: null, parent, data });
            const result = await blocktree.getParentBlock(block);

            assert.ok(Buffer.compare(result, parent) === 0);
        });
    });
    describe('validate blocktree', () => {
        it('should report that a valid blocktree is valid', async () => {
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
        });
        it('should report that a blocktree with a missing parent is invalid', async () => {
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
        });
    });
});
