/* eslint-disable no-await-in-loop */
const assert = require('assert');
const constants = require('../src/constants');
const {
    initSecureBlocktree, initializeSecureRoot, generateKeys, signAs,
} = require('./utils');

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
    });
    describe('create zone', () => {
        it('should support new zones within the root zone.', async () => {
            // arrange
            const secureBlocktree = initSecureBlocktree();
            const { rootZone, rootZoneKeys } = await initializeSecureRoot(secureBlocktree);

            // act
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0]),
                name: 'test zone',
            });
            const result = await secureBlocktree.readSecureBlock(newZone);

            // assert
            assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
            assert.strictEqual(result.prev, null);
            assert.strictEqual(result.parent, rootZone);
            assert.strictEqual(result.type, constants.blockType.zone);
            assert.ok(result.nonce, 'Expected valid nonce value.');
        });
        it('should not create a zone without a parent.', async () => {
            // arrange
            const secureBlocktree = initSecureBlocktree();
            const { rootZoneKeys } = await initializeSecureRoot(secureBlocktree);

            // act
            let isExecuted = false;
            try {
                await secureBlocktree.createZone({
                    block: null,
                    sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0]),
                    name: 'test zone',
                });
                isExecuted = true;
            } catch (err) {
                // ignore error.
            }

            // assert
            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should not create a zone adjacent to the root zone.', async () => {
            // arrange
            const secureBlocktree = initSecureBlocktree();
            const { rootBlock, rootZoneKeys } = await initializeSecureRoot(secureBlocktree);

            // act
            let isExecuted = false;
            try {
                await secureBlocktree.createZone({
                    block: rootBlock,
                    sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0]),
                    name: 'test zone',
                });
                isExecuted = true;
            } catch (err) {
                // ignore error.
            }

            // assert
            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should not create a zone without a known signature.', async () => {
            // arrange
            const secureBlocktree = initSecureBlocktree();
            const { rootZone } = await initializeSecureRoot(secureBlocktree);
            const invalidKey = 'blah';

            // act
            let isExecuted = false;
            try {
                await secureBlocktree.createZone({
                    block: rootZone,
                    sig: signAs(secureBlocktree, invalidKey),
                    name: 'test zone',
                });
                isExecuted = true;
            } catch (err) {
                // ignore error.
            }

            // assert
            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should not create a zone with an unassigned key.', async () => {
            // arrange
            const secureBlocktree = initSecureBlocktree();
            const { rootZone, rootZoneKeys } = await initializeSecureRoot(secureBlocktree);
            const newZoneKeys = generateKeys();
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0]),
                name: 'test zone',
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });
            const newKeys = generateKeys();

            // act
            let isExecuted = false;
            try {
                await secureBlocktree.createZone({
                    block: newZone,
                    sig: signAs(secureBlocktree, newKeys[constants.action.write][0]),
                    name: 'this should fail',
                });
                isExecuted = true;
            } catch (err) {
                // ignore error.
            }

            // assert
            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should not create a zone with a revoked key.', async () => {
            // arrange
            const secureBlocktree = initSecureBlocktree();
            const { rootZone, rootZoneKeys } = await initializeSecureRoot(secureBlocktree);
            const newZoneKeys = generateKeys();
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0]),
                name: 'test zone',
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });
            await secureBlocktree.revokeKeys({
                block: newZone,
                sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });

            // act
            let isExecuted = false;
            try {
                await secureBlocktree.createZone({
                    block: newZone,
                    sig: signAs(secureBlocktree, newZoneKeys[constants.action.write][0]),
                    name: 'this should fail',
                });
                isExecuted = true;
            } catch (err) {
                // ignore error.
            }

            // assert
            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
    });
    describe('set keys', () => {
        it('should allow setting keys for a zone using the parent key.', async () => {
            // arrange
            const secureBlocktree = initSecureBlocktree();
            const { rootZone, rootZoneKeys } = await initializeSecureRoot(secureBlocktree);
            const newZoneKeys = generateKeys();
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0]),
                name: 'test zone',
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });
            const newKeys = generateKeys();
            const newZoneHead = await secureBlocktree.getHeadBlock(newZone);

            // act
            const result = await secureBlocktree.setKeys({
                block: newZoneHead,
                sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0]),
                keys: newKeys,
            });

            // assert
            assert.ok(result !== null, 'Expected a valid block to be returned.');
        });
        it('should not allow setting keys without a known signature.', async () => {
            // arrange
            const secureBlocktree = initSecureBlocktree();
            const { rootZone, rootZoneKeys } = await initializeSecureRoot(secureBlocktree);
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0]),
                name: 'test zone',
            });
            const newZoneHead = await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0]),
                keys: generateKeys(),
            });
            const newKeys = generateKeys();
            const invalidKey = 'blah';

            // act
            let isExecuted = false;
            try {
                await secureBlocktree.setKeys({
                    block: newZoneHead,
                    sig: signAs(secureBlocktree, invalidKey),
                    keys: newKeys,
                });
                isExecuted = true;
            } catch (err) {
                // ignore error.
            }

            // assert
            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should not allow setting keys with the blockchain\'s own key.', async () => {
            // arrange
            const secureBlocktree = initSecureBlocktree();
            const { rootZone, rootZoneKeys } = await initializeSecureRoot(secureBlocktree);
            const newZoneKeys = generateKeys();
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0]),
                name: 'test zone',
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });

            // act
            let isExecuted = false;
            try {
                await secureBlocktree.setKeys({
                    block: newZone,
                    sig: signAs(secureBlocktree, newZoneKeys[constants.action.write][0]),
                    keys: generateKeys(),
                });
                isExecuted = true;
            } catch (err) {
                // ignore error.
            }

            // assert
            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should not allow setting keys without a parent.', async () => {
            // arrange
            const secureBlocktree = initSecureBlocktree();
            const { rootKeys } = await initializeSecureRoot(secureBlocktree);
            const newKeys = generateKeys();

            // act
            let isExecuted = false;
            try {
                await secureBlocktree.setKeys({
                    block: null,
                    sig: signAs(secureBlocktree, rootKeys[constants.action.write][0]),
                    keys: newKeys,
                });
                isExecuted = true;
            } catch (err) {
                // ignore error.
            }

            // assert
            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should not allow setting keys onto the root block.', async () => {
            // arrange
            const secureBlocktree = initSecureBlocktree();
            const { rootBlock, rootKeys } = await initializeSecureRoot(secureBlocktree);
            const newKeys = generateKeys();

            // act
            let isExecuted = false;
            try {
                await secureBlocktree.setKeys({
                    block: rootBlock,
                    sig: signAs(secureBlocktree, rootKeys[constants.action.write][0]),
                    keys: newKeys,
                });
                isExecuted = true;
            } catch (err) {
                // ignore error.
            }

            // assert
            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
    });
    describe('revoke keys', () => {
        it('should allow revoke keys for a zone using the parent key.', async () => {
            // arrange
            const secureBlocktree = initSecureBlocktree();
            const { rootZone, rootZoneKeys } = await initializeSecureRoot(secureBlocktree);
            const newZoneKeys = generateKeys();
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0]),
                name: 'test zone',
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });

            // act
            const result = await secureBlocktree.revokeKeys({
                block: newZone,
                sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });

            // assert
            assert.ok(result !== null, 'Expected a valid block to be returned.');
        });
        it('should not allow revoking keys without a known signature.', async () => {
            // arrange
            const secureBlocktree = initSecureBlocktree();
            const { rootZone, rootZoneKeys } = await initializeSecureRoot(secureBlocktree);
            const newZoneKeys = generateKeys();
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0]),
                name: 'test zone',
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });
            const invalidKey = 'blah';

            // act
            let isExecuted = false;
            try {
                await secureBlocktree.revokeKeys({
                    block: newZone,
                    sig: signAs(secureBlocktree, invalidKey),
                    keys: newZoneKeys,
                });
                isExecuted = true;
            } catch (err) {
                // ignore error.
            }

            // assert
            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should not allow revoking keys with the blockchain\'s own key.', async () => {
            // arrange
            const secureBlocktree = initSecureBlocktree();
            const { rootZone, rootZoneKeys } = await initializeSecureRoot(secureBlocktree);
            const newZoneKeys = generateKeys();
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0]),
                name: 'test zone',
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });

            // act
            let isExecuted = false;
            try {
                await secureBlocktree.revokeKeys({
                    block: newZone,
                    sig: signAs(secureBlocktree, newZoneKeys[constants.action.write][0]),
                    keys: newZoneKeys,
                });
                isExecuted = true;
            } catch (err) {
                // ignore error.
            }

            // assert
            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
    });
});
