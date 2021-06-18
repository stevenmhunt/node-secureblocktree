const constants = require('../../constants');
const { InvalidSignatureError } = require('../../errors');
const { deserializeKey } = require('./serialization/deserialize');

module.exports = function secureBlocktreeSignaturesFactory({ context }) {
    /**
     * Validates a signature based on the provided block and action to perform.
     * @param {string} sig The signature to validate.
     * @param {string} parent The parent block.
     * @param {string} prev The previous block.
     * @param {number} action The action to validate.
     * @param {boolean} noThrow Whether or not to throw an exception if validation fails.
     * @returns {Promise<string>} The valid signature, or null.
     */
    async function validateSignature({
        sig, parent, prev, action, noThrow, requireParent,
    }) {
        const block = requireParent !== false ? parent : (prev || parent);
        const signature = typeof sig === 'function' ? await sig({ prev, parent }) : sig;
        const { result: key } = deserializeKey(Buffer.from(signature, constants.format.signature));

        // perform a "key seek" to verify that the key is registered.
        const [keySeek] = (await context.performKeyScan({
            block,
            key,
            isActive: true,
            isRecursive: true,
            action: action || constants.action.write,
        })).slice(-1);

        const result = keySeek && Buffer.compare(keySeek.key, key) === 0
            && (await context.verifySignedBlock({
                key, sig: signature, parent, prev,
            }));
        if (!result && noThrow !== true) {
            if (!keySeek || !keySeek.key === key) {
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
