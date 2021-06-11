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

    async function serializeSecureBlockData(data) {

    }

    async function serializeSecureBlock(secureData) {

    }

    async function deserializeSecureBlockData(data) {

    }

    async function deserializeSecureBlock(btData) {

    }

    async function readSecureBlock(block) {
        return deserializeSecureBlock(await blocktree.readBlock(block));
    }

    async function writeSecureBlock(secureData) {
        return blocktree.writeBlock(serializeSecureBlock(secureData));
    }

    async function getBlockPublicKeys({ parent, action, type }) {
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

    async function keyScan(block, isRecursive = false) {
        const result = [];
        let current = await blocktree.getHeadBlock(block);
        while (current != null) {
            const secureBlock = await readSecureBlock(current);
            if (secureBlock.data.type === constants.blockType.keys) {
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

    async function isKeyActive( { key, init_ts, exp_ts, timestamp }) {
        const ts = timestamp === null ? os.generateTimestamp() : timestamp;
        return ts >= init_ts && ts < exp_ts;
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

        const data = { type: constants.blockType.keys, keys, init_ts, exp_ts };
        await writeSecureBlock({
            sig, parent, prev: block, data
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
            sig, parent: block, prev: null, data: { type: constants.blockType.zone, name }
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
