const constants = require('../../constants');
const { InvalidSignatureError } = require('../../errors');
const { deserializeKeyFromSignature } = require('./serialization/deserialize');

/**
 * Secure Blockchain Signatures API.
 */
module.exports = function secureBlocktreeSignaturesFactory({ context }) {
    /**
     * Validates a signature based on the provided block and action to perform.
     * @param {Buffer} sig The signature to validate.
     * @param {Buffer} parent The parent block.
     * @param {Buffer} prev The previous block.
     * @param {string} action The action to validate.
     * @param {boolean} noThrow Whether or not to throw an exception if validation fails.
     * @returns {Promise<string>} The valid signature, or null.
     */
    async function validateSignature({
        sig, parent, prev, action, noThrow, requireParent,
    }) {
        const block = requireParent !== false ? parent : (prev || parent);
        const signature = typeof sig === 'function' ? await sig({ prev, parent }) : sig;
        const key = deserializeKeyFromSignature(signature);

        // perform a "key seek" to verify that the key is registered.
        const keySeek = await context.performKeySeek({
            block,
            action: action || constants.action.write,
            key,
        });

        const result = keySeek
            && (await context.verifySignedBlock({
                key, sig: signature, parent, prev,
            }));
        if (!result && noThrow !== true) {
            if (!keySeek) {
                throw new InvalidSignatureError({ block, key },
                    InvalidSignatureError.reasons.notFound);
            }
            throw new InvalidSignatureError({ block, key, sig: signature },
                InvalidSignatureError.reasons.doesNotMatch);
        }
        return result ? signature : null;
    }

    return {
        validateSignature,
    };
};
