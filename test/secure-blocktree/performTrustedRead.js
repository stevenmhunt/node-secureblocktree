/* eslint-disable no-await-in-loop */
const assert = require('assert');
const constants = require('../../src/constants');

module.exports = (context) => ({
    'should succeed with trusted read on an encrypted zone': async () => {
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
        const blockData = await secureBlocktree.performTrustedRead({
            block: newZone,
            sig: context.signAs(rootZoneKey),
        });
        const result = await secureBlocktree.performTrustedRead(blockData);

        assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
        assert.strictEqual(result.prev, null);
        assert.ok(Buffer.compare(result.parent, rootZone) === 0);
        assert.strictEqual(result.type, constants.blockType.zone);
        assert.strictEqual(result.data.isEncrypted, true);
        assert.ok(result.nonce, 'Expected valid nonce value.');
    },
});
