// Blocktree API Level 3 - Security

const constants = require('../constants');
const convert = require('../convert');

module.exports = function securityLayerFactory({ blocktree, secureCache, os, certificates }) {

    async function encryptData(key, data) {
        return certificates.encrypt(
            Buffer.from(key, constants.format.key),
            Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8')
        );
    }

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

    async function signBlock(key, block) {
        const result = await certificates.sign(
            Buffer.from(key, constants.format.key),
            Buffer.from(block, constants.format.hash)
        );
        return result.toString(constants.format.signature);
    }

    async function verifySignedBlock(key, sig, block) {
        const sigResult = await certificates.checkSignature(
            Buffer.from(key, constants.format.key),
            Buffer.from(sig, constants.format.signature)
        );
        const sigBlock = sigResult ? sigResult.toString(constants.format.hash) : null;
        return block !== null && sigBlock !== null && sigBlock === block;
    }

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

    async function readSecureBlock(block) {
        return deserializeSecureBlock(await blocktree.readBlock(block));
    }

    async function writeSecureBlock(secureData) {
        return blocktree.writeBlock(serializeSecureBlock(secureData));
    }

    async function performKeyScan(block, isRecursive = true) {
        if (!block) {
            return [];
        }
        const result = [];
        let current = await blocktree.getHeadBlock(block);
        while (current != null) {
            const secureBlock = await readSecureBlock(current);
            if (secureBlock.type === constants.blockType.keys) {
                Object.keys(secureBlock.data.keys).forEach((action) => {
                    secureBlock.data.keys[action].forEach((key) => {
                        result.push({
                            key,
                            action: parseInt(action, 10),
                            init_ts: secureBlock.data.init_ts,
                            exp_ts: secureBlock.data.exp_ts
                        });
                    });
                });
            }
            current = secureBlock.prev;
        }
        if (isRecursive) {
            const parent = await blocktree.getParentBlock(block);
            if (!parent) {
                return result;
            }
            return [...result, ...await performKeyScan(parent, isRecursive)];
        }
        return result;
    }

    async function isKeyActive({ key, init_ts, exp_ts, timestamp }) {
        const ts = !timestamp ? os.generateTimestamp() : timestamp;
        return ts >= init_ts && ts < exp_ts;
    }

    async function isKeyParentOf(parentKey, key) {
        // TODO: handle certificate chains.
        return true;
    }

    async function getBlockPublicKeys({ block, action, type, isRecursive, timestamp }) {
        const keyItems = await performKeyScan(block, isRecursive !== null ? isRecursive : false);
        return (await Promise.all(keyItems
            .filter(i => i.action === action)
            .map(async (keyItem) => {
                const { key, init_ts, exp_ts } = keyItem || {};
                if (type === 'valid' && await isKeyActive({ key, init_ts, exp_ts, timestamp })) {
                    return keyItem.key;
                }
                else if (type === 'all') {
                    return keyItem.key;
                }
                return null;
            }))).filter(i => i);
    }

    async function validateSignature({ sig, block, action, noThrow }) {
        // get the public keys for this action.
        const keyList = await getBlockPublicKeys({
            block,
            action: action || constants.action.write,
            type: 'valid'
        });
        // keep trying until a key is found, or there aren't any left.
        const results = await Promise.all(keyList.map(async pk => verifySignedBlock(pk, sig, block)));
        const result = results.find(i => i) !== undefined;
        if (!result && noThrow !== true) {
            throw new Error('Invalid signature.');
        }
        return result;
    }

    async function validateKey({ block, key, action }) {
        const keyData = await performKeyScan(block);
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

    async function validateKeysInternal({ block, keys, action }) {
        const result = await Promise.all(keys.map(async (k) => validateKey({ block, key: k, action })));
        return result.filter(i => i).length;
    }

    async function validateKeys({ block, keys }) {
        const results = await Promise.all(Object.keys(keys).map(async (k) => validateKeysInternal({ block, keys: keys[k], action: parseInt(k, 10) })));
        if (results.reduce((a, b) => a + b) < Object.keys(keys).length) {
            throw new Error('Invalid keys detected.');
        }
    }

    async function validateParentBlock(block) {
        const parent = await blocktree.getParentBlock(block);
        if (parent === null) {
            throw new Error('Parent block cannot be null.');
        }
        return parent;
    }

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
        return writeSecureBlock({
            sig, parent, prev: block, type: constants.blockType.keys, data
        });
    }

    async function revokeKeys({ sig, block, keys }) {
        return setKeys({ sig, block, keys, init_ts: constants.timestamp.min, exp_ts: constants.timestamp.min });
    }

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
        getBlockPublicKeys,
        validateSignature,
        validateKeys,
        validateParentBlock,
        setKeys,
        revokeKeys,
        createZone,
        installRoot,
        handleCommand
    }
};
