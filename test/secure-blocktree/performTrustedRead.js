/* eslint-disable no-await-in-loop */
const assert = require('assert');
const constants = require('../../src/constants');
const inMemoryBroker = require('../../src/brokers/inMemoryBroker');
const { getPrivateKey } = require('../test-helper');

module.exports = (context) => ({
    'should succeed with trusted read on an encrypted zone with no elevation required': async () => {
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
        const signedToken = context.signAs(rootZoneKey)({
            token: await broker.generateRequestToken({ trustedKey: rootZoneKey }),
        });
        const result = await secureBlocktree.performTrustedRead({
            block: newZone,
            key: rootZoneKey,
            signedToken,
            broker,
        });
        assert.ok(result);
    },
});
