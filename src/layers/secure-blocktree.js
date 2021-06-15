/* eslint-disable no-plusplus, no-await-in-loop */
const constants = require('../constants');
const utils = require('../utils');
const {
    InvalidSignatureError, InvalidBlockError,
    InvalidKeyError, InvalidRootError,
} = require('../errors');

/**
 * Blocktree Layer 3 - Secure Blocktree
 */
module.exports = function secureBlocktreeLayerFactory({
    blocktree, secureCache, os, certificates,
}) {
    /**
     * Encrypts data using the specified key.
     * @param {string} key The key to encrypt data with.
     * @param {*} data The data to encrypt.
     * @returns {Promise<Buffer>} The encrypted data.
     */
    async function encryptData(key, data) {
        return certificates.encrypt(
            Buffer.from(key, constants.format.key),
            Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8'),
        );
    }

    /**
     * Decrypts data using the specified key.
     * @param {string} key The key to decrypt data with.
     * @param {Buffer} data The data to decrypt.
     * @param {Object} options Additional decryption options.
     * @returns {Promise<Object>} The decrypted data.
     */
    async function decryptData(key, data, options = {}) {
        const result = await certificates.decrypt(
            Buffer.from(key, constants.format.key),
            Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8'),
        );
        if (options && options.encoding) {
            return result.toString(options.encoding);
        }
        return result;
    }

    /**
     * Digitally signs a block using the specified key.
     * @param {string} key The key to sign the block with (usually a write key).
     * @param {string} parent The parent of the block to sign.
     * @param {string} prev The previous block of the block to sign.
     * @returns {Promise<Buffer>} The signed block data.
     */
    async function signBlock({ key, parent, prev }) {
        const result = await certificates.sign(
            Buffer.from(key, constants.format.key),
            Buffer.concat([
                parent ? Buffer.from(parent, constants.format.hash) : Buffer.alloc(0),
                prev ? Buffer.from(prev, constants.format.hash) : Buffer.alloc(0),
            ]),
        );
        return result.toString(constants.format.signature);
    }

    /**
     * Given a key, a signature, and a block,
     * determines if the signature is valid and matches the block.
     * @param {*} key The key to verify.
     * @param {*} sig The signature generated when the block was signed.
     * @param {*} parent The parent block to validate.
     * @param {*} prev The prev block to validate.
     * @returns {Promise<boolean>} Whether or not the signature and key are valid for the block.
     */
    async function verifySignedBlock({
        key, sig, parent, prev,
    }) {
        const sigResult = await certificates.checkSignature(
            Buffer.from(key, constants.format.key),
            Buffer.from(sig, constants.format.signature),
        );
        const sigBlock = sigResult ? sigResult.toString(constants.format.hash) : null;
        return (parent || prev) && sigBlock !== null && sigBlock === `${parent || ''}${prev || ''}`;
    }

    /**
     * @private
     * Given a list of keys, serializes them for being written to a block.
     * @param {*} keys The list of keys to serialize.
     * @returns {Buffer} A binary representation of the array.
     */
    function serializeKeys(keys) {
        const results = [Buffer.from([Object.keys(keys).length])];
        Object.keys(keys).forEach((key) => {
            results.push(Buffer.from([key]));
            const keyList = Array.isArray(keys[key]) ? keys[key] : [keys[key]];
            results.push(Buffer.from([keyList.length]));
            keyList.forEach((keyItem) => {
                let keyData = keyItem || Buffer.alloc(0);
                if (!Buffer.isBuffer(keyData)) {
                    keyData = Buffer.from(keyData, constants.format.key);
                }
                results.push(Buffer.from([Buffer.byteLength(keyData)]));
                results.push(keyData);
            });
        });
        return Buffer.concat(results);
    }

    /**
     * @private
     * Serializes secure block data to be written to the block.
     * @param {*} type The type of secure block to serialize.
     * @param {*} dataItem The type-specific block data.
     * @returns {Buffer} A binary representation of the secure data.
     */
    function serializeSecureBlockData(type, dataItem) {
        if (type === constants.blockType.keys) {
            const {
                keys, tsInit, tsExp, data,
            } = dataItem;
            const dataValue = data || Buffer.alloc(0);
            return Buffer.concat([
                // start and expiration timestamps for keys
                utils.fromInt64(tsInit),
                utils.fromInt64(tsExp),
                serializeKeys(keys),
                // (optional) additional data
                dataValue,
            ]);
        }
        return Buffer.alloc(0);
    }

    /**
     * @private
     * Serializes a digital signature for storing within a secure block.
     * @param {*} sig The signature to serialize.
     * @returns {Buffer} A binary representation of the signature.
     */
    function serializeSignature(sig) {
        let sigData = sig || Buffer.alloc(0);
        if (!Buffer.isBuffer(sigData)) {
            sigData = Buffer.from(sigData, constants.format.signature);
        }

        return Buffer.concat([
            Buffer.from([Buffer.byteLength(sigData)]),
            sigData,
        ]);
    }

    /**
     * Given a secure object, converts it into a blocktree object.
     * @param {Object} btBlockData The secure object.
     * @returns {Object} A blocktree object.
     */
    function serializeSecureBlock(secureData) {
        const { prev, parent } = secureData;
        const data = Buffer.concat([
            // secure block type
            Buffer.from([secureData.type]),
            // signature data
            serializeSignature(secureData.sig),
            // data
            serializeSecureBlockData(secureData.type, secureData.data),
        ].filter((i) => i));
        return { prev, parent, data };
    }

    /**
     * Deserializes binary data into a secure block data object.
     * @param {number} type The block type.
     * @param {Buffer} data The data to deserialize.
     * @returns {Object} The deserialized secure block data.
     */
    function deserializeSecureBlockData(type, data) {
        if (!data) {
            return null;
        }
        let index = 0;
        const result = {};
        if (type === constants.blockType.keys) {
            result.tsInit = utils.toInt64(data, index);
            index += constants.size.int64;
            result.tsExp = utils.toInt64(data, index);
            index += constants.size.int64;
            const actionCount = data[index++];
            const keys = {};
            for (let i = 0; i < actionCount; i += 1) {
                const action = data[index++];
                const keyCount = data[index++];
                const actionKeys = [];
                for (let j = 0; j < keyCount; j += 1) {
                    const keySize = data[index++];
                    actionKeys.push(data.slice(index, index + keySize)
                        .toString(constants.format.key));
                    index += keySize;
                }
                keys[action] = actionKeys;
            }
            result.keys = keys;
            const additionalData = data.slice(index);
            if (Buffer.byteLength(additionalData) > 0) {
                result.data = additionalData;
            }
        }
        return result;
    }

    /**
     * Given a blocktree object, deserializes it into a secure object.
     * @param {Buffer} buf The buffer to deserialize.
     * @returns {Object} A secure object.
     */
    function deserializeSecureBlock(btBlockData) {
        if (!btBlockData) {
            return null;
        }
        const {
            timestamp, prev, parent, nonce, hash, data,
        } = btBlockData;
        let index = 0;
        const result = {
            timestamp, prev, parent, nonce, hash,
        };
        result.type = data[index++];
        const sigLength = data[index++];
        if (sigLength > 0) {
            result.sig = data.slice(index, index + sigLength)
                .toString(constants.format.signature);
            index += sigLength;
        } else {
            result.sig = null;
        }
        result.data = deserializeSecureBlockData(result.type, data.slice(index));
        return result;
    }

    /**
     * Reads a secure block from the blocktree.
     * @param {string} block The block hash to read.
     * @returns {Promise<Object>} The requested secure data.
     */
    async function readSecureBlock(block) {
        return deserializeSecureBlock(await blocktree.readBlock(block));
    }

    /**
     * Writes a secure block to the blocktree.
     * @param {Object} secureData The secure object.
     * @returns {Promise<string>} The hash of the newly written block.
     */
    async function writeSecureBlock(secureData) {
        return blocktree.writeBlock(serializeSecureBlock(secureData));
    }

    /**
     * Given a block, scans the blocks in the system to find the next one.
     * @param {string} block The block to start from.
     * @returns {Promise<string>} The hash of the next block, or null.
     */
    async function getNextBlock(block) {
        return blocktree.getNextBlock(block);
    }

    /**
     * Given a block, locates the root block of the blockchain.
     * If block is null, retries the root of the blocktree.
     * @param {string} block The block to start from.
     * @returns {Promise<string>} The root block of the blockchain or blocktree, or null.
     */
    async function getRootBlock(block) {
        return blocktree.getRootBlock(block);
    }

    /**
     * Given a block, locates the parent of this block on the blocktree.
     * @param {string} block The block to start from.
     * @returns {Promise<string>} The parent block of the specified block, or null.
     */
    async function getParentBlock(block) {
        return blocktree.getParentBlock(block);
    }

    /**
     * Given a block, finds the head block in the blockchain.
     * @param {string} block The block to start with.
     * @returns {Promise<string>} The head block of the blockchain.
     */
    async function getHeadBlock(block) {
        return blocktree.getHeadBlock(block);
    }

    /**
     * Determines whether or not a key is active.
     * @param {BigInt} tsInit The initializion timestamp for the key.
     * @param {BigInt} tsExp The expiration timestamp for the key.
     * @param {BigInt} timestamp The timestamp to check with, or "now" if null.
     * @returns {Promise<boolean>} Whether or not the key is active.
     */
    async function isKeyActive({
        tsInit, tsExp, timestamp,
    }) {
        const ts = !timestamp ? os.generateTimestamp() : timestamp;
        return ts >= tsInit && ts < tsExp;
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
        block, isRecursive, isActive, action, timestamp,
    } = {}) {
        if (!block) {
            return [];
        }
        const result = [];
        let current = await blocktree.getHeadBlock(block);
        let secureBlock = null;
        const inactiveKeys = {};
        while (current != null) {
            secureBlock = await readSecureBlock(current);
            if (secureBlock.type === constants.blockType.keys) {
                const actionKeys = Object.keys(secureBlock.data.keys);
                for (let i = 0; i < actionKeys.length; i += 1) {
                    if (action === undefined
                        || parseInt(action, 10) === parseInt(actionKeys[i], 10)) {
                        const keyList = secureBlock.data.keys[actionKeys[i]];
                        for (let j = 0; j < keyList.length; j += 1) {
                            const key = keyList[j];
                            const { tsInit, tsExp } = secureBlock.data;
                            if (isActive === true
                                && !(await isKeyActive({ tsInit, tsExp, timestamp }))) {
                                inactiveKeys[key] = true;
                            }
                            if (!inactiveKeys[key]) {
                                result.push({
                                    key,
                                    block: current,
                                    action: parseInt(actionKeys[i], 10),
                                    tsInit: secureBlock.data.tsInit,
                                    tsExp: secureBlock.data.tsExp,
                                });
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
     * Determines if the "parentKey" is the parent key of "key".
     * @param {string} parentKey The parent key.
     * @param {string} key The alleged child key.
     * @returns {Promise<boolean>} Whether or not the "parent key" is the parent of "key".
     */
    async function isKeyParentOf(parentKey, key) {
        return certificates.isKeyParentOf(parentKey, key);
    }

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
        const keyList = (await performKeyScan({
            block,
            isActive: true,
            isRecursive: true,
            action: action || constants.action.write,
        })).map((i) => i.key);

        // keep trying until a key is found, or there aren't any left.
        const results = await Promise.all(
            keyList.map(async (key) => ({
                result: await verifySignedBlock({
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

    /**
     * Validates a key by checking the certificate chain until the root is reached.
     * @param {string} block The block to start validating from.
     * @param {string} key The key to validate.
     * @param {number} action The action to perform.
     * @returns {Promise<boolean>} Whether the key is valid or not.
     */
    async function validateKey({
        block, key, action, timestamp,
    }) {
        const keyData = await performKeyScan({
            block,
            isRecursive: true,
        });
        for (let i = 0; i < keyData.length; i += 1) {
            const { tsInit, tsExp } = keyData[i];
            if (keyData[i].action === action
                && await isKeyActive({ tsInit, tsExp, timestamp })
                && await isKeyParentOf(keyData[i].key, key)) {
                const parent = await blocktree.getParentBlock(block);
                if (!parent) {
                    return true;
                }
                return validateKey({
                    block: parent, key: keyData[i].key, action, timestamp,
                });
            }
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
    async function validateKeysInternal({ block, keys, action }) {
        const result = await Promise.all(
            keys.map(async (k) => validateKey({ block, key: k, action })),
        );
        return result.filter((i) => i).length;
    }

    /**
     * Given a set of keys and actions, validates all given keys.
     * @param {string} block The block to start validating from.
     * @param {string} keys The key sets to validate.
     * @returns {Promise<boolean>} Whether the key is valid or not.
     */
    async function validateKeys({ block, keys }) {
        const results = await Promise.all(
            Object.keys(keys).map(
                async (k) => validateKeysInternal({
                    block,
                    keys: keys[k],
                    action: parseInt(k, 10),
                }),
            ),
        );
        if (results.reduce((a, b) => a + b) < Object.keys(keys).length) {
            throw new InvalidKeyError();
        }
    }

    /**
     * Given a block, verifies that the block has a parent.
     * @param {string} block The block to check
     * @returns {Promise<string>} The parent block, or throws an exception.
     */
    async function validateParentBlock({ prev, parent, type }) {
        let selected = null;
        if (prev) {
            selected = await blocktree.getParentBlock(prev);
        } else if (parent) {
            selected = await blocktree.getRootBlock(parent);
        }
        if (selected === null) {
            throw new InvalidBlockError({ block: selected }, InvalidBlockError.reasons.isNull,
                constants.layer.secureBlocktree);
        }
        // get the root block if we're adding to the current blockchain.
        const blockToValidate = prev ? await blocktree.getRootBlock(prev) : selected;
        const validateData = await readSecureBlock(blockToValidate);
        if (!constants.parentBlockTypes[type].includes(validateData.type)) {
            // check if we're dealing with the root block.
            if (type === constants.blockType.zone
                && validateData.prev === null
                && validateData.parent === null) {
                return selected;
            }
            throw new InvalidBlockError({
                block: blockToValidate,
                type,
                parentType: validateData.type,
            }, InvalidBlockError.reasons.invalidParentType,
            constants.layer.secureBlocktree);
        }
        return selected;
    }

    /**
     * Writes new keys to the specified blockchain.
     * @param {string} sig The signature to use.
     * @param {string} block The block to add keys to.
     * @param {Object} keys A set of actions with associated keys.
     * @param {BigInt} tsInit The initializion timestamp for the keys.
     * @param {BigInt} tsExp The expiration timestamp for the keys.
     * @returns {Promise<string>} The new block.
     */
    async function setKeys({
        sig, block, keys, tsInit, tsExp,
    }) {
        const type = constants.blockType.keys;
        const init = tsInit !== undefined ? tsInit : constants.timestamp.zero;
        const exp = tsExp !== undefined ? tsExp : constants.timestamp.max;
        const prev = block ? await blocktree.getHeadBlock(block) : block;
        let parent = null;
        let signature = null;

        // if attempting to initialize the root...
        if (sig === null && prev === null) {
            // there can only be one root key in the system.
            if (await blocktree.countBlocks() > 0) {
                throw new InvalidRootError();
            }
        } else {
            // validate the provided signature, the keys, and the parent value.
            parent = await validateParentBlock({ prev, type });
            signature = await validateSignature({ sig, prev, parent });
            await validateKeys({ block: prev, keys });
        }

        const data = { keys, tsInit: init, tsExp: exp };
        return writeSecureBlock({
            sig: signature, parent, prev, type, data,
        });
    }

    /**
     * Revokes keys from the specified blockchain.
     * @param {string} sig The signature to use.
     * @param {string} block The block to add keys to.
     * @param {Object} keys A set of actions with associated keys.
     * @param {BigInt} tsInit The initializion timestamp for the keys.
     * @param {BigInt} tsExp The expiration timestamp for the keys.
     * @returns {Promise<string>} The new block.
     */
    async function revokeKeys({ sig, block, keys }) {
        return setKeys({
            sig, block, keys, tsInit: constants.timestamp.min, tsExp: constants.timestamp.min,
        });
    }

    /**
     * Specifies configuration options for the specified blockchain.
     * @param {string} sig The signature to use.
     * @param {string} block The block to add keys to.
     * @param {Object} options The key/value pairs to set.
     * @returns {Promise<string>} The new block.
     */
    async function setOptions({
        sig, block, options,
    }) {
        const type = constants.blockType.options;
        // validate the provided signature and the parent value.
        const prev = block ? await blocktree.getHeadBlock(block) : block;
        const parent = await validateParentBlock({ prev, type });
        const signature = await validateSignature({ sig, prev, parent });

        return writeSecureBlock({
            sig: signature, parent, prev, type, data: options,
        });
    }

    /**
     * @private
     * Creates a child block.
     * @param {string} sig The signature to use.
     * @param {string} block The block to add a child block to.
     * @param {number} type The secure block type to create.
     * @param {object} data The block type data to write.
     * @returns {Promise<string>} The new block.
     */
    async function createChildBlockInternal({

        sig, block, type, data,
    }) {
        if (!sig) {
            throw new InvalidSignatureError({ results: [] });
        }
        if (!block) {
            throw new InvalidBlockError({ block }, InvalidBlockError.reasons.isNull,
                constants.layer.secureBlocktree);
        }
        // always all child blocks to the root.
        const parent = await validateParentBlock({ parent: block, type });

        // validate the provided signature.
        const signature = await validateSignature({ sig, parent, prev: null });

        // create a new blockchain for the child block.
        const childBlock = await writeSecureBlock({
            sig: signature, parent, prev: null, type, data,
        });

        return childBlock;
    }

    /**
     * Creates a new zone, which acts as a permission container for managing keys and data.
     * @param {string} sig The signature to use.
     * @param {string} block The block to add a zone to.
     * @param {Object} keys A set of actions with associated keys, or null if no zone keys.
     * @param {string} name The name of the zone.
     * @returns {Promise<string>} The new block.
     */
    async function createZone({
        sig, block, keys, name,
    }) {
        return createChildBlockInternal({
            sig,
            block,
            keys,
            type: constants.blockType.zone,
            data: {
                name,
            },
        });
    }

    /**
     * Creates a new identity, which represents a user or system.
     * @param {string} sig The signature to use.
     * @param {string} block The block to add an identity to.
     * @param {Object} keys A set of actions with associated keys, or null if no zone keys.
     * @param {string} name The name of the identity.
     * @returns {Promise<string>} The new block.
     */
    async function createIdentity({
        sig, block, keys, name,
    }) {
        return createChildBlockInternal({
            sig,
            block,
            keys,
            type: constants.blockType.identity,
            data: {
                name,
            },
        });
    }

    /**
     * Creates a new ledger, which represents a blockchain for storing data.
     * @param {string} sig The signature to use.
     * @param {string} block The block to add a ledger to.
     * @param {Object} keys A set of actions with associated keys, or null if no zone keys.
     * @param {string} name The name of the ledger.
     * @returns {Promise<string>} The new block.
     */
    async function createLedger({
        sig, block, keys, name,
    }) {
        return createChildBlockInternal({
            sig,
            block,
            keys,
            type: constants.blockType.ledger,
            data: {
                name,
            },
        });
    }

    /**
     * Performs the initial configuration of a secure blocktree.
     * @param {Object} rootKeys The keys to associate with the root blockchain.
     * @param {Object} rootZoneKeys The keys to associate with the root zone.
     * @param {Function} signAsRoot A function which will sign using the root key.
     * @returns {Promise<Object>} The root and root zone blocks.
     */
    async function installRoot({ rootKeys, rootZoneKeys, signAsRoot }) {
        // there can only be one root key in the system.
        if (await blocktree.countBlocks() > 0) {
            throw new InvalidRootError();
        }

        // create the root block.
        const rootBlock = await setKeys({
            sig: null,
            block: null,
            keys: rootKeys,
        });
        await secureCache.writeCache(null, constants.secureCache.rootBlock, rootBlock);

        // establish the root zone.
        const rootZone = await createZone({
            sig: signAsRoot,
            block: rootBlock,
        });
        await secureCache.writeCache(null, constants.secureCache.rootZone, rootZone);

        // set the root zone keys.
        await setKeys({
            sig: signAsRoot,
            block: rootZone,
            keys: rootZoneKeys,
        });
        return { rootBlock, rootZone };
    }

    /**
     * Handles CLI requests.
     * @param {object} env The CLI environment context.
     * @param {string} command The command to execute.
     * @param {Array} parameters The command parameters.
     * @returns {Promise<boolean>} Whether or not the command was handled.
     */
    async function handleCommand(env, command, parameters) {
        switch (command) {
        case 'install-root': {
            const rootWriteKey = 'bbbb';
            const rootKeys = { [constants.action.read]: ['aaaa'], [constants.action.write]: ['bbbb'] };
            const rootZoneKeys = { [constants.action.read]: ['cccc'], [constants.action.write]: ['dddd'] };
            const signAsRoot = ({ parent, prev }) => signBlock({ key: rootWriteKey, parent, prev });
            await env.println(await installRoot({ rootKeys, rootZoneKeys, signAsRoot }));
            return true;
        }
        case 'read-secure-block': {
            await env.resolveBlock(parameters[0], blocktree.listBlocks, async (block) => {
                await env.println(await readSecureBlock(block));
            });
            return true;
        }
        case 'key-scan': {
            await env.resolveBlock(parameters[0], blocktree.listBlocks, async (block) => {
                await env.println(await performKeyScan({ block, isRecursive: true }));
            });
            return true;
        }
        default:
            return false;
        }
    }

    return {
        encryptData,
        decryptData,
        signBlock,
        verifySignedBlock,
        serializeSecureBlock,
        deserializeSecureBlock,
        readSecureBlock,
        getNextBlock,
        getRootBlock,
        getParentBlock,
        getHeadBlock,
        performKeyScan,
        validateSignature,
        validateKey,
        validateKeys,
        validateParentBlock,
        setKeys,
        revokeKeys,
        setOptions,
        createZone,
        createIdentity,
        createLedger,
        installRoot,
        handleCommand,
    };
};
