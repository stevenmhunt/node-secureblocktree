const assert = require('assert');
const blockchain = require('../src/layers/blockchain');
const system = require('../src/layers/system');
const constants = require('../src/constants');

describe('blocktree API layer 1 - [blockchain]', function () {
    describe('read block', function () {
        it('should return null if no value is found.', async function () {
            // act
            const result = await blockchain.readBlock(0);

            // assert
            assert.strictEqual(null, result);
        });
        it('should return null if no value is found.', async function () {
            // act
            const result = await blockchain.readBlock(null);

            // assert
            assert.strictEqual(null, result);
        });
        it('should return null if no value is found.', async function () {
            // act
            const result = await blockchain.readBlock(false);

            // assert
            assert.strictEqual(null, result);
        });
        it('should retrieve block data if found from a root.', async function () {
            // arrange
            const data = Buffer.from("I'm a string!", "utf-8");
            const block1 = await blockchain.writeBlock({ prev: null, data });

            // act
            const result = await blockchain.readBlock(block1);

            // assert
            assert.ok(Buffer.compare(data, result.data) === 0, 'Expected data to match.');
            assert.ok(result.timestamp >= system.generateTimestamp(), 'Expected timestamp to be valid.');
            assert.strictEqual(result.prev, null);
            assert.ok(result.nonce, 'Expected valid nonce value.');
        });
        it('should retrieve block data if found from a block in a chain.', async function () {
            // arrange
            const data1 = Buffer.from("I'm a string!", "utf-8");
            const block1 = await blockchain.writeBlock({ prev: null, data: data1 });
            const data2 = Buffer.from("I'm another string!", "utf-8");
            const block2 = await blockchain.writeBlock({ prev: block1, data: data2 });

            // act
            const result = await blockchain.readBlock(block2);

            // assert
            assert.ok(Buffer.compare(data2, result.data) === 0, 'Expected data to match.');
            assert.ok(result.timestamp >= system.generateTimestamp(), 'Expected timestamp to be valid.');
            assert.strictEqual(result.prev, block1);
            assert.ok(result.nonce, 'Expected valid nonce value.');
        });
    });
    describe('write block', function () {
        it('should ignore user-provided values other than prev and data.', async function () {
            // arrange
            const data = Buffer.from("I'm a string!", "utf-8");
            const block1 = await blockchain.writeBlock({ prev: null, data, timestamp: 0, nonce: 0, hash: 'ff' });

            // act
            const result = await blockchain.readBlock(block1);

            // assert
            assert.ok(Buffer.compare(data, result.data) === 0, 'Expected data to match.');
            assert.ok(result.timestamp !== 0, 'Expected timestamp to be valid.');
            assert.strictEqual(result.prev, null);
            assert.ok(result.hash !== 'ff', 'Expected prev pointer to be null.');
            assert.ok(result.nonce !== 0, 'Expected valid nonce value.');
        });
        it('should support large numbers of blocks in a chain.', async function () {
            // arrange
            const data = Buffer.from("I'm a string!", "utf-8");
            let block = null;
            for (let i = 0; i < 100; i += 1) {
                block = await blockchain.writeBlock({ prev: block, data });
            }

            // act
            const result = await blockchain.readBlock(block);
            const prev = await blockchain.readBlock(result.prev);

            // assert
            assert.ok(Buffer.compare(data, result.data) === 0, 'Expected data to match.');
            assert.ok(Buffer.compare(data, prev.data) === 0, 'Expected data to match.');
            assert.ok(result.timestamp >= system.generateTimestamp(), 'Expected timestamp to be valid.');
            assert.ok(prev.timestamp >= system.generateTimestamp(), 'Expected timestamp to be valid.');
            assert.strictEqual(result.prev, prev.hash);
            assert.ok(result.nonce, 'Expected valid nonce value.');
            assert.ok(prev.nonce, 'Expected valid nonce value.');
        });
        it('should throw an exception if writing to an invalid blockchain if validation is enabled.', async function () {
            // arrange
            const options = { validate: true };
            const block1 = "aaaaaaaaaaaaaaaaaaaaaaaa";
            const data2 = Buffer.from("I'm another string!", "utf-8");

            // act
            let isExecuted = false;
            try {
                await blockchain.writeBlock({ prev: block1, data: data2 }, options);
                isExecuted = true;
            }
            catch (err) {
                // ignore error.
            }

            // assert
            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should not throw an exception if writing to an invalid blockchain if validation is disabled.', async function () {
            // arrange
            const options = { validate: false };
            const block1 = "aaaaaaaaaaaaaaaaaaaaaaaa";
            const data2 = Buffer.from("I'm another string!", "utf-8");

            // act
            let isExecuted = false;
            try {
                await blockchain.writeBlock({ prev: block1, data: data2 }, options);
                isExecuted = true;
            }
            catch (err) {
                // ignore error.
            }

            // assert
            assert.strictEqual(isExecuted, true, 'Expected an exception to not be thrown.');
        });
    });
    describe('get next block', function () {
        it('should scan the blocks to find the next one in the chain.', async function () {
            // arrange
            const data = Buffer.from("I'm a string!", "utf-8");
            let block = null;
            for (let i = 0; i < 100; i += 1) {
                block = await blockchain.writeBlock({ prev: block, data });
            }
            const result = await blockchain.readBlock(block);
            const prev = await blockchain.readBlock(result.prev);

            // act
            const next = await blockchain.getNextBlock(result.prev);

            // assert
            assert.strictEqual(next, block);
            assert.ok(Buffer.compare(data, result.data) === 0, 'Expected data to match.');
            assert.ok(Buffer.compare(data, prev.data) === 0, 'Expected data to match.');
            assert.ok(result.timestamp >= system.generateTimestamp(), 'Expected timestamp to be valid.');
            assert.ok(prev.timestamp >= system.generateTimestamp(), 'Expected timestamp to be valid.');
            assert.strictEqual(result.prev, prev.hash);
            assert.ok(result.nonce, 'Expected valid nonce value.');
            assert.ok(prev.nonce, 'Expected valid nonce value.');
        });
        it('should return null if there are no more blocks in the chain.', async function () {
            // arrange
            const data = Buffer.from("I'm a string!", "utf-8");
            const block = await blockchain.writeBlock({ prev: null, data, timestamp: 0, nonce: 0, hash: 'ff' });
            const result = await blockchain.readBlock(block);

            // act
            const next = await blockchain.getNextBlock(block);

            // assert
            assert.strictEqual(next, null);
            assert.ok(Buffer.compare(data, result.data) === 0, 'Expected data to match.');
            assert.ok(result.timestamp >= system.generateTimestamp(), 'Expected timestamp to be valid.');
            assert.ok(result.nonce, 'Expected valid nonce value.');
        });
    });
    describe('get head block', function () {
        it('should scan the blocks to find the last one in the chain.', async function () {
            // arrange
            const data = Buffer.from("I'm a string!", "utf-8");
            let block = null, first = null;
            for (let i = 0; i < 100; i += 1) {
                block = await blockchain.writeBlock({ prev: block, data });
                if (i === 0) {
                    first = block;
                }
            }
            const result = await blockchain.readBlock(block);

            // act
            const head = await blockchain.getHeadBlock(first);
            const headBlock = await blockchain.readBlock(head);

            // assert
            assert.ok(head !== null);
            assert.strictEqual(headBlock.prev, result.prev);
            assert.strictEqual(headBlock.timestamp, result.timestamp);
            assert.strictEqual(headBlock.nonce, result.nonce);
            assert.ok(Buffer.compare(data, result.data) === 0, 'Expected data to match.');
        });
        it('should return null if there is not a valid block.', async function () {
            // act
            const head = await blockchain.getHeadBlock(0);

            // assert
            assert.strictEqual(head, null);
        });
    });
    describe('get root block', function () {
        it('should walk across the blocks to find the first one in the chain.', async function () {
            // arrange
            const data = Buffer.from("I'm a string!", "utf-8");
            let block = null, first = null;
            for (let i = 0; i < 100; i += 1) {
                block = await blockchain.writeBlock({ prev: block, data });
                if (i === 0) {
                    first = block;
                }
            }

            // act
            const root = await blockchain.getRootBlock(block);
            const rootBlock = await blockchain.readBlock(root);

            // assert
            assert.ok(root !== null);
            assert.strictEqual(root, first);
            assert.ok(rootBlock !== null);
            assert.strictEqual(rootBlock.prev, null);
        });
        it('should return null if there is not a valid block.', async function () {
            // act
            const root = await blockchain.getRootBlock(0);

            // assert
            assert.strictEqual(root, null);
        });
    });
    describe('validate blockchain', function () {
        it('should report that a valid blockchain is valid.', async function () {
            // arrange
            const data1 = Buffer.from("I'm a string!", "utf-8");
            const block1 = await blockchain.writeBlock({ prev: null, data: data1 });
            const data2 = Buffer.from("I'm another string!", "utf-8");
            const block2 = await blockchain.writeBlock({ prev: block1, data: data2 });

            // act
            const result = await blockchain.validateBlockchain(block2);

            // assert
            assert.strictEqual(result.isValid, true);
            assert.strictEqual(result.blockCount, 2);
            assert.strictEqual(result.reason, undefined);
            assert.strictEqual(result.block, undefined);
        });
        it('should report that an invalid blockchain is invalid.', async function () {
            // arrange
            const options = { validate: false };
            const block1 = "aaaaaaaaaaaaaaaaaaaaaaaa";
            const data2 = Buffer.from("I'm another string!", "utf-8");
            const block2 = await blockchain.writeBlock({ prev: block1, data: data2 }, options);

            // act
            const result = await blockchain.validateBlockchain(block2);

            // assert
            assert.strictEqual(result.isValid, false);
            assert.strictEqual(result.blockCount, 1);
            assert.strictEqual(result.reason, constants.validation.missingBlock);
            assert.strictEqual(result.block, block1);
        });
    });
});