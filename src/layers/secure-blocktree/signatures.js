const constants = require('../../constants');
const { InvalidSignatureError } = require('../../errors');

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
        const block = requireParent !== false ? parent : (parent || prev);
        const signature = typeof sig === 'function' ? await sig({ prev, parent }) : sig;

        // get the public keys for this action.
        const keyList = (await context.performKeyScan({
            block,
            isActive: true,
            isRecursive: true,
            action: action || constants.action.write,
        })).map((i) => i.key);

        // keep trying until a key is found, or there aren't any left.
        const results = await Promise.all(
            keyList.map(async (key) => ({
                result: await context.verifySignedBlock({
                    key, sig: signature, parent, prev,
                }),
                key,
                sig: signature,
                parent,
                prev,
            })),
        );
        const result = results.find((i) => i.result) !== undefined;
        if (!result && noThrow !== true) {
            throw new InvalidSignatureError({ results });
        }
        return result ? signature : null;
    }

    return {
        validateSignature,
    };
};
