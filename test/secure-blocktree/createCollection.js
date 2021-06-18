/* eslint-disable no-await-in-loop */
const assert = require('assert');
const constants = require('../../src/constants');
const { InvalidBlockError, InvalidSignatureError } = require('../../src/errors');

module.exports = (context) => ({
    'should succeed within a zone using the parent key': async () => {
        const { secureBlocktree, secureRoot, rootZoneKeys } = context;
        const { rootZone } = secureRoot;
        const result = await secureBlocktree.createCollection({
            block: rootZone,
            sig: context.signAs(
                rootZoneKeys[constants.action.write][0],
            ),
        });

        assert.ok(result !== null, 'Expected a valid block to be returned.');
    },
    'should allow records in a collection using the root key': async () => {
        const { secureBlocktree, secureRoot, rootKeys } = context;
        const { rootZone } = secureRoot;
        const collection = await secureBlocktree.createCollection({
            block: rootZone,
            sig: context.signAs(
                rootKeys[constants.action.write][0],
            ),
        });
        const result = await secureBlocktree.addRecord({
            block: collection,
            sig: context.signAs(
                rootKeys[constants.action.write][0],
            ),
            data: Buffer.from('this is a string!', 'utf-8'),
        });

        assert.ok(result !== null, 'Expected a valid block to be returned.');
    },
    'should allow records in a collection using the root zone key': async () => {
        const { secureBlocktree, secureRoot, rootZoneKeys } = context;
        const { rootZone } = secureRoot;
        const collection = await secureBlocktree.createCollection({
            block: rootZone,
            sig: context.signAs(
                rootZoneKeys[constants.action.write][0],
            ),
        });
        const result = await secureBlocktree.addRecord({
            block: collection,
            sig: context.signAs(
                rootZoneKeys[constants.action.write][0],
            ),
            data: Buffer.from('this is a string!', 'utf-8'),
        });

        assert.ok(result !== null, 'Expected a valid block to be returned.');
    },
    'should allow records in a collection using the local zone key': async () => {
        const { secureBlocktree, secureRoot, rootZoneKeys } = context;
        const { rootZone } = secureRoot;
        const localZoneKeys = await context.generateTestKeys();
        const localZone = await secureBlocktree.createZone({
            block: rootZone,
            sig: context.signAs(
                rootZoneKeys[constants.action.write][0],
            ),
        });
        await secureBlocktree.setKeys({
            block: localZone,
            sig: context.signAs(
                rootZoneKeys[constants.action.write][0],
            ),
            keys: localZoneKeys,
        });
        const collection = await secureBlocktree.createCollection({
            block: localZone,
            sig: context.signAs(
                localZoneKeys[constants.action.write][0],
            ),
        });
        const result = await secureBlocktree.addRecord({
            block: collection,
            sig: context.signAs(
                localZoneKeys[constants.action.write][0],
            ),
            data: Buffer.from('this is a string!', 'utf-8'),
        });

        assert.ok(result !== null, 'Expected a valid block to be returned.');
    },
    'should allow records in a collection using the local collection keys': async () => {
        const { secureBlocktree, secureRoot, rootZoneKeys } = context;
        const { rootZone } = secureRoot;
        const collectionKeys = await context.generateTestKeys();
        const localZoneKeys = await context.generateTestKeys();
        const localZone = await secureBlocktree.createZone({
            block: rootZone,
            sig: context.signAs(
                rootZoneKeys[constants.action.write][0],
            ),
        });
        await secureBlocktree.setKeys({
            block: localZone,
            sig: context.signAs(
                rootZoneKeys[constants.action.write][0],
            ),
            keys: localZoneKeys,
        });
        const collection = await secureBlocktree.createCollection({
            block: localZone,
            sig: context.signAs(
                localZoneKeys[constants.action.write][0],
            ),
        });
        await secureBlocktree.setKeys({
            block: collection,
            sig: context.signAs(
                localZoneKeys[constants.action.write][0],
            ),
            keys: collectionKeys,
        });
        const result = await secureBlocktree.addRecord({
            block: collection,
            sig: context.signAs(
                collectionKeys[constants.action.write][0],
            ),
            data: Buffer.from('this is a string!', 'utf-8'),
        });

        assert.ok(result !== null, 'Expected a valid block to be returned.');
    },
    'should support 100 records in a collection': async () => {
        const { secureBlocktree, secureRoot, rootZoneKeys } = context;
        const { rootZone } = secureRoot;
        const collectionKeys = await context.generateTestKeys();
        const collection = await secureBlocktree.createCollection({
            block: rootZone,
            sig: context.signAs(
                rootZoneKeys[constants.action.write][0],
            ),
        });
        let next = await secureBlocktree.setKeys({
            block: collection,
            sig: context.signAs(
                rootZoneKeys[constants.action.write][0],
            ),
            keys: collectionKeys,
        });
        for (let i = 0; i < 100; i += 1) {
            next = await secureBlocktree.addRecord({
                block: next,
                sig: context.signAs(
                    collectionKeys[constants.action.write][0],
                ),
                data: Buffer.from('this is a string!', 'utf-8'),
            });
        }

        assert.ok(next !== null, 'Expected a valid block to be returned.');
    },
    'should fail without a parent': async () => {
        const { secureBlocktree, rootZoneKeys } = context;
        let isExecuted = false;
        try {
            await secureBlocktree.createCollection({
                block: null,
                sig: context.signAs(
                    rootZoneKeys[constants.action.write][0],
                ),
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidBlockError);
            assert.strictEqual(err.layer, constants.layer.secureBlocktree);
            assert.strictEqual(err.reason, InvalidBlockError.reasons.isNull);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should fail adjacent to the root zone': async () => {
        const { secureBlocktree, secureRoot, rootKeys } = context;
        const { rootBlock } = secureRoot;
        let isExecuted = false;
        try {
            await secureBlocktree.createCollection({
                block: rootBlock,
                sig: context.signAs(
                    rootKeys[constants.action.write][0],
                ),
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidBlockError);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should fail with an inconsistent signature': async () => {
        const {
            secureBlocktree, secureRoot, rootKeys, rootZoneKeys,
        } = context;
        const { rootZone } = secureRoot;
        let isExecuted = false;
        try {
            await secureBlocktree.createCollection({
                block: rootZone,
                sig: context.signAs(rootZoneKeys[constants.action.write][0],
                    rootKeys[constants.action.write][0]),
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidSignatureError);
            assert.strictEqual(err.reason, InvalidSignatureError.reasons.doesNotMatch);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should fail without a known signature': async () => {
        const { secureBlocktree, secureRoot } = context;
        const invalidKey = await context.generateTestKeys();
        const { rootZone } = secureRoot;
        let isExecuted = false;
        try {
            await secureBlocktree.createZone({
                block: rootZone,
                sig: context.signAs(invalidKey[constants.action.write][0]),
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidSignatureError);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should fail with an unassigned key': async () => {
        const { secureBlocktree, secureRoot, rootZoneKeys } = context;
        const { rootZone } = secureRoot;
        const newZoneKeys = await context.generateTestKeys();
        const newZone = await secureBlocktree.createZone({
            block: rootZone,
            sig: context.signAs(
                rootZoneKeys[constants.action.write][0],
            ),
        });
        await secureBlocktree.setKeys({
            block: newZone,
            sig: context.signAs(
                rootZoneKeys[constants.action.write][0],
            ),
            keys: newZoneKeys,
        });
        const newKeys = await context.generateTestKeys();
        let isExecuted = false;
        try {
            await secureBlocktree.createCollection({
                block: newZone,
                sig: context.signAs(
                    newKeys[constants.action.write][0],
                ),
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidSignatureError);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should fail with a revoked key': async () => {
        const { secureBlocktree, secureRoot, rootZoneKeys } = context;
        const { rootZone } = secureRoot;
        const newZoneKeys = await context.generateTestKeys();
        const newZone = await secureBlocktree.createZone({
            block: rootZone,
            sig: context.signAs(
                rootZoneKeys[constants.action.write][0],
            ),
        });
        await secureBlocktree.setKeys({
            block: newZone,
            sig: context.signAs(
                rootZoneKeys[constants.action.write][0],
            ),
            keys: newZoneKeys,
        });
        await secureBlocktree.revokeKeys({
            block: newZone,
            sig: context.signAs(
                rootZoneKeys[constants.action.write][0],
            ),
            keys: newZoneKeys,
        });
        let isExecuted = false;
        try {
            await secureBlocktree.createCollection({
                block: newZone,
                sig: context.signAs(
                    newZoneKeys[constants.action.write][0],
                ),
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidSignatureError);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
});
