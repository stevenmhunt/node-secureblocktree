const constants = require('../../constants');
const {
    InvalidSignatureError, InvalidBlockError, InvalidRootError,
} = require('../../errors');

module.exports = function secureBlocktreeBlockTypesFactory({
    context, blocktree,
}) {
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
        sig, block, parentKey, keys, certificates, tsInit, tsExp,
    }) {
        const type = constants.blockType.keys;
        const init = tsInit !== undefined ? tsInit : constants.timestamp.zero;
        const exp = tsExp !== undefined ? tsExp : constants.timestamp.max;
        const prev = block ? await blocktree.getHeadBlock(block) : block;
        let parent = null;
        let signature = null;

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
            await context.verifySignedBlock({
                key: parentKey, sig: signature, parent, prev,
            });
            await context.validateKeys({ block: prev, keys, parentKey });
        }

        const data = {
            parentKey, keys, certificates, tsInit: init, tsExp: exp,
        };
        return context.writeSecureBlock({
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
        const parent = await context.validateParentBlock({ prev, type });
        const signature = await context.validateSignature({ sig, prev, parent });

        return context.writeSecureBlock({
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
        const parent = await context.validateParentBlock({ parent: block, type });

        // validate the provided signature.
        const signature = await context.validateSignature({ sig, parent, prev: null });

        // create a new blockchain for the child block.
        const childBlock = await context.writeSecureBlock({
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

    return {
        setKeys,
        revokeKeys,
        setOptions,
        createZone,
        createIdentity,
        createLedger,
    };
};
