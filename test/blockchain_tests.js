/* eslint-disable no-await-in-loop */
const assert = require('assert');
const constants = require('../src/constants');
const { InvalidBlockError } = require('../src/errors');
const { initBlockchain, getRandomHash } = require('./test-helper');

describe('Blocktree Layer 1 - Blockchain', () => {
    describe('read block', () => {
        it('should return null if no value is found', async () => {
            // arrange
            const blockchain = initBlockchain();

            // act
            const result = await blockchain.readBlock(constants.block.zero);

            // assert
            assert.strictEqual(null, result);
        });
        it('should return null if no value is found', async () => {
            // arrange
            const blockchain = initBlockchain();

            // act
            const result = await blockchain.readBlock(null);

            // assert
            assert.strictEqual(null, result);
        });
        it('should return null if no value is found', async () => {
            // arrange
            const blockchain = initBlockchain();

            // act
            const result = await blockchain.readBlock(false);

            // assert
            assert.strictEqual(null, result);
        });
        it('should retrieve block data if found from a root', async () => {
            // arrange
            const blockchain = initBlockchain();
            const data = Buffer.from("I'm a string!", 'utf-8');
            const block1 = await blockchain.writeBlock({ prev: null, data });

            // act
            const result = await blockchain.readBlock(block1);

            // assert
            assert.ok(Buffer.compare(data, result.data) === 0, 'Expected data to match.');
            assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
            assert.strictEqual(result.prev, null);
            assert.ok(result.nonce, 'Expected valid nonce value.');
        });
        it('should retrieve block data if found from a block in a chain', async () => {
            // arrange
            const blockchain = initBlockchain();
            const data1 = Buffer.from("I'm a string!", 'utf-8');
            const block1 = await blockchain.writeBlock({ prev: null, data: data1 });
            const data2 = Buffer.from("I'm another string!", 'utf-8');
            const block2 = await blockchain.writeBlock({ prev: block1, data: data2 });

            // act
            const result = await blockchain.readBlock(block2);

            // assert
            assert.ok(Buffer.compare(data2, result.data) === 0, 'Expected data to match.');
            assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
            assert.strictEqual(result.prev, block1);
            assert.ok(result.nonce, 'Expected valid nonce value.');
        });
    });
    describe('write block', () => {
        it('should ignore user-provided values other than prev and data', async () => {
            // arrange
            const blockchain = initBlockchain();
            const data = Buffer.from("I'm a string!", 'utf-8');
            const block1 = await blockchain.writeBlock({
                prev: null, data, timestamp: 0, nonce: 0, hash: 'ff',
            });

            // act
            const result = await blockchain.readBlock(block1);

            // assert
            assert.ok(Buffer.compare(data, result.data) === 0, 'Expected data to match.');
            assert.ok(result.timestamp !== 0, 'Expected timestamp to be valid.');
            assert.strictEqual(result.prev, null);
            assert.ok(result.hash !== 'ff', 'Expected prev pointer to be null.');
            assert.ok(result.nonce !== 0, 'Expected valid nonce value.');
        });
        it('should support 100 blocks in a chain', async () => {
            // arrange
            const blockchain = initBlockchain();
            const data = Buffer.from("I'm a string!", 'utf-8');
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
            assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
            assert.ok(prev.timestamp > 0, 'Expected timestamp to be valid.');
            assert.strictEqual(result.prev, prev.hash);
            assert.ok(result.nonce, 'Expected valid nonce value.');
            assert.ok(prev.nonce, 'Expected valid nonce value.');
        });
        it('should throw an exception if writing to an invalid blockchain', async () => {
            // arrange
            const blockchain = initBlockchain();
            const options = { validate: true };
            const block1 = getRandomHash();
            const data2 = Buffer.from("I'm another string!", 'utf-8');

            // act
            let isExecuted = false;
            try {
                await blockchain.writeBlock({ prev: block1, data: data2 }, options);
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidBlockError);
                assert.strictEqual(err.layer, constants.layer.blockchain);
                assert.strictEqual(err.reason, InvalidBlockError.reasons.isNull);
            }

            // assert
            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should throw an exception if writing to a blockchain with a newer timestamp', async () => {
            // arrange
            const blockchain = initBlockchain();
            const options = { validate: true };
            const data1 = Buffer.from("I'm a string!", 'utf-8');
            const block1 = await blockchain.writeBlock({ prev: null, data: data1 }, options);
            const data2 = Buffer.from("I'm another string!", 'utf-8');

            // act
            let isExecuted = false;
            try {
                blockchain.mocks.os.setNextTimestamp(0);
                await blockchain.writeBlock({ prev: block1, data: data2 }, options);
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidBlockError);
                assert.strictEqual(err.layer, constants.layer.blockchain);
                assert.strictEqual(err.reason, InvalidBlockError.reasons.invalidTimestamp);
            }

            // assert
            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should throw an exception if writing to a blockchain with another block present', async () => {
            // arrange
            const blockchain = initBlockchain();
            const options = { validate: true };
            const data1 = Buffer.from("I'm a string!", 'utf-8');
            const block1 = await blockchain.writeBlock({ prev: null, data: data1 }, options);
            const data2 = Buffer.from("I'm another string!", 'utf-8');
            await blockchain.writeBlock({ prev: block1, data: data1 }, options);

            // act
            let isExecuted = false;
            try {
                await blockchain.writeBlock({ prev: block1, data: data2 }, options);
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidBlockError);
                assert.strictEqual(err.layer, constants.layer.blockchain);
                assert.strictEqual(err.reason, InvalidBlockError.reasons.nextBlockExists);
            }

            // assert
            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
    });
    describe('list blocks', () => {
        it('should list all blocks', async () => {
            // arrange
            const blockCount = 50;
            const blockchain = initBlockchain();
            const data = Buffer.from("I'm a string!", 'utf-8');
            let block = null;
            for (let i = 0; i < blockCount; i += 1) {
                block = await blockchain.writeBlock({ prev: block, data });
            }

            // act
            const result = await blockchain.listBlocks();

            // assert
            assert.ok(Array.isArray(result), 'Expected result to be an array.');
            assert.strictEqual(result.length, blockCount);
            assert.ok(result.includes(block));
        });
        it('should list blocks matching a partial hash', async () => {
            // arrange
            const blockCount = 50;
            const blockchain = initBlockchain();
            const data = Buffer.from("I'm a string!", 'utf-8');
            let block = null;
            for (let i = 0; i < blockCount; i += 1) {
                block = await blockchain.writeBlock({ prev: block, data });
            }

            // act
            const partial = block.substring(0, 10);
            const result = await blockchain.listBlocks(partial);

            // assert
            assert.ok(Array.isArray(result), 'Expected result to be an array.');
            assert.strictEqual(result.length, 1);
            assert.ok(result.includes(block));
        });
        it('should return an empty array if no partial matches are found', async () => {
            // arrange
            const blockCount = 50;
            const blockchain = initBlockchain();
            const data = Buffer.from("I'm a string!", 'utf-8');
            let block = null;
            for (let i = 0; i < blockCount; i += 1) {
                block = await blockchain.writeBlock({ prev: block, data });
            }

            // act
            const partial = '000000000000000000000000';
            const result = await blockchain.listBlocks(partial);

            // assert
            assert.ok(Array.isArray(result), 'Expected result to be an array.');
            assert.strictEqual(result.length, 0);
        });
    });
    describe('count blocks', () => {
        it('should return zero if no blocks have been added', async () => {
            // arrange
            const blockchain = initBlockchain();

            // act
            const result = await blockchain.countBlocks();

            // assert
            assert.strictEqual(result, 0);
        });
        it('should return the number of blocks in the system', async () => {
            // arrange
            const blockCount = 50;
            const blockchain = initBlockchain();
            const data = Buffer.from("I'm a string!", 'utf-8');
            let block = null;
            for (let i = 0; i < blockCount; i += 1) {
                block = await blockchain.writeBlock({ prev: block, data });
            }

            // act
            const result = await blockchain.countBlocks();

            // assert
            assert.strictEqual(result, blockCount);
        });
    });
    describe('get next block', () => {
        it('should scan the blocks to find the next one in the chain', async () => {
            // arrange
            const blockchain = initBlockchain();
            const data = Buffer.from("I'm a string!", 'utf-8');
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
            assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
            assert.ok(prev.timestamp > 0, 'Expected timestamp to be valid.');
            assert.strictEqual(result.prev, prev.hash);
            assert.ok(result.nonce, 'Expected valid nonce value.');
            assert.ok(prev.nonce, 'Expected valid nonce value.');
        });
        it('should return null if there are no more blocks in the chain', async () => {
            // arrange
            const blockchain = initBlockchain();
            const data = Buffer.from("I'm a string!", 'utf-8');
            const block = await blockchain.writeBlock({
                prev: null, data, timestamp: 0, nonce: 0, hash: 'ff',
            });
            const result = await blockchain.readBlock(block);

            // act
            const next = await blockchain.getNextBlock(block);

            // assert
            assert.strictEqual(next, null);
            assert.ok(Buffer.compare(data, result.data) === 0, 'Expected data to match.');
            assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
            assert.ok(result.nonce, 'Expected valid nonce value.');
        });
    });
    describe('get head block', () => {
        it('should scan the blocks to find the last one in the chain', async () => {
            // arrange
            const blockchain = initBlockchain();
            const data = Buffer.from("I'm a string!", 'utf-8');
            let block = null; let
                first = null;
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
        it('should return null if there is not a valid block', async () => {
            // arrange
            const blockchain = initBlockchain();
            const head = await blockchain.getHeadBlock(constants.block.zero);

            // assert
            assert.strictEqual(head, null);
        });
    });
    describe('get root block', () => {
        it('should walk across the blocks to find the first one in the chain', async () => {
            // arrange
            const blockchain = initBlockchain();
            const data = Buffer.from("I'm a string!", 'utf-8');
            let block = null; let
                first = null;
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
        it('should return null if there is not a valid block', async () => {
            // act
            const blockchain = initBlockchain();
            const root = await blockchain.getRootBlock(0);

            // assert
            assert.strictEqual(root, null);
        });
    });
    describe('validate blockchain', () => {
        it('should report that a valid blockchain is valid', async () => {
            // arrange
            const blockchain = initBlockchain();
            const data1 = Buffer.from("I'm a string!", 'utf-8');
            const block1 = await blockchain.writeBlock({ prev: null, data: data1 });
            const data2 = Buffer.from("I'm another string!", 'utf-8');
            const block2 = await blockchain.writeBlock({ prev: block1, data: data2 });

            // act
            const result = await blockchain.validateBlockchain(block2);

            // assert
            assert.strictEqual(result.isValid, true);
            assert.strictEqual(result.blockCount, 2);
            assert.strictEqual(result.reason, undefined);
            assert.strictEqual(result.block, undefined);
        });
        it('should report that a blockchain missing a block is invalid', async () => {
            // arrange
            const blockchain = initBlockchain();
            const options = { validate: false };
            const block1 = getRandomHash();
            const data2 = Buffer.from("I'm another string!", 'utf-8');
            const block2 = await blockchain.writeBlock({ prev: block1, data: data2 }, options);

            // act
            const result = await blockchain.validateBlockchain(block2);

            // assert
            assert.strictEqual(result.isValid, false);
            assert.strictEqual(result.blockCount, 2);
            assert.strictEqual(result.reason, constants.validation.missingBlock);
            assert.strictEqual(result.block, block1);
        });
        it('should report that a blockchain with inconsistent timestamps is invalid', async () => {
            // arrange
            const blockchain = initBlockchain();
            const options = { validate: false };
            const data1 = Buffer.from("I'm a string!", 'utf-8');
            const block1 = await blockchain.writeBlock({ prev: null, data: data1 });
            const data2 = Buffer.from("I'm another string!", 'utf-8');
            blockchain.mocks.os.setNextTimestamp(0n);
            const block2 = await blockchain.writeBlock({ prev: block1, data: data2 }, options);

            // act
            const result = await blockchain.validateBlockchain(block2);

            // assert
            assert.strictEqual(result.isValid, false);
            assert.strictEqual(result.blockCount, 2);
            assert.strictEqual(result.reason, constants.validation.invalidTimestamp);
            assert.strictEqual(result.block, block1);
        });
    });
});
