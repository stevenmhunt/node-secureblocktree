/* eslint-disable no-await-in-loop */
const assert = require('assert');
const constants = require('../../src/constants');
const { InvalidBlockError, InvalidSignatureError } = require('../../src/errors');

module.exports = (context) => ({
    'should succeed within the root zone': async () => {
        const { secureBlocktree, secureRoot, rootZoneKey } = context;
        const { rootZone } = secureRoot;
        const newZone = await secureBlocktree.createZone({
            block: rootZone,
            sig: context.signAs(rootZoneKey),
            options: { name: 'new zone' },
        });
        const result = await secureBlocktree.readSecureBlock(newZone);

        assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
        assert.strictEqual(result.prev, null);
        assert.ok(Buffer.compare(result.parent, rootZone) === 0);
        assert.strictEqual(result.type, constants.blockType.zone);
        assert.ok(result.nonce, 'Expected valid nonce value.');
    },
    'should succeed with encryption within the root zone': async () => {
        const { secureBlocktree, secureRoot, rootZoneKey } = context;
        const { rootZone } = secureRoot;
        const newZone = await secureBlocktree.createZone({
            block: rootZone,
            sig: context.signAs(rootZoneKey),
            options: await secureBlocktree.encryptBlockData({
                key: rootZoneKey,
                type: constants.blockType.zone,
                data: {
                    name: 'secret name',
                },
            }),
        });
        const result = await secureBlocktree.readSecureBlock(newZone);

        assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
        assert.strictEqual(result.prev, null);
        assert.ok(Buffer.compare(result.parent, rootZone) === 0);
        assert.strictEqual(result.type, constants.blockType.zone);
        assert.strictEqual(result.data.isEncrypted, true);
        assert.ok(result.nonce, 'Expected valid nonce value.');
    },
    'should fail without a parent': async () => {
        const { secureBlocktree, rootZoneKey } = context;
        let isExecuted = false;
        try {
            await secureBlocktree.createZone({
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
        const { secureBlocktree, secureRoot, rootZoneKey } = context;
        const { rootBlock } = secureRoot;
        let isExecuted = false;
        try {
            await secureBlocktree.createZone({
                block: rootBlock,
                sig: context.signAs(rootZoneKey),
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidSignatureError);
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
            await secureBlocktree.createZone({
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
        await secureBlocktree.addKey({
            block: newZone,
            sig: context.signAs(rootZoneKey),
            key: newZoneKey,
            action: constants.action.write,
        });
        const newKey = await context.generateTestKey();
        let isExecuted = false;
        try {
            await secureBlocktree.createZone({
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
        await secureBlocktree.addKey({
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
            await secureBlocktree.createZone({
                block: newZone,
                sig: context.signAs(newZoneKey),
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidSignatureError);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should fail with a duplicated signature': async () => {
        const { secureBlocktree, secureRoot, rootZoneKey } = context;
        const { rootZone } = secureRoot;
        const sig = await context.signAs(rootZoneKey)({ parent: rootZone });
        await secureBlocktree.createZone({
            block: rootZone,
            sig,
        });
        let isExecuted = false;
        try {
            await secureBlocktree.createZone({
                block: rootZone,
                sig,
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidSignatureError);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
});
