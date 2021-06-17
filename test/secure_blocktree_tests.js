/* eslint-disable no-await-in-loop */
const assert = require('assert');
const constants = require('../src/constants');
const { InvalidBlockError, InvalidSignatureError } = require('../src/errors');
const {
    initSecureBlocktree, initializeSecureRoot, generateTestKeys, signAs, getPrivateKey,
    getEncryption,
} = require('./test-helper');

describe('Blocktree Layer 3 - Secure Blocktree', () => {
    let secureBlocktree; let encryption; let
        secureRoot;
    let rootKeys; let
        rootZoneKeys;

    before(async () => {
        encryption = getEncryption();
        rootKeys = await generateTestKeys(encryption);
        rootZoneKeys = await generateTestKeys(encryption);
    });

    beforeEach(async () => {
        secureBlocktree = initSecureBlocktree(encryption);
        secureRoot = await initializeSecureRoot(secureBlocktree, rootKeys, rootZoneKeys);
    });

    describe('read secure block', () => {
        it('should return null if no value is found', async () => {
            const result = await secureBlocktree.readSecureBlock(constants.block.zero);
            assert.strictEqual(null, result);
        });
        it('should retrieve block data if found from the root block', async () => {
            const { rootBlock } = secureRoot;
            const result = await secureBlocktree.readSecureBlock(rootBlock);

            assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
            assert.strictEqual(result.prev, null);
            assert.strictEqual(result.parent, null);
            assert.strictEqual(result.type, constants.blockType.keys);
            assert.ok(result.nonce, 'Expected valid nonce value.');
        });
        it('should retrieve block data if found from the root zone', async () => {
            const { rootBlock, rootZone } = secureRoot;
            const result = await secureBlocktree.readSecureBlock(rootZone);

            assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
            assert.strictEqual(result.prev, null);
            assert.strictEqual(result.parent, rootBlock);
            assert.strictEqual(result.type, constants.blockType.zone);
            assert.ok(result.nonce, 'Expected valid nonce value.');
        });
    });
    describe('create zone', () => {
        it('should succeed within the root zone', async () => {
            const { rootZone } = secureRoot;
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
            });
            const result = await secureBlocktree.readSecureBlock(newZone);

            assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
            assert.strictEqual(result.prev, null);
            assert.strictEqual(result.parent, rootZone);
            assert.strictEqual(result.type, constants.blockType.zone);
            assert.ok(result.nonce, 'Expected valid nonce value.');
        });
        it('should fail without a parent', async () => {
            let isExecuted = false;
            try {
                await secureBlocktree.createZone({
                    block: null,
                    sig: signAs(secureBlocktree, getPrivateKey(
                        rootZoneKeys[constants.action.write][0],
                    )),
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidBlockError);
                assert.strictEqual(err.layer, constants.layer.secureBlocktree);
                assert.strictEqual(err.reason, InvalidBlockError.reasons.isNull);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should fail adjacent to the root zone', async () => {
            const { rootBlock } = secureRoot;
            let isExecuted = false;
            try {
                await secureBlocktree.createZone({
                    block: rootBlock,
                    sig: signAs(secureBlocktree, getPrivateKey(
                        rootZoneKeys[constants.action.write][0],
                    )),
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidSignatureError);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should fail without a known signature', async () => {
            const invalidKey = await generateTestKeys(encryption);
            const privateKey = getPrivateKey(invalidKey[constants.action.write][0]);
            const { rootZone } = secureRoot;
            let isExecuted = false;
            try {
                await secureBlocktree.createZone({
                    block: rootZone,
                    sig: signAs(secureBlocktree, privateKey),
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidSignatureError);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should fail with an unassigned key', async () => {
            const { rootZone } = secureRoot;
            const newZoneKeys = await generateTestKeys(encryption);
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
                parentKey: rootZoneKeys[constants.action.write][0],
                keys: newZoneKeys,
            });
            const newKeys = await generateTestKeys(encryption);
            let isExecuted = false;
            try {
                await secureBlocktree.createZone({
                    block: newZone,
                    sig: signAs(secureBlocktree, getPrivateKey(
                        newKeys[constants.action.write][0],
                    )),
                    name: 'this should fail',
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidSignatureError);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should fail with a revoked key', async () => {
            const { rootZone } = secureRoot;
            const newZoneKeys = await generateTestKeys(encryption);
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
                parentKey: rootZoneKeys[constants.action.write][0],
                keys: newZoneKeys,
            });
            await secureBlocktree.revokeKeys({
                block: newZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
                parentKey: rootZoneKeys[constants.action.write][0],
                keys: newZoneKeys,
            });
            let isExecuted = false;
            try {
                await secureBlocktree.createZone({
                    block: newZone,
                    sig: signAs(secureBlocktree, getPrivateKey(
                        newZoneKeys[constants.action.write][0],
                    )),
                    name: 'this should fail',
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidSignatureError);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
    });
    describe('set keys', () => {
        it('should succeed for a zone using the parent key', async () => {
            const { rootZone } = secureRoot;
            const newZoneKeys = await generateTestKeys(encryption);
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
                parentKey: rootZoneKeys[constants.action.write][0],
                keys: newZoneKeys,
            });
            const newKeys = await generateTestKeys(encryption);
            const newZoneHead = await secureBlocktree.getHeadBlock(newZone);
            const result = await secureBlocktree.setKeys({
                block: newZoneHead,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
                parentKey: rootZoneKeys[constants.action.write][0],
                keys: newKeys,
            });

            assert.ok(result !== null, 'Expected a valid block to be returned.');
        });
        it('should succeed for a zone using the root key', async () => {
            const { rootZone } = secureRoot;
            const newZoneKeys = await generateTestKeys(encryption);
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
                parentKey: rootZoneKeys[constants.action.write][0],
                keys: newZoneKeys,
            });
            const newKeys = await generateTestKeys(encryption);
            const newZoneHead = await secureBlocktree.getHeadBlock(newZone);
            const result = await secureBlocktree.setKeys({
                block: newZoneHead,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootKeys[constants.action.write][0],
                )),
                parentKey: rootKeys[constants.action.write][0],
                keys: newKeys,
            });

            assert.ok(result !== null, 'Expected a valid block to be returned.');
        });
        it('should fail for a zone with an inconsistent signature', async () => {
            const { rootZone } = secureRoot;
            const newZoneKeys = await generateTestKeys(encryption);
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
                parentKey: rootZoneKeys[constants.action.write][0],
                keys: newZoneKeys,
            });
            const newKeys = await generateTestKeys(encryption);
            const newZoneHead = await secureBlocktree.getHeadBlock(newZone);
            let isExecuted = false;
            try {
                await secureBlocktree.setKeys({
                    block: newZoneHead,
                    sig: signAs(secureBlocktree, getPrivateKey(
                        rootZoneKeys[constants.action.write][0],
                    )),
                    parentKey: rootKeys[constants.action.write][0],
                    keys: newKeys,
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidSignatureError);
                assert.strictEqual(err.reason, InvalidSignatureError.reasons.inconsistent);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should fail without a known signature', async () => {
            const invalidKey = await generateTestKeys(encryption);
            const privateKey = getPrivateKey(invalidKey[constants.action.write][0]);
            const { rootZone } = secureRoot;
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
            });
            const newZoneHead = await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
                parentKey: rootZoneKeys[constants.action.write][0],
                keys: await generateTestKeys(encryption),
            });
            const newKeys = await generateTestKeys(encryption);
            let isExecuted = false;
            try {
                await secureBlocktree.setKeys({
                    block: newZoneHead,
                    sig: signAs(secureBlocktree, privateKey),
                    parentKey: invalidKey[constants.action.write][0],
                    keys: newKeys,
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidSignatureError);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should fail with the blockchain\'s own key', async () => {
            const { rootZone } = secureRoot;
            const newZoneKeys = await generateTestKeys(encryption);
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
                parentKey: rootZoneKeys[constants.action.write][0],
                keys: newZoneKeys,
            });
            let isExecuted = false;
            try {
                await secureBlocktree.setKeys({
                    block: newZone,
                    sig: signAs(secureBlocktree, getPrivateKey(
                        newZoneKeys[constants.action.write][0],
                    )),
                    parentKey: rootZoneKeys[constants.action.write][0],
                    keys: await generateTestKeys(encryption),
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidSignatureError);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should fail without a parent', async () => {
            const newKeys = await generateTestKeys(encryption);
            let isExecuted = false;
            try {
                await secureBlocktree.setKeys({
                    block: null,
                    sig: signAs(secureBlocktree, getPrivateKey(
                        rootKeys[constants.action.write][0],
                    )),
                    parentKey: rootKeys[constants.action.write][0],
                    keys: newKeys,
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidBlockError);
                assert.strictEqual(err.layer, constants.layer.secureBlocktree);
                assert.strictEqual(err.reason, InvalidBlockError.reasons.isNull);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should fail onto the root block', async () => {
            const { rootBlock } = secureRoot;
            const newKeys = await generateTestKeys(encryption);
            let isExecuted = false;
            try {
                await secureBlocktree.setKeys({
                    block: rootBlock,
                    sig: signAs(secureBlocktree, getPrivateKey(
                        rootKeys[constants.action.write][0],
                    )),
                    parentKey: rootKeys[constants.action.write][0],
                    keys: newKeys,
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidBlockError);
                assert.strictEqual(err.layer, constants.layer.secureBlocktree);
                assert.strictEqual(err.reason, InvalidBlockError.reasons.isNull);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
    });
    describe('revoke keys', () => {
        it('should succeed for a zone using the parent key', async () => {
            const { rootZone } = secureRoot;
            const newZoneKeys = await generateTestKeys(encryption);
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
                parentKey: rootZoneKeys[constants.action.write][0],
                keys: newZoneKeys,
            });
            const result = await secureBlocktree.revokeKeys({
                block: newZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
                parentKey: rootZoneKeys[constants.action.write][0],
                keys: newZoneKeys,
            });

            assert.ok(result !== null, 'Expected a valid block to be returned.');
        });
        it('should fail without a known signature', async () => {
            const invalidKey = await generateTestKeys(encryption);
            const privateKey = getPrivateKey(invalidKey[constants.action.write][0]);
            const { rootZone } = secureRoot;
            const newZoneKeys = await generateTestKeys(encryption);
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
                parentKey: rootZoneKeys[constants.action.write][0],
                keys: newZoneKeys,
            });
            let isExecuted = false;
            try {
                await secureBlocktree.revokeKeys({
                    block: newZone,
                    sig: signAs(secureBlocktree, privateKey),
                    parentKey: invalidKey[constants.action.write][0],
                    keys: newZoneKeys,
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidSignatureError);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should fail with the blockchain\'s own key', async () => {
            const { rootZone } = secureRoot;
            const newZoneKeys = await generateTestKeys(encryption);
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
                parentKey: rootZoneKeys[constants.action.write][0],
                keys: newZoneKeys,
            });
            let isExecuted = false;
            try {
                await secureBlocktree.revokeKeys({
                    block: newZone,
                    sig: signAs(secureBlocktree, getPrivateKey(
                        newZoneKeys[constants.action.write][0],
                    )),
                    parentKey: newZoneKeys[constants.action.write][0],
                    keys: newZoneKeys,
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidSignatureError);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
    });
    describe('set options', () => {
        it('should succeed for a zone using the parent key', async () => {
            const { rootZone } = secureRoot;
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
            });
            const result = await secureBlocktree.setOptions({
                block: newZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
                options: { name: 'NEW NAME' },
            });

            assert.ok(result !== null, 'Expected a valid block to be returned.');
        });
        it('should succeed for a zone using the root key', async () => {
            const { rootZone } = secureRoot;
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
            });
            const result = await secureBlocktree.setOptions({
                block: newZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootKeys[constants.action.write][0],
                )),
                options: { name: 'NEW NAME' },
            });

            assert.ok(result !== null, 'Expected a valid block to be returned.');
        });
        it('should fail without a known signature', async () => {
            const invalidKey = await generateTestKeys(encryption);
            const privateKey = getPrivateKey(invalidKey[constants.action.write][0]);
            const { rootZone } = secureRoot;
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
            });
            let isExecuted = false;
            try {
                await secureBlocktree.setOptions({
                    block: newZone,
                    sig: signAs(secureBlocktree, privateKey),
                    options: { name: 'NEW NAME' },
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidSignatureError);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should fail with the blockchain\'s own key', async () => {
            const { rootZone } = secureRoot;
            const newZoneKeys = await generateTestKeys(encryption);
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
                name: 'test zone',
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree, getPrivateKey(
                    rootZoneKeys[constants.action.write][0],
                )),
                parentKey: rootZoneKeys[constants.action.write][0],
                keys: newZoneKeys,
            });
            let isExecuted = false;
            try {
                await secureBlocktree.setOptions({
                    block: newZone,
                    sig: signAs(secureBlocktree, getPrivateKey(
                        newZoneKeys[constants.action.write][0],
                    )),
                    options: { name: 'NEW NAME' },
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidSignatureError);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should fail without a parent', async () => {
            let isExecuted = false;
            try {
                await secureBlocktree.setOptions({
                    block: null,
                    sig: signAs(secureBlocktree, getPrivateKey(
                        rootKeys[constants.action.write][0],
                    )),
                    options: { name: 'NEW NAME' },
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidBlockError);
                assert.strictEqual(err.layer, constants.layer.secureBlocktree);
                assert.strictEqual(err.reason, InvalidBlockError.reasons.isNull);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should fail onto the root block', async () => {
            const { rootBlock } = secureRoot;
            let isExecuted = false;
            try {
                await secureBlocktree.setOptions({
                    block: rootBlock,
                    sig: signAs(secureBlocktree, getPrivateKey(
                        rootKeys[constants.action.write][0],
                    )),
                    options: { name: 'NEW NAME' },
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidBlockError);
                assert.strictEqual(err.layer, constants.layer.secureBlocktree);
                assert.strictEqual(err.reason, InvalidBlockError.reasons.isNull);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
    });
});
