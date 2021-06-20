const constants = require('../../constants');
const { deserializeKey } = require('./serialization/deserialize');
const {
    InvalidSignatureError, InvalidBlockError, InvalidRootError,
} = require('../../errors');

/**
 * Secure Blocktree Block Types API.
 */
module.exports = function secureBlocktreeBlockTypesFactory({
    context, blocktree, secureCache,
}) {
    /**
     * Writes new keys to the specified blockchain.
     * @param {Buffer} sig The signature to use.
     * @param {Buffer} block The block to add keys to.
     * @param {Object} keys A set of actions with associated keys.
     * @param {Object} storedKeys Encrypted keystore used for trusted reads.
     * @param {Object} certificates A set of actions with associated certificates.
     * @param {BigInt} tsInit The initializion timestamp for the keys.
     * @param {BigInt} tsExp The expiration timestamp for the keys.
     * @returns {Promise<string>} The new block.
     */
    async function setKeys({
        sig, block, keys, storedKeys, certificates, tsInit, tsExp,
    }) {
        const type = constants.blockType.keys;
        const init = tsInit !== undefined ? tsInit : constants.timestamp.zero;
        const exp = tsExp !== undefined ? tsExp : constants.timestamp.max;
        const prev = block ? await blocktree.getHeadBlock(block) : block;
        let parent = null;
        let signature = null;
        let parentKey = null;

        // if attempting to initialize the root...
        if (sig === null && prev === null && parentKey === null) {
            // there can only be one root key in the system.
            if (await blocktree.countBlocks() > 0) {
                throw new InvalidRootError();
            }
        } else {
            // validate the provided signature, the keys, and the parent value.
            parent = await context.validateParentBlock({ prev, type });
            signature = await context.validateSignature({ sig, prev, parent });
            const keyData = deserializeKey(Buffer.from(signature, constants.format.signature));
            parentKey = keyData.result;
            await context.validateKeys({ block: prev, keys, parentKey });
        }

        const data = {
            parentKey, keys, storedKeys, certificates, tsInit: init, tsExp: exp,
        };
        return context.writeSecureBlock({
            sig: signature, parent, prev, type, data,
        });
    }

    /**
     * Revokes keys from the specified blockchain.
     * @param {Buffer} sig The signature to use.
     * @param {Buffer} block The block to add keys to.
     * @param {Object} keys A set of actions with associated keys.
     * @param {Object} certificates A set of actions with associated certificates.
     * @param {BigInt} tsInit The initializion timestamp for the keys.
     * @param {BigInt} tsExp The expiration timestamp for the keys.
     * @returns {Promise<string>} The new block.
     */
    async function revokeKeys({
        sig, block, parentKey, keys, certificates,
    }) {
        return setKeys({
            sig,
            block,
            keys,
            certificates,
            parentKey,
            tsInit: constants.timestamp.zero,
            tsExp: constants.timestamp.zero,
        });
    }

    /**
     * Specifies configuration options for the specified blockchain.
     * @param {Buffer} sig The signature to use.
     * @param {Buffer} block The block to add keys to.
     * @param {Object} options The key/value pairs to set.
     * @returns {Promise<string>} The new block.
     */
    async function setOptions({
        sig, block, options,
    }) {
        const type = constants.blockType.options;
        // validate the provided signature and the parent value.
        const prev = block ? await blocktree.getHeadBlock(block) : block;
        const parent = await context.validateParentBlock({ prev, type });
        const signature = await context.validateSignature({ sig, prev, parent });

        return context.writeSecureBlock({
            sig: signature, parent, prev, type, data: options,
        });
    }

    /**
     * Adds a record to a collection.
     * @param {Buffer} sig The signature to use.
     * @param {Buffer} block The block to add keys to.
     * @param {Object} data The key/value pairs to set.
     * @returns {Promise<string>} The new block.
     */
    async function addRecord({
        sig, block, data,
    }) {
        const type = constants.blockType.record;
        // validate the provided signature and the parent value.
        const prev = block ? await blocktree.getHeadBlock(block) : block;
        const parent = await context.validateParentBlock({ prev, type });
        const signature = await context.validateSignature({
            sig, prev, parent, requireParent: false,
        });

        return context.writeSecureBlock({
            sig: signature, parent, prev, type, data,
        });
    }

    /**
     * Creates the root block in the secure blocktree.
     * @param {Object} keys A set of actions with associated keys.
     * @param {Object} storedKeys Encrypted keystore used for trusted reads.
     * @param {Object} certificates A set of actions with associated certificates.
     * @returns {Promise<string>} The root block.
     */
    async function createRoot({
        keys, storedKeys, certificates,
    }) {
        // there can only be one root key in the system.
        if (await blocktree.countBlocks() > 0) {
            throw new InvalidRootError();
        }

        const type = constants.blockType.root;
        const tsInit = constants.timestamp.zero;
        const tsExp = constants.timestamp.max;
        const parent = null;
        const prev = null;
        const signature = null;
        const parentKey = null;

        const data = {
            parentKey, keys, storedKeys, certificates, tsInit, tsExp,
        };
        const result = await context.writeSecureBlock({
            sig: signature, parent, prev, type, data,
        });
        await secureCache.writeCache(null, constants.secureCache.rootBlock, result);
        return result;
    }

    /**
     * @private
     * Creates a child block.
     * @param {Buffer} sig The signature to use.
     * @param {Buffer} block The block to add a child block to.
     * @param {number} type The secure block type to create.
     * @param {object} data The block type data to write.
     * @returns {Promise<string>} The new block.
     */
    async function createChildBlockInternal({

        sig, block, type, data,
    }) {
        if (!sig) {
            throw new InvalidSignatureError({ results: [] },
                InvalidSignatureError.reasons.notFound);
        }
        if (!block) {
            throw new InvalidBlockError({ block }, InvalidBlockError.reasons.notFound,
                constants.layer.secureBlocktree);
        }
        // validate the provided signature and the parent value.
        const parent = await context.validateParentBlock({ parent: block, type });
        const signature = await context.validateSignature({ sig, parent, prev: null });

        // create a new blockchain for the child block.
        const childBlock = await context.writeSecureBlock({
            sig: signature, parent, prev: null, type, data,
        });

        return childBlock;
    }

    /**
     * Creates a new zone, which acts as a permission container for managing keys and data.
     * @param {Buffer} sig The signature to use.
     * @param {Buffer} block The block to add a zone to.
     * @param {Object} keys A set of actions with associated keys, or null if no zone keys.
     * @param {string} name The name of the zone.
     * @returns {Promise<string>} The new block.
     */
    async function createZone({
        sig, block, keys, options,
    }) {
        const result = await createChildBlockInternal({
            sig,
            block,
            keys,
            type: constants.blockType.zone,
            data: options,
        });
        const rootBlock = await secureCache.readCache(null, constants.secureCache.rootBlock);
        if (rootBlock && Buffer.compare(block, rootBlock)) {
            await secureCache.writeCache(null, constants.secureCache.rootZone, result);
        }
        return result;
    }

    /**
     * Creates a new identity, which represents a user or system.
     * @param {Buffer} sig The signature to use.
     * @param {Buffer} block The block to add an identity to.
     * @param {Object} keys A set of actions with associated keys, or null if no zone keys.
     * @param {string} name The name of the identity.
     * @returns {Promise<string>} The new block.
     */
    async function createIdentity({
        sig, block, options,
    }) {
        return createChildBlockInternal({
            sig,
            block,
            type: constants.blockType.identity,
            data: options,
        });
    }

    /**
     * Creates a new collection, which represents a blockchain for storing data.
     * @param {Buffer} sig The signature to use.
     * @param {Buffer} block The block to add a collection to.
     * @param {Object} keys A set of actions with associated keys, or null if no zone keys.
     * @param {string} name The name of the collection.
     * @returns {Promise<string>} The new block.
     */
    async function createCollection({
        sig, block, options,
    }) {
        return createChildBlockInternal({
            sig,
            block,
            type: constants.blockType.collection,
            data: options,
        });
    }

    return {
        setKeys,
        revokeKeys,
        setOptions,
        addRecord,
        createRoot,
        createZone,
        createIdentity,
        createCollection,
    };
};
