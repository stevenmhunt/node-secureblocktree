/* eslint-disable no-await-in-loop */
const assert = require('assert');
const constants = require('../../src/constants');
const { InvalidBlockError, InvalidSignatureError } = require('../../src/errors');

module.exports = (context) => ({
    'should succeed within a zone using the parent key': async () => {
        const { secureBlocktree, secureRoot, rootZoneKey } = context;
        const { rootZone } = secureRoot;
        const result = await secureBlocktree.createCollection({
            block: rootZone,
            sig: context.signAs(rootZoneKey),
        });

        assert.ok(result !== null, 'Expected a valid block to be returned.');
    },
    'should allow records in a collection using the root key': async () => {
        const { secureBlocktree, secureRoot, rootKey } = context;
        const { rootZone } = secureRoot;
        const collection = await secureBlocktree.createCollection({
            block: rootZone,
            sig: context.signAs(rootKey),
        });
        const result = await secureBlocktree.addRecord({
            block: collection,
            sig: context.signAs(rootKey),
            data: Buffer.from('this is a string!', 'utf-8'),
        });

        assert.ok(result !== null, 'Expected a valid block to be returned.');
    },
    'should allow records in a collection using the root zone key': async () => {
        const { secureBlocktree, secureRoot, rootZoneKey } = context;
        const { rootZone } = secureRoot;
        const collection = await secureBlocktree.createCollection({
            block: rootZone,
            sig: context.signAs(rootZoneKey),
        });
        const result = await secureBlocktree.addRecord({
            block: collection,
            sig: context.signAs(rootZoneKey),
            data: Buffer.from('this is a string!', 'utf-8'),
        });

        assert.ok(result !== null, 'Expected a valid block to be returned.');
    },
    'should allow records in a collection using the local zone key': async () => {
        const { secureBlocktree, secureRoot, rootZoneKey } = context;
        const { rootZone } = secureRoot;
        const localZoneKey = await context.generateTestKey();
        const localZone = await secureBlocktree.createZone({
            block: rootZone,
            sig: context.signAs(rootZoneKey),
        });
        await secureBlocktree.setKey({
            block: localZone,
            sig: context.signAs(rootZoneKey),
            key: localZoneKey,
            action: constants.action.write,
        });
        const collection = await secureBlocktree.createCollection({
            block: localZone,
            sig: context.signAs(localZoneKey),
        });
        const result = await secureBlocktree.addRecord({
            block: collection,
            sig: context.signAs(localZoneKey),
            data: Buffer.from('this is a string!', 'utf-8'),
        });

        assert.ok(result !== null, 'Expected a valid block to be returned.');
    },
    'should allow records in a collection using the local collection keys': async () => {
        const { secureBlocktree, secureRoot, rootZoneKey } = context;
        const { rootZone } = secureRoot;
        const collectionKey = await context.generateTestKey();
        const localZoneKey = await context.generateTestKey();
        const localZone = await secureBlocktree.createZone({
            block: rootZone,
            sig: context.signAs(rootZoneKey),
        });
        await secureBlocktree.setKey({
            block: localZone,
            sig: context.signAs(rootZoneKey),
            key: localZoneKey,
            action: constants.action.write,
        });
        const collection = await secureBlocktree.createCollection({
            block: localZone,
            sig: context.signAs(localZoneKey),
        });
        await secureBlocktree.setKey({
            block: collection,
            sig: context.signAs(localZoneKey),
            key: collectionKey,
            action: constants.action.write,
        });
        const result = await secureBlocktree.addRecord({
            block: collection,
            sig: context.signAs(collectionKey),
            data: Buffer.from('this is a string!', 'utf-8'),
        });

        assert.ok(result !== null, 'Expected a valid block to be returned.');
    },
    'should support 100 records in a collection': async () => {
        const { secureBlocktree, secureRoot, rootZoneKey } = context;
        const { rootZone } = secureRoot;
        const collectionKey = await context.generateTestKey();
        const collection = await secureBlocktree.createCollection({
            block: rootZone,
            sig: context.signAs(rootZoneKey),
        });
        let next = await secureBlocktree.setKey({
            block: collection,
            sig: context.signAs(rootZoneKey),
            key: collectionKey,
            action: constants.action.write,
        });
        for (let i = 0; i < 100; i += 1) {
            next = await secureBlocktree.addRecord({
                block: next,
                sig: context.signAs(collectionKey),
                data: Buffer.from('this is a string!', 'utf-8'),
            });
        }

        assert.ok(next !== null, 'Expected a valid block to be returned.');
    },
    'should fail without a parent': async () => {
        const { secureBlocktree, rootZoneKey } = context;
        let isExecuted = false;
        try {
            await secureBlocktree.createCollection({
                block: null,
                sig: context.signAs(rootZoneKey),
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidBlockError);
            assert.strictEqual(err.layer, constants.layer.secureBlocktree);
            assert.strictEqual(err.reason, InvalidBlockError.reasons.notFound);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should fail adjacent to the root zone': async () => {
        const { secureBlocktree, secureRoot, rootKey } = context;
        const { rootBlock } = secureRoot;
        let isExecuted = false;
        try {
            await secureBlocktree.createCollection({
                block: rootBlock,
                sig: context.signAs(rootKey),
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidBlockError);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should fail with an inconsistent signature': async () => {
        const {
            secureBlocktree, secureRoot, rootKey, rootZoneKey,
        } = context;
        const { rootZone } = secureRoot;
        let isExecuted = false;
        try {
            await secureBlocktree.createCollection({
                block: rootZone,
                sig: context.signAs(rootZoneKey,
                    rootKey),
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
        const invalidKey = await context.generateTestKey();
        const { rootZone } = secureRoot;
        let isExecuted = false;
        try {
            await secureBlocktree.createZone({
                block: rootZone,
                sig: context.signAs(invalidKey),
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidSignatureError);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should fail with an unassigned key': async () => {
        const { secureBlocktree, secureRoot, rootZoneKey } = context;
        const { rootZone } = secureRoot;
        const newZoneKey = await context.generateTestKey();
        const newZone = await secureBlocktree.createZone({
            block: rootZone,
            sig: context.signAs(rootZoneKey),
        });
        await secureBlocktree.setKey({
            block: newZone,
            sig: context.signAs(rootZoneKey),
            key: newZoneKey,
            action: constants.action.write,
        });
        const newKey = await context.generateTestKey();
        let isExecuted = false;
        try {
            await secureBlocktree.createCollection({
                block: newZone,
                sig: context.signAs(newKey),
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidSignatureError);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should fail with a revoked key': async () => {
        const { secureBlocktree, secureRoot, rootZoneKey } = context;
        const { rootZone } = secureRoot;
        const newZoneKey = await context.generateTestKey();
        const newZone = await secureBlocktree.createZone({
            block: rootZone,
            sig: context.signAs(rootZoneKey),
        });
        await secureBlocktree.setKey({
            block: newZone,
            sig: context.signAs(rootZoneKey),
            key: newZoneKey,
            action: constants.action.write,
        });
        await secureBlocktree.revokeKey({
            block: newZone,
            sig: context.signAs(rootZoneKey),
            key: newZoneKey,
            action: constants.action.write,
        });
        let isExecuted = false;
        try {
            await secureBlocktree.createCollection({
                block: newZone,
                sig: context.signAs(newZoneKey),
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidSignatureError);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
});
