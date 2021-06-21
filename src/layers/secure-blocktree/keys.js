/* eslint-disable no-plusplus, no-await-in-loop */
const constants = require('../../constants');
const { InvalidKeyError } = require('../../errors');

/**
 * Secure Blocktree Keys API.
 */
module.exports = function secureBlocktreeKeysFactory({
    time, context, blocktree,
}) {
    /**
     * Determines whether or not a key is active.
     * @param {BigInt} tsInit The initializion timestamp for the key.
     * @param {BigInt} tsExp The expiration timestamp for the key.
     * @param {BigInt} timestamp The timestamp to check with, or "now" if null.
     * @returns {Promise<boolean>} Whether or not the key is active.
     */
    function isKeyActive({
        tsInit, tsExp, timestamp,
    }) {
        const ts = !timestamp ? time.generateTimestamp() : timestamp;
        return ts >= tsInit && ts < tsExp;
    }

    /**
     * Given a block, scans for all specified keys in the blockchain.
     * @param {Buffer} block The block to start scanning from.
     * @param {boolean} isRecursive (optional) Indicates whether to scan all parent blocks as well.
     * @param {boolean} isActive (optional) Indicates whether to only return active keys.
     * @param {string} action (optional) The type of action to return keys for (read, write, etc.)
     * @param {Buffer} key (optional) The key to look for.
     * @param {BigInt} timestamp The timestamp to use for checking active status, or "now" if null.
     * @returns {Promise<Array>} A list of keys which were collected during the scan.
     */
    async function performKeyScan({
        block, isRecursive, isActive, action, key, timestamp,
    } = {}) {
        if (!block) {
            return [];
        }
        const result = [];
        let current = await blocktree.getHeadBlock(block);
        let secureBlock = null;
        const inactiveKeys = {};
        while (current != null) {
            secureBlock = await context.readSecureBlock(current);
            if (secureBlock.type <= constants.blockType.key) {
                const {
                    parentKey, key: currentKey,
                    action: currentAction, tsInit, tsExp,
                } = secureBlock.data;
                if (action === undefined
                    || action === currentAction || currentAction === constants.action.any) {
                    if (isActive === true
                        && !isKeyActive({ tsInit, tsExp, timestamp })) {
                        inactiveKeys[currentKey] = true;
                    }
                    if (!inactiveKeys[currentKey]) {
                        result.push({
                            key: currentKey,
                            block: current,
                            action: currentAction,
                            parentKey,
                            tsInit,
                            tsExp,
                        });
                        if (key && Buffer.compare(key, currentKey) === 0) {
                            return result;
                        }
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
            return [...result, ...await performKeyScan({
                block: parent, isRecursive, isActive, action, key, timestamp,
            })];
        }
        return result;
    }

    /**
     * Given a block, scans for all specified keys in the blockchain.
     * @param {Buffer} block The block to start scanning from.
     * @param {string} action (optional) The type of action to return keys for (read, write, etc.)
     * @param {Buffer} key The key to look for.
     * @returns {Promise<Object>} The key data to seek, or null.
     */
    async function performKeySeek({
        block, action, key,
    } = {}) {
        const [result] = (await performKeyScan({
            block, isRecursive: true, isActive: true, action, key,
        })).slice(-1);
        if (result && result.key && Buffer.compare(result.key, key) === 0) {
            return result;
        }
        return null;
    }

    /**
     * Validates a key by checking the chain until the root is reached.
     * @param {Buffer} block The block to start validating from.
     * @param {Buffer} key The key to validate.
     * @param {string} action The action to perform.
     * @returns {Promise<boolean>} Whether the key is valid or not.
     */
    async function validateParentKey({
        block, key, timestamp, isRecursive, noThrow,
    }) {
        const result = await performKeySeek({
            block,
            action: constants.action.write,
            key,
        });
        if (result) {
            if (!result.parentKey) {
                return true;
            }
            if (isRecursive !== false) {
                const parent = await blocktree.getParentBlock(block);
                if (!parent) {
                    return true;
                }
                return validateParentKey({
                    block: parent, key: result.parentKey, timestamp, isRecursive, noThrow,
                });
            }
        }
        if (noThrow !== false) {
            throw new InvalidKeyError({ block, key });
        }
        return false;
    }

    return {
        isKeyActive,
        performKeyScan,
        performKeySeek,
        validateParentKey,
    };
};
