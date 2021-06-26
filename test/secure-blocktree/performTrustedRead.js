/* eslint-disable no-await-in-loop */
const assert = require('assert');
const constants = require('../../src/constants');
const { InvalidKeyError, InvalidSignatureError } = require('../../src/errors');
const inMemoryBroker = require('../../src/brokers/inMemoryBroker');
const { getPrivateKey, generateTestKey } = require('../test-helper');

module.exports = (context) => ({
    'should succeed with trusted read on an encrypted zone with the same key': async () => {
        const { secureBlocktree, secureRoot, rootZoneKey } = context;
        const { rootZone } = secureRoot;
        const secret = 'THE SECRET VALUE';
        const newZone = await secureBlocktree.createZone({
            block: rootZone,
            sig: context.signAs(rootZoneKey),
            options: await secureBlocktree.encryptBlockData({
                key: rootZoneKey,
                type: constants.blockType.zone,
                data: {
                    name: secret,
                },
            }),
        });
        const broker = inMemoryBroker();
        await broker.addAuthorizedKey({
            publicKey: rootZoneKey,
            privateKey: getPrivateKey(rootZoneKey),
        });
        const token = await broker.generateRequestToken({ trustedKey: rootZoneKey });
        const sig = await context.signAs(rootZoneKey)({ token });
        const result = await secureBlocktree.performTrustedRead({
            block: newZone,
            key: rootZoneKey,
            token,
            sig,
            broker,
        });
        assert.ok(result);
    },
    'should succeed with trusted read on an encrypted zone using an implicitly trusted key': async () => {
        const { secureBlocktree, secureRoot, rootZoneKey } = context;
        const { rootZone } = secureRoot;
        const secret = 'THE SECRET VALUE';
        const newZoneKey = await generateTestKey();

        // configure a zone underneath the root zone with a key.
        const newZone = await secureBlocktree.createZone({
            block: rootZone,
            sig: context.signAs(rootZoneKey),
            options: { name: 'NEW ZONE 1' },
        });
        await secureBlocktree.addKey({
            sig: context.signAs(rootZoneKey),
            block: newZone,
            key: newZoneKey,
            action: constants.action.any,
        });

        // configure a zone underneath the new zone that has encrypted data.
        const secretZone = await secureBlocktree.createZone({
            block: newZone,
            sig: context.signAs(newZoneKey),
            options: await secureBlocktree.encryptBlockData({
                key: newZoneKey,
                type: constants.blockType.zone,
                data: {
                    name: secret,
                },
            }),
        });

        // configure broker and add the "new zone" keys as authorized.
        const broker = inMemoryBroker();
        await broker.addAuthorizedKey({
            publicKey: newZoneKey,
            privateKey: getPrivateKey(newZoneKey),
        });
        const token = await broker.generateRequestToken({ trustedKey: rootZoneKey });
        const sig = await context.signAs(rootZoneKey)({ token });

        // perform a trusted read using the root zone key (which is implicitly trusted)
        const encryptedData = await secureBlocktree.performTrustedRead({
            block: secretZone,
            key: rootZoneKey,
            token,
            sig,
            broker,
        });

        // decrypt the trusted secret.
        const result = await secureBlocktree.decryptBlockData({
            encryptedData,
            type: constants.blockType.zone,
            privateKey: getPrivateKey(rootZoneKey),
        });

        assert.ok(result);
        assert.ok(result.name);
        assert.strictEqual(result.name, secret);
    },
    'should succeed with trusted read on an encrypted zone using an explicitly trusted key': async () => {
        const { secureBlocktree, secureRoot, rootZoneKey } = context;
        const { rootZone } = secureRoot;
        const secret = 'THE SECRET VALUE';
        const newZoneKey = await generateTestKey();
        const identityKey = await generateTestKey();

        // configure a zone underneath the root zone with a key.
        const newZone = await secureBlocktree.createZone({
            block: rootZone,
            sig: context.signAs(rootZoneKey),
            options: { name: 'NEW ZONE 1' },
        });
        await secureBlocktree.addKey({
            sig: context.signAs(rootZoneKey),
            block: newZone,
            key: newZoneKey,
            action: constants.action.any,
        });

        // configure an identity underneath the root zone.
        const identity = await secureBlocktree.createIdentity({
            sig: context.signAs(rootZoneKey),
            block: rootZone,
        });
        await secureBlocktree.addKey({
            sig: context.signAs(rootZoneKey),
            block: identity,
            key: identityKey,
            action: constants.action.read,
        });

        // configure a zone underneath the new zone that has encrypted data.
        const secretZone = await secureBlocktree.createZone({
            block: newZone,
            sig: context.signAs(newZoneKey),
            options: await secureBlocktree.encryptBlockData({
                key: newZoneKey,
                type: constants.blockType.zone,
                data: {
                    name: secret,
                },
            }),
        });
        await secureBlocktree.addKey({
            block: secretZone,
            sig: context.signAs(newZoneKey),
            key: identityKey,
            action: constants.action.read,
        });

        // configure broker and add the "new zone" keys as authorized.
        const broker = inMemoryBroker();
        await broker.addAuthorizedKey({
            publicKey: newZoneKey,
            privateKey: getPrivateKey(newZoneKey),
        });
        const token = await broker.generateRequestToken({ trustedKey: identityKey });
        const sig = await context.signAs(identityKey)({ token });

        // perform a trusted read using the root zone key (which is implicitly trusted)
        const encryptedData = await secureBlocktree.performTrustedRead({
            block: secretZone,
            key: identityKey,
            token,
            sig,
            broker,
        });

        // decrypt the trusted secret.
        const result = await secureBlocktree.decryptBlockData({
            encryptedData,
            type: constants.blockType.zone,
            privateKey: getPrivateKey(identityKey),
        });

        assert.ok(result);
        assert.ok(result.name);
        assert.strictEqual(result.name, secret);
    },
    'should fail with trusted read on an encrypted zone using an unknown implicitly trusted key': async () => {
        const { secureBlocktree, secureRoot, rootZoneKey } = context;
        const { rootZone } = secureRoot;
        const secret = 'THE SECRET VALUE';
        const newZoneKey = await generateTestKey();

        // configure a zone underneath the root zone with a key.
        const newZone = await secureBlocktree.createZone({
            block: rootZone,
            sig: context.signAs(rootZoneKey),
            options: { name: 'NEW ZONE 1' },
        });
        await secureBlocktree.addKey({
            sig: context.signAs(rootZoneKey),
            block: newZone,
            key: newZoneKey,
            action: constants.action.any,
        });

        // configure a zone underneath the new zone that has encrypted data.
        const secretZone = await secureBlocktree.createZone({
            block: newZone,
            sig: context.signAs(newZoneKey),
            options: await secureBlocktree.encryptBlockData({
                key: newZoneKey,
                type: constants.blockType.zone,
                data: {
                    name: secret,
                },
            }),
        });

        // configure broker and add the "new zone" keys as authorized.
        const broker = inMemoryBroker();
        const token = await broker.generateRequestToken({ trustedKey: rootZoneKey });
        const sig = await context.signAs(rootZoneKey)({ token });

        let isExecuted = false;
        try {
            await secureBlocktree.performTrustedRead({
                block: secretZone,
                key: rootZoneKey,
                token,
                sig,
                broker,
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidKeyError);
        }
        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should fail with trusted read on an encrypted zone using an untrusted key': async () => {
        const { secureBlocktree, secureRoot, rootZoneKey } = context;
        const { rootZone } = secureRoot;
        const secret = 'THE SECRET VALUE';
        const untrustedKey = await generateTestKey();
        const newZoneKey = await generateTestKey();

        // configure a zone underneath the root zone with a key.
        const newZone = await secureBlocktree.createZone({
            block: rootZone,
            sig: context.signAs(rootZoneKey),
            options: { name: 'NEW ZONE 1' },
        });
        await secureBlocktree.addKey({
            sig: context.signAs(rootZoneKey),
            block: newZone,
            key: newZoneKey,
            action: constants.action.any,
        });

        // configure a zone underneath the new zone that has encrypted data.
        const secretZone = await secureBlocktree.createZone({
            block: newZone,
            sig: context.signAs(newZoneKey),
            options: await secureBlocktree.encryptBlockData({
                key: newZoneKey,
                type: constants.blockType.zone,
                data: {
                    name: secret,
                },
            }),
        });

        // configure broker and add the "new zone" keys as authorized.
        const broker = inMemoryBroker();
        await broker.addAuthorizedKey({
            publicKey: newZoneKey,
            privateKey: getPrivateKey(newZoneKey),
        });

        const token = await broker.generateRequestToken({ trustedKey: untrustedKey });
        const sig = await context.signAs(untrustedKey)({ token });

        let isExecuted = false;
        try {
            await secureBlocktree.performTrustedRead({
                block: secretZone,
                key: untrustedKey,
                token,
                sig,
                broker,
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidKeyError);
        }
        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should fail with trusted read on an encrypted zone using mismatched untrusted key': async () => {
        const { secureBlocktree, secureRoot, rootZoneKey } = context;
        const { rootZone } = secureRoot;
        const secret = 'THE SECRET VALUE';
        const untrustedKey = await generateTestKey();
        const newZoneKey = await generateTestKey();

        // configure a zone underneath the root zone with a key.
        const newZone = await secureBlocktree.createZone({
            block: rootZone,
            sig: context.signAs(rootZoneKey),
            options: { name: 'NEW ZONE 1' },
        });
        await secureBlocktree.addKey({
            sig: context.signAs(rootZoneKey),
            block: newZone,
            key: newZoneKey,
            action: constants.action.any,
        });

        // configure a zone underneath the new zone that has encrypted data.
        const secretZone = await secureBlocktree.createZone({
            block: newZone,
            sig: context.signAs(newZoneKey),
            options: await secureBlocktree.encryptBlockData({
                key: newZoneKey,
                type: constants.blockType.zone,
                data: {
                    name: secret,
                },
            }),
        });

        // configure broker and add the "new zone" keys as authorized.
        const broker = inMemoryBroker();
        await broker.addAuthorizedKey({
            publicKey: newZoneKey,
            privateKey: getPrivateKey(newZoneKey),
        });

        const token = await broker.generateRequestToken({ trustedKey: rootZoneKey });
        const sig = await context.signAs(untrustedKey)({ token });

        let isExecuted = false;
        try {
            await secureBlocktree.performTrustedRead({
                block: secretZone,
                key: rootZoneKey,
                token,
                sig,
                broker,
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidSignatureError);
        }
        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
    'should fail with trusted read on an encrypted zone without a signed request token': async () => {
        const { secureBlocktree, secureRoot, rootZoneKey } = context;
        const { rootZone } = secureRoot;
        const secret = 'THE SECRET VALUE';
        const newZoneKey = await generateTestKey();

        // configure a zone underneath the root zone with a key.
        const newZone = await secureBlocktree.createZone({
            block: rootZone,
            sig: context.signAs(rootZoneKey),
            options: { name: 'NEW ZONE 1' },
        });
        await secureBlocktree.addKey({
            sig: context.signAs(rootZoneKey),
            block: newZone,
            key: newZoneKey,
            action: constants.action.any,
        });

        // configure a zone underneath the new zone that has encrypted data.
        const secretZone = await secureBlocktree.createZone({
            block: newZone,
            sig: context.signAs(newZoneKey),
            options: await secureBlocktree.encryptBlockData({
                key: newZoneKey,
                type: constants.blockType.zone,
                data: {
                    name: secret,
                },
            }),
        });

        // configure broker and add the "new zone" keys as authorized.
        const broker = inMemoryBroker();
        await broker.addAuthorizedKey({
            publicKey: newZoneKey,
            privateKey: getPrivateKey(newZoneKey),
        });

        const token = await broker.generateRequestToken({ trustedKey: rootZoneKey });
        const sig = null;

        let isExecuted = false;
        try {
            await secureBlocktree.performTrustedRead({
                block: secretZone,
                key: rootZoneKey,
                token,
                sig,
                broker,
            });
            isExecuted = true;
        } catch (err) {
            assert.ok(err instanceof InvalidSignatureError);
        }
        assert.strictEqual(isExecuted, false, 'Expected an exception to be thrown.');
    },
});
