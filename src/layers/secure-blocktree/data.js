const constants = require('../../constants');
const { InvalidKeyError } = require('../../errors');
const { deserializeKeyFromSignature } = require('./serialization/deserialize');

/**
 * Secure Blocktree Data API.
 */
module.exports = function secureBlocktreeDataFactory({ context }) {
    async function performTrustedRead({
        block, sig, broker,
    }) {
        // collect key information.
        const action = constants.action.read;
        const blockData = await context.readSecureBlock(block);
        const requiredKey = deserializeKeyFromSignature(blockData.sig);
        const currentKey = deserializeKeyFromSignature(sig);

        // perform a key seek to locate the required block.
        const seek = await context.performKeySeek({ block, action, key: requiredKey });
        if (!seek) {
            throw new InvalidKeyError({ key: requiredKey });
        }

        // attempt to locate a secret for the current key.
        const secretData = await context.performSecretSeek({ block: seek.block, ref: currentKey });
        if (!secretData) {
            throw new InvalidKeyError({ key: currentKey });
        }
        const { secret } = secretData;

        // use the provided broker to construct a secret which can be decoded
        // by the trusted key.
        return broker.buildTrustedSecret({
            secret, authorizedKey: requiredKey, trustedKey: currentKey,
        });
    }

    return {
        performTrustedRead,
    };
};
