/* eslint-disable no-await-in-loop */
const assert = require('assert');
const constants = require('../../src/constants');
const { InvalidBlockError, InvalidSignatureError } = require('../../src/errors');

module.exports = (context) => ({
    'should succeed within the root zone': async () => {
        const { secureBlocktree, secureRoot, rootZoneKeys } = context;
        const { rootZone } = secureRoot;
        const newZone = await secureBlocktree.createZone({
            block: rootZone,
            sig: context.signAs(rootZoneKeys[constants.action.write][0]),
        });
        const result = await secureBlocktree.readSecureBlock(newZone);

        assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
        assert.strictEqual(result.prev, null);
        assert.ok(Buffer.compare(result.parent, rootZone) === 0);
        assert.strictEqual(result.type, constants.blockType.zone);
        assert.ok(result.nonce, 'Expected valid nonce value.');
    },
    'should fail without a parent': async () => {
        const { secureBlocktree, rootZoneKeys } = context;
        let isExecuted = false;
        try {
            await secureBlocktree.createZone({
                block: null,
                sig: context.signAs(
                    rootZoneKeys[constants.action.write][0],
                ),
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
        const { secureBlocktree, secureRoot, rootZoneKeys } = context;
        const { rootBlock } = secureRoot;
        let isExecuted = false;
        try {
            await secureBlocktree.createZone({
                block: rootBlock,
                sig: context.signAs(
                    rootZoneKeys[constants.action.write][0],
                ),
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidSignatureError);
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
            await secureBlocktree.createZone({
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
            await secureBlocktree.createZone({
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
            await secureBlocktree.createZone({
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
