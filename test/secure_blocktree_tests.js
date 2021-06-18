/* eslint-disable no-await-in-loop */
const assert = require('assert');
const constants = require('../src/constants');
const { InvalidBlockError, InvalidSignatureError } = require('../src/errors');
const {
    initSecureBlocktree, initializeSecureRoot, generateTestKeys, signAs,
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
            assert.strictEqual(result.type, constants.blockType.root);
            assert.ok(result.nonce, 'Expected valid nonce value.');
        });
        it('should retrieve block data if found from the root zone', async () => {
            const { rootBlock, rootZone } = secureRoot;
            const result = await secureBlocktree.readSecureBlock(rootZone);

            assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
            assert.strictEqual(result.prev, null);
            assert.ok(Buffer.compare(result.parent, rootBlock) === 0);
            assert.strictEqual(result.type, constants.blockType.zone);
            assert.ok(result.nonce, 'Expected valid nonce value.');
        });
    });
    describe('create zone', () => {
        it('should succeed within the root zone', async () => {
            const { rootZone } = secureRoot;
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            const result = await secureBlocktree.readSecureBlock(newZone);

            assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
            assert.strictEqual(result.prev, null);
            assert.ok(Buffer.compare(result.parent, rootZone) === 0);
            assert.strictEqual(result.type, constants.blockType.zone);
            assert.ok(result.nonce, 'Expected valid nonce value.');
        });
        it('should fail without a parent', async () => {
            let isExecuted = false;
            try {
                await secureBlocktree.createZone({
                    block: null,
                    sig: signAs(secureBlocktree,
                        rootZoneKeys[constants.action.write][0]),
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
                    sig: signAs(secureBlocktree,
                        rootZoneKeys[constants.action.write][0]),
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidSignatureError);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should fail with an inconsistent signature', async () => {
            const { rootZone } = secureRoot;
            let isExecuted = false;
            try {
                await secureBlocktree.createZone({
                    block: rootZone,
                    sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0],
                        rootKeys[constants.action.write][0]),
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidSignatureError);
                assert.strictEqual(err.reason, InvalidSignatureError.reasons.doesNotMatch);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should fail without a known signature', async () => {
            const invalidKey = await generateTestKeys(encryption);
            const { rootZone } = secureRoot;
            let isExecuted = false;
            try {
                await secureBlocktree.createZone({
                    block: rootZone,
                    sig: signAs(secureBlocktree, invalidKey[constants.action.write][0]),
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
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });
            const newKeys = await generateTestKeys(encryption);
            let isExecuted = false;
            try {
                await secureBlocktree.createZone({
                    block: newZone,
                    sig: signAs(secureBlocktree,
                        newKeys[constants.action.write][0]),
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
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });
            await secureBlocktree.revokeKeys({
                block: newZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });
            let isExecuted = false;
            try {
                await secureBlocktree.createZone({
                    block: newZone,
                    sig: signAs(secureBlocktree,
                        newZoneKeys[constants.action.write][0]),
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
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });
            const newKeys = await generateTestKeys(encryption);
            const newZoneHead = await secureBlocktree.getHeadBlock(newZone);
            const result = await secureBlocktree.setKeys({
                block: newZoneHead,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                keys: newKeys,
            });

            assert.ok(result !== null, 'Expected a valid block to be returned.');
        });
        it('should succeed for a zone using the root key', async () => {
            const { rootZone } = secureRoot;
            const newZoneKeys = await generateTestKeys(encryption);
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });
            const newKeys = await generateTestKeys(encryption);
            const result = await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree,
                    rootKeys[constants.action.write][0]),
                keys: newKeys,
            });

            assert.ok(result !== null, 'Expected a valid block to be returned.');
        });
        it('should fail with an inconsistent signature', async () => {
            const { rootZone } = secureRoot;
            const newZoneKeys = await generateTestKeys(encryption);
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });
            const newKeys = await generateTestKeys(encryption);
            const newZoneHead = await secureBlocktree.getHeadBlock(newZone);
            let isExecuted = false;
            try {
                await secureBlocktree.setKeys({
                    block: newZoneHead,
                    sig: signAs(secureBlocktree,
                        rootZoneKeys[constants.action.write][0],
                        rootKeys[constants.action.write][0]),
                    keys: newKeys,
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidSignatureError);
                assert.strictEqual(err.reason, InvalidSignatureError.reasons.doesNotMatch);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should fail without a known signature', async () => {
            const invalidKey = await generateTestKeys(encryption);
            const { rootZone } = secureRoot;
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            const newZoneHead = await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                keys: await generateTestKeys(encryption),
            });
            const newKeys = await generateTestKeys(encryption);
            let isExecuted = false;
            try {
                await secureBlocktree.setKeys({
                    block: newZoneHead,
                    sig: signAs(secureBlocktree, invalidKey[constants.action.write][0]),
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
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });
            let isExecuted = false;
            try {
                await secureBlocktree.setKeys({
                    block: newZone,
                    sig: signAs(secureBlocktree,
                        newZoneKeys[constants.action.write][0]),
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
                    sig: signAs(secureBlocktree,
                        rootKeys[constants.action.write][0]),
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
                    sig: signAs(secureBlocktree,
                        rootKeys[constants.action.write][0]),
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
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });
            const result = await secureBlocktree.revokeKeys({
                block: newZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });

            assert.ok(result !== null, 'Expected a valid block to be returned.');
        });
        it('should fail with an inconsistent signature', async () => {
            const { rootZone } = secureRoot;
            const newZoneKeys = await generateTestKeys(encryption);
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });
            const newKeys = await generateTestKeys(encryption);
            const newZoneHead = await secureBlocktree.getHeadBlock(newZone);
            let isExecuted = false;
            try {
                await secureBlocktree.revokeKeys({
                    block: newZoneHead,
                    sig: signAs(secureBlocktree,
                        rootZoneKeys[constants.action.write][0],
                        rootKeys[constants.action.write][0]),
                    keys: newKeys,
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidSignatureError);
                assert.strictEqual(err.reason, InvalidSignatureError.reasons.doesNotMatch);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should fail without a known signature', async () => {
            const invalidKey = await generateTestKeys(encryption);
            const { rootZone } = secureRoot;
            const newZoneKeys = await generateTestKeys(encryption);
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });
            let isExecuted = false;
            try {
                await secureBlocktree.revokeKeys({
                    block: newZone,
                    sig: signAs(secureBlocktree, invalidKey[constants.action.write][0]),
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
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });
            let isExecuted = false;
            try {
                await secureBlocktree.revokeKeys({
                    block: newZone,
                    sig: signAs(secureBlocktree,
                        newZoneKeys[constants.action.write][0]),
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
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            const result = await secureBlocktree.setOptions({
                block: newZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                options: { name: 'NEW NAME' },
            });

            assert.ok(result !== null, 'Expected a valid block to be returned.');
        });
        it('should succeed for a zone using the root key', async () => {
            const { rootZone } = secureRoot;
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            const result = await secureBlocktree.setOptions({
                block: newZone,
                sig: signAs(secureBlocktree,
                    rootKeys[constants.action.write][0]),
                options: { name: 'NEW NAME' },
            });

            assert.ok(result !== null, 'Expected a valid block to be returned.');
        });
        it('should fail with an inconsistent signature', async () => {
            const { rootZone } = secureRoot;
            const newZoneKeys = await generateTestKeys(encryption);
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });
            let isExecuted = false;
            try {
                await secureBlocktree.setOptions({
                    block: newZone,
                    sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0],
                        rootKeys[constants.action.write][0]),
                    options: { name: 'NEW NAME' },
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidSignatureError);
                assert.strictEqual(err.reason, InvalidSignatureError.reasons.doesNotMatch);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should fail without a known signature', async () => {
            const invalidKey = await generateTestKeys(encryption);
            const { rootZone } = secureRoot;
            const newZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            let isExecuted = false;
            try {
                await secureBlocktree.setOptions({
                    block: newZone,
                    sig: signAs(secureBlocktree, invalidKey[constants.action.write][0]),
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
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });
            let isExecuted = false;
            try {
                await secureBlocktree.setOptions({
                    block: newZone,
                    sig: signAs(secureBlocktree,
                        newZoneKeys[constants.action.write][0]),
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
                    sig: signAs(secureBlocktree,
                        rootKeys[constants.action.write][0]),
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
                    sig: signAs(secureBlocktree,
                        rootKeys[constants.action.write][0]),
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
    describe('create collection', () => {
        it('should succeed within a zone using the parent key', async () => {
            const { rootZone } = secureRoot;
            const result = await secureBlocktree.createCollection({
                block: rootZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });

            assert.ok(result !== null, 'Expected a valid block to be returned.');
        });
        it('should allow records in a collection using the root key', async () => {
            const { rootZone } = secureRoot;
            const collection = await secureBlocktree.createCollection({
                block: rootZone,
                sig: signAs(secureBlocktree,
                    rootKeys[constants.action.write][0]),
            });
            const result = await secureBlocktree.addRecord({
                block: collection,
                sig: signAs(secureBlocktree,
                    rootKeys[constants.action.write][0]),
                data: Buffer.from('this is a string!', 'utf-8'),
            });

            assert.ok(result !== null, 'Expected a valid block to be returned.');
        });
        it('should allow records in a collection using the root zone key', async () => {
            const { rootZone } = secureRoot;
            const collection = await secureBlocktree.createCollection({
                block: rootZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            const result = await secureBlocktree.addRecord({
                block: collection,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                data: Buffer.from('this is a string!', 'utf-8'),
            });

            assert.ok(result !== null, 'Expected a valid block to be returned.');
        });
        it('should allow records in a collection using the local zone key', async () => {
            const { rootZone } = secureRoot;
            const localZoneKeys = await generateTestKeys(encryption);
            const localZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            await secureBlocktree.setKeys({
                block: localZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                keys: localZoneKeys,
            });
            const collection = await secureBlocktree.createCollection({
                block: localZone,
                sig: signAs(secureBlocktree,
                    localZoneKeys[constants.action.write][0]),
            });
            const result = await secureBlocktree.addRecord({
                block: collection,
                sig: signAs(secureBlocktree,
                    localZoneKeys[constants.action.write][0]),
                data: Buffer.from('this is a string!', 'utf-8'),
            });

            assert.ok(result !== null, 'Expected a valid block to be returned.');
        });
        it('should allow records in a collection using the local collection keys', async () => {
            const { rootZone } = secureRoot;
            const collectionKeys = await generateTestKeys(encryption);
            const localZoneKeys = await generateTestKeys(encryption);
            const localZone = await secureBlocktree.createZone({
                block: rootZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            await secureBlocktree.setKeys({
                block: localZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                keys: localZoneKeys,
            });
            const collection = await secureBlocktree.createCollection({
                block: localZone,
                sig: signAs(secureBlocktree,
                    localZoneKeys[constants.action.write][0]),
            });
            await secureBlocktree.setKeys({
                block: collection,
                sig: signAs(secureBlocktree,
                    localZoneKeys[constants.action.write][0]),
                keys: collectionKeys,
            });
            const result = await secureBlocktree.addRecord({
                block: collection,
                sig: signAs(secureBlocktree,
                    collectionKeys[constants.action.write][0]),
                data: Buffer.from('this is a string!', 'utf-8'),
            });

            assert.ok(result !== null, 'Expected a valid block to be returned.');
        });
        it('should support 100 records in a collection', async () => {
            const { rootZone } = secureRoot;
            const collectionKeys = await generateTestKeys(encryption);
            const collection = await secureBlocktree.createCollection({
                block: rootZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            let next = await secureBlocktree.setKeys({
                block: collection,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                keys: collectionKeys,
            });
            for (let i = 0; i < 100; i += 1) {
                next = await secureBlocktree.addRecord({
                    block: next,
                    sig: signAs(secureBlocktree,
                        collectionKeys[constants.action.write][0]),
                    data: Buffer.from('this is a string!', 'utf-8'),
                });
            }

            assert.ok(next !== null, 'Expected a valid block to be returned.');
        });
        it('should fail without a parent', async () => {
            let isExecuted = false;
            try {
                await secureBlocktree.createCollection({
                    block: null,
                    sig: signAs(secureBlocktree,
                        rootZoneKeys[constants.action.write][0]),
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
                await secureBlocktree.createCollection({
                    block: rootBlock,
                    sig: signAs(secureBlocktree,
                        rootZoneKeys[constants.action.write][0]),
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidBlockError);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should fail with an inconsistent signature', async () => {
            const { rootZone } = secureRoot;
            let isExecuted = false;
            try {
                await secureBlocktree.createCollection({
                    block: rootZone,
                    sig: signAs(secureBlocktree, rootZoneKeys[constants.action.write][0],
                        rootKeys[constants.action.write][0]),
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidSignatureError);
                assert.strictEqual(err.reason, InvalidSignatureError.reasons.doesNotMatch);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
        it('should fail without a known signature', async () => {
            const invalidKey = await generateTestKeys(encryption);
            const { rootZone } = secureRoot;
            let isExecuted = false;
            try {
                await secureBlocktree.createZone({
                    block: rootZone,
                    sig: signAs(secureBlocktree, invalidKey[constants.action.write][0]),
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
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });
            const newKeys = await generateTestKeys(encryption);
            let isExecuted = false;
            try {
                await secureBlocktree.createCollection({
                    block: newZone,
                    sig: signAs(secureBlocktree,
                        newKeys[constants.action.write][0]),
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
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
            });
            await secureBlocktree.setKeys({
                block: newZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });
            await secureBlocktree.revokeKeys({
                block: newZone,
                sig: signAs(secureBlocktree,
                    rootZoneKeys[constants.action.write][0]),
                keys: newZoneKeys,
            });
            let isExecuted = false;
            try {
                await secureBlocktree.createCollection({
                    block: newZone,
                    sig: signAs(secureBlocktree,
                        newZoneKeys[constants.action.write][0]),
                });
                isExecuted = true;
            } catch (err) {
                assert.ok(err instanceof InvalidSignatureError);
            }

            assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
        });
    });
});
