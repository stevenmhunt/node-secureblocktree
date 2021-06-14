const constants = require('../constants');
const convert = require('../convert');

/**
 * Blocktree Level 3 - Security
 */
module.exports = function securityLayerFactory({ blocktree, secureCache, os, certificates }) {

    /**
     * Encrypts data using the specified key.
     * @param {string} key The key to encrypt data with.
     * @param {*} data The data to encrypt.
     * @returns {Promise<Buffer>} The encrypted data.
     */
    async function encryptData(key, data) {
        return certificates.encrypt(
            Buffer.from(key, constants.format.key),
            Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8')
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
            Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8')
        );
        if (options && options.encoding) {
            return result.toString(options.encoding);
        }
        return result;
    }

    /**
     * Digitally signs a block using the specified key.
     * @param {string} key The key to sign the block with (usually a write key).
     * @param {string} block The block to sign.
     * @returns {Promise<Buffer>} The signed block data.
     */
    async function signBlock(key, block) {
        const result = await certificates.sign(
            Buffer.from(key, constants.format.key),
            Buffer.from(block, constants.format.hash)
        );
        return result.toString(constants.format.signature);
    }

    /**
     * Given a key, a signature, and a block, determines if the signature is valid and matches the block.
     * @param {*} key The key to verify.
     * @param {*} sig The signature generated when the block was signed.
     * @param {*} block The block to validate.
     * @returns {Promise<boolean>} Whether or not the signature and key are valid for the block.
     */
    async function verifySignedBlock(key, sig, block) {
        const sigResult = await certificates.checkSignature(
            Buffer.from(key, constants.format.key),
            Buffer.from(sig, constants.format.signature)
        );
        const sigBlock = sigResult ? sigResult.toString(constants.format.hash) : null;
        return block !== null && sigBlock !== null && sigBlock === block;
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
            keyList.forEach(keyItem => {
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
            const { keys, init_ts, exp_ts, data } = dataItem;
            let dataValue = data || Buffer.alloc(0);
            const result = Buffer.concat([
                // start and expiration timestamps for keys
                convert.fromInt64(init_ts),
                convert.fromInt64(exp_ts),
                serializeKeys(keys),
                // (optional) additional data
                dataValue
            ]);
            return result;
        }
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
            sigData
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
            serializeSecureBlockData(secureData.type, secureData.data)
        ].filter(i => i));
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
            result.init_ts = convert.toInt64(data, index);
            index += constants.size.int64;
            result.exp_ts = convert.toInt64(data, index);
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
        const { timestamp, prev, parent, nonce, hash, data } = btBlockData;
        let index = 0;
        const result = { timestamp, prev, parent, nonce, hash };
        result.type = data[index++];
        const sigLength = data[index++];
        if (sigLength > 0) {
            result.sig = data.slice(index, index + sigLength)
                .toString(constants.format.signature);
            index += sigLength;
        }
        else {
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
     * Determines whether or not the specified key is active.
     * @param {string} key The key to check.
     * @param {BigInt} init_ts The initializion timestamp for the key.
     * @param {BigInt} exp_ts The expiration timestamp for the key.
     * @param {BigInt} timestamp The timestamp to check with, or "now" if left blank.
     * @returns {Promise<boolean>} Whether or not the key is active.
     */
    async function isKeyActive({ key, init_ts, exp_ts, timestamp }) {
        const ts = !timestamp ? os.generateTimestamp() : timestamp;
        return ts >= init_ts && ts < exp_ts;
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
    async function performKeyScan({ block, isRecursive, isActive, action, timestamp } = {}) {
        if (!block) {
            return [];
        }
        const result = [];
        let current = await blocktree.getHeadBlock(block);
        while (current != null) {
            const secureBlock = await readSecureBlock(current);
            if (secureBlock.type === constants.blockType.keys) {
                Object.keys(secureBlock.data.keys).forEach((a) => {
                    if (action === undefined || parseInt(action, 10) === parseInt(a, 10)) {
                        secureBlock.data.keys[a].forEach((key) => {
                            if (isActive !== true || isKeyActive(key, secureBlock.data.init_ts, secureBlock.data.exp_ts, timestamp)) {
                                result.push({
                                    key,
                                    block: current,
                                    action: parseInt(a, 10),
                                    init_ts: secureBlock.data.init_ts,
                                    exp_ts: secureBlock.data.exp_ts
                                });
                            }
                        });
                    }
                });
            }
            current = secureBlock.prev;
        }
        if (isRecursive === true) {
            const parent = await blocktree.getParentBlock(block);
            if (!parent) {
                return result;
            }
            return [...result, ...await performKeyScan({ block: parent, isRecursive, isActive, action, timestamp })];
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
        // TODO: handle certificate chains.
        return true;
    }

    /**
     * Validates a signature based on the provided block and action to perform.
     * @param {string} sig The signature to validate.
     * @param {string} block The block to validate.
     * @param {number} action The action to validate.
     * @param {boolean} noThrow Whether or not to throw an exception if validation fails.
     * @returns {Promise<boolean>} Whether or not the signature was validated. 
     */
    async function validateSignature({ sig, block, action, noThrow }) {
        // get the public keys for this action.
        const keyList = (await performKeyScan({
            block,
            isActive: true,
            isRecursive: true,
            action: action || constants.action.write
        })).map(i => i.key);

        // keep trying until a key is found, or there aren't any left.
        const results = await Promise.all(keyList.map(async pk => verifySignedBlock(pk, sig, block)));
        const result = results.find(i => i) !== undefined;
        if (!result && noThrow !== true) {
            throw new Error('Invalid signature.');
        }
        return result;
    }

    /**
     * Validates a key by checking the certificate chain until the root is reached.
     * @param {string} block The block to start validating from.
     * @param {string} key The key to validate.
     * @param {number} action The action to perform.
     * @returns {Promise<boolean>} Whether the key is valid or not.
     */
    async function validateKey({ block, key, action }) {
        const keyData = await performKeyScan({
            block,
            isRecursive: true
        });
        for (let i = 0; i < keyData.length; i += 1) {
            if (keyData[i].action === action &&
                await isKeyActive({ key: keyData[i].key, init_ts: keyData[i].init_ts, exp_ts: keyData[i].exp_ts }) &&
                await isKeyParentOf(keyData[i].key, key)) {
                const parent = await blocktree.getParentBlock(block);
                if (!parent) {
                    return true;
                }
                return validateKey({ block: parent, key: keyData[i].key, action });
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
        const result = await Promise.all(keys.map(async (k) => validateKey({ block, key: k, action })));
        return result.filter(i => i).length;
    }

    /**
     * Given a set of keys and actions, validates all given keys.
     * @param {string} block The block to start validating from.
     * @param {string} keys The key sets to validate.
     * @returns {Promise<boolean>} Whether the key is valid or not.
     */
    async function validateKeys({ block, keys }) {
        const results = await Promise.all(Object.keys(keys).map(async (k) => validateKeysInternal({ block, keys: keys[k], action: parseInt(k, 10) })));
        if (results.reduce((a, b) => a + b) < Object.keys(keys).length) {
            throw new Error('Invalid keys detected.');
        }
    }

    /**
     * Given a block, verifies that the block has a parent.
     * @param {string} block The block to check
     * @returns {Promise<string>} The parent block, or throws an exception.
     */
    async function validateParentBlock(block) {
        const parent = await blocktree.getParentBlock(block);
        if (parent === null) {
            throw new Error('Parent block cannot be null.');
        }
        return parent;
    }

    /**
     * Writes new keys to the specified blockchain.
     * @param {string} sig The signature to use.
     * @param {string} block The block to add keys to.
     * @param {Object} keys A set of actions with associated keys.
     * @param {BigInt} init_ts The initializion timestamp for the keys.
     * @param {BigInt} exp_ts The expiration timestamp for the keys.
     * @returns {Promise<string>} The new block.
     */
    async function setKeys({ sig, block, keys, init_ts, exp_ts }) {
        init_ts = init_ts != undefined ? init_ts : constants.timestamp.zero;
        exp_ts = exp_ts != undefined ? exp_ts : constants.timestamp.max;
        let parent = null;

        // if attempting to initialize the root...
        if (sig === null && block === null) {
            // there can only be one root key in the system.
            const blockData = await blocktree.findInBlocks(i => true);
            if (blockData) {
                throw new Error('Cannot install a root if blocks are already present.');
            }
        }
        else {
            // validate the provided signature, the keys, and the parent value.
            parent = await validateParentBlock(block);
            await validateSignature({ sig, block: parent });
            await validateKeys({ block, keys });
        }

        const data = { keys, init_ts, exp_ts };
        const prev = block ? await blocktree.getHeadBlock(block) : block;
        return writeSecureBlock({
            sig, parent, prev, type: constants.blockType.keys, data
        });
    }

    /**
     * Revokes keys from the specified blockchain.
     * @param {string} sig The signature to use.
     * @param {string} block The block to add keys to.
     * @param {Object} keys A set of actions with associated keys.
     * @param {BigInt} init_ts The initializion timestamp for the keys.
     * @param {BigInt} exp_ts The expiration timestamp for the keys.
     * @returns {Promise<string>} The new block.
     */
    async function revokeKeys({ sig, block, keys }) {
        return setKeys({ sig, block, keys, init_ts: constants.timestamp.min, exp_ts: constants.timestamp.min });
    }

    /**
     * Creates a new zone, which acts as a permission container for managing keys and data.
     * @param {string} sig The signature to use.
     * @param {string} block The block to add a zone to.
     * @param {Object} keys A set of actions with associated keys, or null if no zone keys.
     * @param {string} name The name of the zone.
     * @returns {Promise<string>} The new block.
     */
    async function createZone({ sig, block, keys, name }) {
        if (!sig) {
            throw new Error('A signature is required.');
        }
        if (!block) {
            throw new Error('A valid block is required.');
        }

        // validate the provided signature.
        await validateSignature({ sig, block });

        // create a new blockchain for the zone.
        const zoneBlock = await writeSecureBlock({
            sig, parent: block, prev: null, type: constants.blockType.zone, data: { name }
        });

        // configure keys
        if (keys) {
            await setKeys({ sig, block: zoneBlock, keys });
        }

        return zoneBlock;
    }

    /**
     * Performs the initial configuration of a secure blocktree.
     * @param {Object} rootKeys The keys to associate with the root blockchain.
     * @param {Object} rootZoneKeys The keys to associate with the root zone.
     * @param {Function} signAsRoot A function which will sign the specified block using the root key.
     * @returns {Promise<Object>} The root and root zone blocks.
     */
    async function installRoot({ rootKeys, rootZoneKeys, signAsRoot }) {
        // there can only be one root key in the system.
        const blockData = await blocktree.findInBlocks(i => true);
        if (blockData) {
            throw new Error('Cannot install a root if blocks are already present.');
        }

        // create the root block.
        const rootBlock = await setKeys({
            sig: null,
            block: null,
            keys: rootKeys
        });
        await secureCache.writeCache(null, constants.secureCache.rootBlock, rootBlock);

        // establish the root zone.
        const rootZone = await createZone({
            sig: await signAsRoot(rootBlock),
            block: rootBlock,
            keys: rootZoneKeys
        });
        await secureCache.writeCache(null, constants.secureCache.rootZone, rootZone);
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
                const signAsRoot = block => signBlock(rootWriteKey, block);
                console.log(await installRoot({ rootKeys, rootZoneKeys, signAsRoot }));
                return true;
            }
            case 'read-secure-block': {
                await env.resolveBlock(parameters[0], blocktree.listBlocks, async function (block) {
                    console.log(await readSecureBlock(block));
                });
                return true;
            }
            case 'key-scan': {
                await env.resolveBlock(parameters[0], blocktree.listBlocks, async function (block) {
                    console.log(await performKeyScan({ block, isRecursive: true }));
                });
                return true;
            }
        }
        return false;
    }

    return {
        signBlock,
        verifySignedBlock,
        serializeSecureBlock,
        deserializeSecureBlock,
        readSecureBlock,
        writeSecureBlock,
        performKeyScan,
        validateSignature,
        validateKey,
        validateKeys,
        validateParentBlock,
        setKeys,
        revokeKeys,
        createZone,
        installRoot,
        handleCommand
    }
};
