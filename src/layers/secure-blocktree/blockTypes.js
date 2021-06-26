const constants = require('../../constants');
const { deserializeKeyFromSignature } = require('./serialization');
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
     * Writes a new key to the specified blockchain.
     * @param {Buffer} sig The signature to use.
     * @param {Buffer} block The block to add a key to.
     * @param {Buffer} key The key to add.
     * @param {string} action The action to assign to the key.
     * @param {BigInt} tsInit The initializion timestamp for the key.
     * @param {BigInt} tsExp The expiration timestamp for the key.
     * @returns {Promise<string>} The new block.
     */
    async function addKey({
        sig, block, key, action, tsInit, tsExp,
    }) {
        const type = constants.blockType.key;
        const init = tsInit !== undefined ? tsInit : constants.timestamp.zero;
        const exp = tsExp !== undefined ? tsExp : constants.timestamp.max;
        const prev = block ? await blocktree.getHeadBlock(block) : block;
        let parent = null;
        let signature = null;
        let parentKey = null;

        // if attempting to initialize the root...
        if (sig === null && prev === null && parentKey === null) {
            // there can only be one root key in the system.
            if (await blocktree.countBlocks() > 0n) {
                throw new InvalidRootError();
            }
        } else {
            // validate the provided signature, the key, and the parent value.
            parent = await context.validateParentBlock({ prev, type });
            signature = await context.validateSignature({ sig, prev, parent });
            parentKey = deserializeKeyFromSignature(signature);
            await context.validateParentKey({ block: prev, key: parentKey });
        }

        return context.writeSecureBlock({
            sig: signature,
            parent,
            prev,
            type,
            data: {
                parentKey, key, action, tsInit: init, tsExp: exp,
            },
        });
    }

    /**
     * Revokes a key from the specified blockchain.
     * @param {Buffer} sig The signature to use.
     * @param {Buffer} block The block to revoke a key from.
     * @param {Buffer} key The key to revoke.
     * @param {string} action The action to revoke on.
     * @param {BigInt} tsInit The initializion timestamp for the key.
     * @param {BigInt} tsExp The expiration timestamp for the key.
     * @returns {Promise<string>} The new block.
     */
    async function revokeKey({
        sig, block, key, action,
    }) {
        return addKey({
            sig,
            block,
            key,
            action,
            tsInit: constants.timestamp.zero,
            tsExp: constants.timestamp.zero,
        });
    }

    /**
     * Specifies configuration options for the specified blockchain.
     * @param {Buffer} sig The signature to use.
     * @param {Buffer} block The block to add options to.
     * @param {Object} options The key/value pairs to set.
     * @returns {Promise<string>} The new block.
     */
    async function addOptions({
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
     * Adds a secret to the specified blockchain.
     * @param {Buffer} sig The signature to use.
     * @param {Buffer} block The block to add a record to.
     * @param {Buffer} key the public key used to encrypt the data.
     * @param {Buffer} ref a reference value for looking up the secret.
     * @param {Buffer} secret The secret to store.
     * @param {BigInt} tsInit The initializion timestamp for the secret.
     * @param {BigInt} tsExp The expiration timestamp for the secret.
     * @returns {Promise<string>} The new block.
     */
    async function addSecret({
        sig, block, key, ref, secret, tsInit, tsExp,
    }) {
        const type = constants.blockType.secret;
        const init = tsInit !== undefined ? tsInit : constants.timestamp.zero;
        const exp = tsExp !== undefined ? tsExp : constants.timestamp.max;
        // validate the provided signature and the parent value.
        const prev = block ? await blocktree.getHeadBlock(block) : block;
        const parent = await context.validateParentBlock({ prev, type });
        const signature = await context.validateSignature({
            sig, prev, parent, requireParent: false,
        });

        return context.writeSecureBlock({
            sig: signature,
            parent,
            prev,
            type,
            data: {
                key, ref, secret, tsInit: init, tsExp: exp,
            },
        });
    }

    /**
     * Adds a record to a collection.
     * @param {Buffer} sig The signature to use.
     * @param {Buffer} block The block to add a record to.
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
     * @param {Buffer} key The root key.
     * @returns {Promise<string>} The root block.
     */
    async function createRoot({
        key,
    }) {
        // there can only be one root key in the system.
        if (await blocktree.countBlocks() > 0n) {
            throw new InvalidRootError();
        }

        const type = constants.blockType.root;
        const tsInit = constants.timestamp.zero;
        const tsExp = constants.timestamp.max;
        const parent = null;
        const prev = null;
        const signature = null;
        const parentKey = null;

        const result = await context.writeSecureBlock({
            sig: signature,
            parent,
            prev,
            type,
            data: {
                parentKey, key, action: constants.action.any, tsInit, tsExp,
            },
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

        if (data && !data.isEncrypted && data.name) {
            await secureCache.writeCache(childBlock, constants.secureCache.name, data.name);
        }

        return childBlock;
    }

    /**
     * Creates a new zone, which acts as a permission container for managing keys and data.
     * @param {Buffer} sig The signature to use.
     * @param {Buffer} block The block to add a zone to.
     * @param {string} name The name of the zone.
     * @returns {Promise<string>} The new block.
     */
    async function createZone({
        sig, block, options,
    }) {
        const result = await createChildBlockInternal({
            sig,
            block,
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
        addKey,
        revokeKey,
        addOptions,
        addSecret,
        addRecord,
        createRoot,
        createZone,
        createIdentity,
        createCollection,
    };
};
