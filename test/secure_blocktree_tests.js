/* eslint-disable no-await-in-loop */
const assert = require('assert');
const constants = require('../src/constants');
const { initSecureBlocktree, initializeSecureRoot, generateKeys } = require('./utils');

describe('Blocktree Layer 3 - Secure Blocktree', () => {
    describe('read secure block', () => {
        it('should return null if no value is found.', async () => {
            // arrange
            const secureBlocktree = initSecureBlocktree();
            await initializeSecureRoot(secureBlocktree);

            // act
            const result = await secureBlocktree.readSecureBlock(constants.block.zero);

            // assert
            assert.strictEqual(null, result);
        });
        it('should retrieve block data if found from the root block.', async () => {
            // arrange
            const secureBlocktree = initSecureBlocktree();
            const { rootBlock } = await initializeSecureRoot(secureBlocktree);

            // act
            const result = await secureBlocktree.readSecureBlock(rootBlock);

            // assert
            assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
            assert.strictEqual(result.prev, null);
            assert.strictEqual(result.parent, null);
            assert.strictEqual(result.type, constants.blockType.keys);
            assert.ok(result.nonce, 'Expected valid nonce value.');
        });
        it('should retrieve block data if found from the root zone.', async () => {
            // arrange
            const secureBlocktree = initSecureBlocktree();
            const { rootBlock, rootZone } = await initializeSecureRoot(secureBlocktree);

            // act
            const result = await secureBlocktree.readSecureBlock(rootZone);

            // assert
            assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
            assert.strictEqual(result.prev, null);
            assert.strictEqual(result.parent, rootBlock);
            assert.strictEqual(result.type, constants.blockType.zone);
            assert.ok(result.nonce, 'Expected valid nonce value.');
        });
        it('should support new zones within the root zone.', async () => {
            // arrange
            const secureBlocktree = initSecureBlocktree();
            const { rootZone, rootZoneKeys } = await initializeSecureRoot(secureBlocktree);
            const sig = await secureBlocktree.signBlock(
                rootZoneKeys[constants.action.write][0], rootZone,
            );
            const keys = await generateKeys();

            // act
            const newZone = await secureBlocktree.createZone({
                sig, block: rootZone, keys, name: 'test zone',
            });
            const result = await secureBlocktree.readSecureBlock(newZone);

            // assert
            assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
            assert.strictEqual(result.prev, null);
            assert.strictEqual(result.parent, rootZone);
            assert.strictEqual(result.type, constants.blockType.zone);
            assert.ok(result.nonce, 'Expected valid nonce value.');
        });
    });
});
