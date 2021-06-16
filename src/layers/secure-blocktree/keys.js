/* eslint-disable no-plusplus, no-await-in-loop */
const constants = require('../../constants');
const { InvalidKeyError } = require('../../errors');

module.exports = function secureBlocktreeKeysFactory({
    os, encryption, context, blocktree,
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
        const ts = !timestamp ? os.generateTimestamp() : timestamp;
        return ts >= tsInit && ts < tsExp;
    }

    /**
     * Determines if the "parentKey" is the parent key of "key".
     * @param {string} parentKey The parent key.
     * @param {string} key The alleged child key.
     * @returns {Promise<boolean>} Whether or not the "parent key" is the parent of "key".
     */
    async function isKeyParentOf(parentKey, key) {
        return encryption.isKeyParentOf(parentKey, key);
    }

    /**
     * Given a block, scans for all specified keys in the blockchain.
     * @param {string} block The block to start scanning from.
     * @param {boolean} isRecursive Indicates whether to scan all parent blocks as well.
     * @param {boolean} isActive Indicates whether to only return active keys.
     * @param {number} action The type of action to return keys for (read, write, etc.)
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
            if (secureBlock.type === constants.blockType.keys) {
                const actionKeys = Object.keys(secureBlock.data.keys);
                for (let i = 0; i < actionKeys.length; i += 1) {
                    if (action === undefined
                        || action === actionKeys[i]) {
                        const keyList = secureBlock.data.keys[actionKeys[i]];
                        for (let j = 0; j < keyList.length; j += 1) {
                            const currentKey = keyList[j];
                            const { tsInit, tsExp } = secureBlock.data;
                            if (isActive === true
                                && !isKeyActive({ tsInit, tsExp, timestamp })) {
                                inactiveKeys[currentKey] = true;
                            }
                            if (!inactiveKeys[currentKey]) {
                                result.push({
                                    key: currentKey,
                                    block: current,
                                    action: actionKeys[i],
                                    parentKey: secureBlock.data.parentKey,
                                    tsInit: secureBlock.data.tsInit,
                                    tsExp: secureBlock.data.tsExp,
                                });
                                if (key && key === currentKey) {
                                    return result;
                                }
                            }
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
                block: parent, isRecursive, isActive, action, timestamp,
            })];
        }
        return result;
    }

    /**
     * Validates a key by checking the chain until the root is reached.
     * @param {string} block The block to start validating from.
     * @param {string} key The key to validate.
     * @param {number} action The action to perform.
     * @returns {Promise<boolean>} Whether the key is valid or not.
     */
    async function validateKey({
        block, key, parentKey, timestamp,
    }) {
        if (!key) {
            return false;
        }
        const [result] = await performKeyScan({
            block,
            isActive: true,
            action: constants.action.write,
            key: parentKey,
            isRecursive: true,
            timestamp,
        });
        if (result) {
            if (!result.parentKey) {
                return true;
            }
            const parent = await blocktree.getParentBlock(block);
            if (!parent) {
                return true;
            }
            return validateKey({
                block: parent, parentKey: result.parentKey, key: result.key, timestamp,
            });
        }
        return false;
    }

    /**
     * @private
     * Validates a list of keys.
     * @param {string} block The block to start validating from.
     * @param {string} keys The keys to validate.
     * @param {number} action The action to perform.
     * @returns {Promise<boolean>} Whether the key is valid or not.
     */
    async function validateKeysInternal({
        block, keys, parentKey,
    }) {
        const result = await Promise.all(
            keys.map(async (k) => validateKey({
                block,
                parentKey,
                key: k,
            })),
        );
        return result.filter((i) => i).length;
    }

    /**
     * Given a set of keys and actions, validates all given keys.
     * @param {string} block The block to start validating from.
     * @param {string} keys The key sets to validate.
     * @returns {Promise<boolean>} Whether the key is valid or not.
     */
    async function validateKeys({ block, keys, parentKey }) {
        const results = await Promise.all(
            Object.keys(keys).map(
                async (k) => validateKeysInternal({
                    block,
                    keys: keys[k],
                    parentKey,
                }),
            ),
        );
        if (results.reduce((a, b) => a + b) < Object.keys(keys).length) {
            throw new InvalidKeyError();
        }
    }

    return {
        isKeyActive,
        isKeyParentOf,
        performKeyScan,
        validateKey,
        validateKeys,
    };
};
