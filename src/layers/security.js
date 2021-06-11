// Blocktree API Level 3 - Security

const constants = require('../constants');
const convert = require('../convert');

module.exports = function securityLayerFactory({ blocktree, secureCache, os }) {

    async function encrypt(key, data) {
        return data;
    }

    async function decrypt(key, data) {
        return data;
    }

    function serializeSecureBlockData(type, dataItem) {
        if (type === constants.blockType.keys) {
            const { keys, init_ts, exp_ts } = dataItem;
            const data = Buffer.concat([
                // key count
                Buffer.from([Object.keys(keys).length]),
                // list of key actions
                ...Object.keys(keys).map(i => Buffer.from([i])),
                // list of keys
                ...Object.values(keys).map(i => Buffer.from(i, constants.format.hash)),
                // start and expiration timestamps for keys
                convert.fromInt64(init_ts),
                convert.fromInt64(exp_ts)
            ]);
            return { prev, parent, data };     
        }
    }

    function serializeSecureBlock(secureData) {
        const { prev, parent } = secureData;
        const data = Buffer.concat([
            // secure block type
            Buffer.from([secureData.type]),            
            // signature
            secureData.sig,
            // data
            serializeSecureBlockData(secureData.type, secureData.data)
        ]);
        return { prev, parent, data };
    }

    function deserializeSecureBlockData(data) {

    }

    function deserializeSecureBlock(btBlockData) {
        if (!btBlockData) {
            return null;
        }
        const { timestamp, prev, parent, nonce, hash, data } = btBlockData;
        let index = 0;
        const result = { timestamp, prev, parent, nonce, hash };
        result.type = data[index++];
        result.sig = data.slice(index, index + constants.size.signature);
        index += constants.size.signature;
        result.data = deserializeSecureBlockData(result.type, data.slice(index));
        return result;
    }

    async function readSecureBlock(block) {
        return deserializeSecureBlock(await blocktree.readBlock(block));
    }

    async function writeSecureBlock(secureData) {
        return blocktree.writeBlock(serializeSecureBlock(secureData));
    }

    async function keyScan(block, isRecursive = false) {
        const result = [];
        let current = await blocktree.getHeadBlock(block);
        while (current != null) {
            const secureBlock = await readSecureBlock(current);
            if (secureBlock.type === constants.blockType.keys) {
                result.push(secureBlock.data);
            }
        }
        if (isRecursive) {
            const parent = await blocktree.getParentBlock(block);
            if (!parent) {
                return result;
            }
            return [...result, keyScan(parent, isRecursive)];
        }
        return result;
    }

    function isKeyActive( { key, init_ts, exp_ts, timestamp }) {
        const ts = timestamp === null ? os.generateTimestamp() : timestamp;
        return ts >= init_ts && ts < exp_ts;
    }

    function isKeyParentOf(parentKey, key) {
        // TODO: handle certificate chains.
        return true;
    }

    async function getBlockPublicKeys({ block, action, type, isRecursive, timestamp }) {
        const results = [];
        const keyItems = await keyScan(block, isRecursive !== null ? isRecursive : false);
        keyItems.forEach(keyItem => {
            const { keys, init_ts, exp_ts } = keyItem || {};
            if (keys && keys[action]) {
                if (type === 'valid' && isKeyActive({ key: keys[action], init_ts, exp_ts, timestamp })) {
                    results.push(keys[action]);
                }
                else if (type === 'all') {
                    results.push(keys[action]);
                }
            }
        });
        return results;
    }

    async function validateSignature ({ sig, block, action, noThrow }) {
        // get the public keys for this action.
        const keyList = await getBlockPublicKeys({
            block,
            action: action || constants.action.write,
            type: 'valid'
        });
        // keep trying until a key is found, or there aren't any left.
        const results = await Promise.all(keyList.map(async pk => {
            // decrypt the signature.
            const sigResult = await decrypt(pk, sig);
            // the decrypted value from the signature should match the block hash.
            return sigResult !== null && sigResult !== null && sigResult === block;
        }));
        const result = results.find(i => i) !== undefined;
        if (!result && noThrow !== true) {
            throw new Error('Invalid signature.');
        }
        return result;
    }

    async function validateKey({ block, key, action }) {
        const keyData = await keyScan(block);
        for (let i = 0; i < keyData.length; i += 1) {
            if (isKeyActive({ key, init_ts: keyData[i].init_ts, exp_ts: keyData[i].exp_ts }) &&
                isKeyParentOf(keyData[i].keys[action], key)) {
                    const parent = await getParentBlock(block);
                    if (!parent) {
                        return true;
                    }
                    return validateKey({ block: parent, key: keyData[i].keys[action], action });
            }
        }
        throw new Error('The provided key is invalid.');
    }

    async function validateKeys({ block, keys }) {
        const results = Promise.all(Object.keys(keys).map(async (k) => validateKey({ block, key: keys[k], action: k })));
        if (results.length < Object.keys(keys).length) {
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
        init_ts = init_ts != undefined ? init_ts : constants.min.timestamp;
        exp_ts = exp_ts != undefined ? exp_ts : constants.max.timestamp;
        let parent = null;

        // if attempting to initialize the root...
        if (sig === null && block === null) {
            // there can only be one root key in the system.
            const blockData = blocktree.findInBlocks(i => true);
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
        await writeSecureBlock({
            sig, parent, prev: block, type: constants.blockType.keys, data
        });
    }

    async function revokeKeys({ sig, block, keys }) {
        return setKeys({ sig, block, keys, init_ts: constants.min.timestamp, exp_ts: constants.min.timestamp });
    }

    async function createZone({ sig, block, keys, name }) {
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
    }

    async function installRoot({ rootKeys, rootZoneKeys, signAsRoot }) {
        // there can only be one root key in the system.
        const blockData = blocktree.findInBlocks(i => true);
        if (blockData) {
            throw new Error('Cannot install a root if blocks are already present.');
        }

        // create the root block.
        const block = await setKeys({
            sig: null,
            block: null,
            keys: rootKeys
        });
        secureCache.writeCache(null, constants.secureCache.rootBlock, block);

        // establish the root zone.
        const zone = await createZone({
            sig: signAsRoot(block),
            block,
            keys: rootZoneKeys
        });
        secureCache.writeCache(null, constants.secureCache.rootZone, zone);
    }

    return {
        serializeSecureBlock,
        deserializeSecureBlock,
        readSecureBlock,
        writeSecureBlock,
        getBlockPublicKeys,
        validateSignature,
        validateKeys,
        validateParentBlock,
        setKeys,
        revokeKeys,
        createZone,
        installRoot
    }
};
