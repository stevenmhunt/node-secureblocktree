const assert = require('assert');
const constants = require('../../src/constants');
const { InvalidSignatureError } = require('../../src/errors');

module.exports = (context) => ({
    'should succeed for a zone using the parent key': async () => {
        const { secureRoot, secureBlocktree, rootZoneKey } = context;
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
        const result = await secureBlocktree.revokeKey({
            block: newZone,
            sig: context.signAs(rootZoneKey),
            key: newZoneKey,
            action: constants.action.write,
        });

        assert.ok(result !== null, 'Expected a valid block to be returned.');
    },
    'should fail with an inconsistent signature': async () => {
        const {
            secureRoot, secureBlocktree, rootKey, rootZoneKey,
        } = context;
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
        const newZoneHead = await secureBlocktree.getHeadBlock(newZone);
        let isExecuted = false;
        try {
            await secureBlocktree.revokeKey({
                block: newZoneHead,
                sig: context.signAs(rootZoneKey, rootKey),
                key: newKey,
                action: constants.action.write,
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidSignatureError);
            assert.strictEqual(err.reason, InvalidSignatureError.reasons.doesNotMatch);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should fail without a known signature': async () => {
        const { secureRoot, secureBlocktree, rootZoneKey } = context;
        const invalidKey = await context.generateTestKey();
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
        let isExecuted = false;
        try {
            await secureBlocktree.revokeKey({
                block: newZone,
                sig: context.signAs(invalidKey),
                key: newZoneKey,
                action: constants.action.write,
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidSignatureError);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should fail with the blockchain\'s own key': async () => {
        const { secureRoot, secureBlocktree, rootZoneKey } = context;
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
        let isExecuted = false;
        try {
            await secureBlocktree.revokeKey({
                block: newZone,
                sig: context.signAs(newZoneKey),
                key: newZoneKey,
                action: constants.action.write,
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidSignatureError);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
});
