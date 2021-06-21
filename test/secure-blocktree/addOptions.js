const assert = require('assert');
const constants = require('../../src/constants');
const { InvalidSignatureError, InvalidBlockError } = require('../../src/errors');

module.exports = (context) => ({
    'should succeed for a zone using the parent key': async () => {
        const { secureRoot, secureBlocktree, rootZoneKey } = context;
        const { rootZone } = secureRoot;
        const newZone = await secureBlocktree.createZone({
            block: rootZone,
            sig: context.signAs(rootZoneKey),
        });
        const result = await secureBlocktree.addOptions({
            block: newZone,
            sig: context.signAs(rootZoneKey),
            options: { name: 'NEW NAME' },
        });

        assert.ok(result !== null, 'Expected a valid block to be returned.');
    },
    'should succeed for a zone using the root key': async () => {
        const {
            secureRoot, secureBlocktree, rootKey, rootZoneKey,
        } = context;
        const { rootZone } = secureRoot;
        const newZone = await secureBlocktree.createZone({
            block: rootZone,
            sig: context.signAs(rootZoneKey),
        });
        const result = await secureBlocktree.addOptions({
            block: newZone,
            sig: context.signAs(rootKey),
            options: { name: 'NEW NAME' },
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
        let isExecuted = false;
        try {
            await secureBlocktree.addOptions({
                block: newZone,
                sig: context.signAs(rootZoneKey,
                    rootKey),
                options: { name: 'NEW NAME' },
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
        let isExecuted = false;
        try {
            await secureBlocktree.addOptions({
                block: newZone,
                sig: context.signAs(invalidKey),
                options: { name: 'NEW NAME' },
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
            await secureBlocktree.addOptions({
                block: newZone,
                sig: context.signAs(newZoneKey),
                options: { name: 'NEW NAME' },
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidSignatureError);
        }

        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should fail without a parent': async () => {
        const { secureBlocktree, rootKey } = context;
        let isExecuted = false;
        try {
            await secureBlocktree.addOptions({
                block: null,
                sig: context.signAs(rootKey),
                options: { name: 'NEW NAME' },
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
        let isExecuted = false;
        try {
            await secureBlocktree.addOptions({
                block: rootBlock,
                sig: context.signAs(rootKey),
                options: { name: 'NEW NAME' },
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
