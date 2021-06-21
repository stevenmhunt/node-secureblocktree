/* eslint-disable no-plusplus, no-await-in-loop */
const constants = require('../../constants');

/**
 * Secure Blocktree Secrets API.
 */
module.exports = function secureBlocktreeSecretsFactory({
    time, context, blocktree,
}) {
    /**
     * Determines whether or not a secret is active.
     * @param {BigInt} tsInit The initializion timestamp for the secret.
     * @param {BigInt} tsExp The expiration timestamp for the secret.
     * @param {BigInt} timestamp The timestamp to check with, or "now" if null.
     * @returns {Promise<boolean>} Whether or not the secret is active.
     */
    function isSecretActive({
        tsInit, tsExp, timestamp,
    }) {
        const ts = !timestamp ? time.generateTimestamp() : timestamp;
        return ts >= tsInit && ts < tsExp;
    }

    /**
     * Given a block, scans for all specified secrets in the blockchain.
     * @param {Buffer} block The block to start scanning from.
     * @param {boolean} isRecursive (optional) Indicates whether to scan all parent blocks as well.
     * @param {boolean} isActive (optional) Indicates whether to only return active secrets.
     * @param {Buffer} ref (optional) The secret reference to look for.
     * @param {BigInt} timestamp The timestamp to use for checking active status, or "now" if null.
     * @returns {Promise<Array>} A list of secrets which were collected during the scan.
     */
    async function performSecretScan({
        block, isRecursive, isActive, ref, timestamp,
    } = {}) {
        if (!block) {
            return [];
        }
        const result = [];
        let current = await blocktree.getHeadBlock(block);
        let secureBlock = null;
        const inactiveRefs = {};
        while (current != null) {
            secureBlock = await context.readSecureBlock(current);
            if (secureBlock.type <= constants.blockType.secret) {
                const {
                    ref: currentRef,
                    secret, tsInit, tsExp,
                } = secureBlock.data;
                if (isActive === true
                    && !isSecretActive({ tsInit, tsExp, timestamp })) {
                    inactiveRefs[currentRef] = true;
                }
                if (!inactiveRefs[currentRef]) {
                    result.push({
                        block: current,
                        ref: currentRef,
                        secret,
                        tsInit,
                        tsExp,
                    });
                    if (ref && Buffer.compare(ref, currentRef) === 0) {
                        return result;
                    }
                }
            }
            current = secureBlock.prev;
        }
        if (isRecursive === true) {
            const { parent } = secureBlock;
            if (!parent) {
                return result;
            }
            return [...result, ...await performSecretScan({
                block: parent, isRecursive, isActive, ref, timestamp,
            })];
        }
        return result;
    }

    /**
     * Given a block, scans for all specified secrets in the blockchain.
     * @param {Buffer} block The block to start scanning from.
     * @param {Buffer} ref The secret reference to look for.
     * @returns {Promise<Object>} The secret data to seek, or null.
     */
    async function performSecretSeek({
        block, ref,
    } = {}) {
        const [result] = (await performSecretScan({
            block, isRecursive: true, isActive: true, ref,
        })).slice(-1);
        if (result && result.ref && Buffer.compare(result.ref, ref) === 0) {
            return result;
        }
        return null;
    }

    return {
        isSecretActive,
        performSecretScan,
        performSecretSeek,
    };
};
