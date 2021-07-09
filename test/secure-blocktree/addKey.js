const assert = require('assert');
const constants = require('../../src/constants');
const { InvalidBlockError, InvalidSignatureError } = require('../../src/errors');

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
        const newKey = await context.generateTestKey();
        const newZoneHead = await secureBlocktree.getHeadBlock(newZone);
        const result = await secureBlocktree.addKey({
            block: newZoneHead,
            sig: context.signAs(rootZoneKey),
            key: newKey,
            action: constants.action.write,
        });

        assert.ok(result !== null, 'Expected a valid block to be returned.');
    },
    'should succeed for a zone using the root key': async () => {
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
        const result = await secureBlocktree.addKey({
            block: newZone,
            sig: context.signAs(rootKey),
            key: newKey,
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
            await secureBlocktree.addKey({
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
        const newZone = await secureBlocktree.createZone({
            block: rootZone,
            sig: context.signAs(rootZoneKey),
        });
        const newZoneHead = await secureBlocktree.addKey({
            block: newZone,
            sig: context.signAs(rootZoneKey),
            key: await context.generateTestKey(),
            action: constants.action.write,
        });
        const newKey = await context.generateTestKey();
        let isExecuted = false;
        try {
            await secureBlocktree.addKey({
                block: newZoneHead,
                sig: context.signAs(invalidKey),
                key: newKey,
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
            await secureBlocktree.addKey({
                block: newZone,
                sig: context.signAs(newZoneKey),
                key: await context.generateTestKey(),
                action: constants.action.write,
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidSignatureError);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should fail without a parent': async () => {
        const { secureBlocktree, rootKey } = context;
        const newKey = await context.generateTestKey();
        let isExecuted = false;
        try {
            await secureBlocktree.addKey({
                block: null,
                sig: context.signAs(rootKey),
                key: newKey,
                action: constants.action.write,
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidBlockError);
            assert.strictEqual(err.layer, constants.layer.secureBlocktree);
            assert.strictEqual(err.reason, InvalidBlockError.reasons.notFound);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should fail onto the root block': async () => {
        const { secureRoot, secureBlocktree, rootKey } = context;
        const { rootBlock } = secureRoot;
        const newKey = await context.generateTestKey();
        let isExecuted = false;
        try {
            await secureBlocktree.addKey({
                block: rootBlock,
                sig: context.signAs(rootKey),
                key: newKey,
                action: constants.action.write,
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidBlockError);
            assert.strictEqual(err.layer, constants.layer.secureBlocktree);
            assert.strictEqual(err.reason, InvalidBlockError.reasons.notFound);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
});
