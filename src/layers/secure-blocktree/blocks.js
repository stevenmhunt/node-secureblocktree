const constants = require('../../constants');
const { InvalidRootError, InvalidBlockError } = require('../../errors');

/**
 * Secure Blocktree Blocks API.
 */
module.exports = function secureBlocktreeBlocksFactory({
    blocktree, serialization,
}) {
    /**
     * Reads a secure block from the blocktree.
     * @param {Buffer} block The block hash to read.
     * @returns {Promise<Object>} The requested secure data.
     */
    async function readSecureBlock(block, options) {
        return serialization.deserializeSecureBlock(
            await blocktree.readBlock(block, options),
        );
    }

    /**
     * Writes a secure block to the blocktree.
     * @param {Object} secureData The secure object.
     * @returns {Promise<string>} The hash of the newly written block.
     */
    async function writeSecureBlock(secureData) {
        // there can only be one root key in the system.
        if (!secureData.parent) {
            if (await blocktree.countBlocks() > 0) {
                throw new InvalidRootError();
            }
        }
        return blocktree.writeBlock(serialization.serializeSecureBlock(secureData));
    }

    /**
     * Deserializes the given raw block data.
     * @param {*} buf The raw block data to deserialize.
     * @returns {Promise<Object>} The deserialized block data.
     */
    async function readBlockBytes(buf) {
        return serialization.deserializeSecureBlock(await blocktree.readBlockBytes(buf));
    }

    /**
     * Reads the raw bytes from a block.
     * @param {*} block The block hash to read.
     * @returns {Promise<Buffer>} The requested bytes.
     */
    async function readRawBlock(block) {
        return blocktree.readRawBlock(block);
    }

    /**
     * Given a block, scans the blocks in the system to find the next one.
     * @param {Buffer} block The block to start from.
     * @returns {Promise<string>} The hash of the next block, or null.
     */
    async function getNextBlock(block) {
        return blocktree.getNextBlock(block);
    }

    /**
     * Given a block, locates the root block of the blockchain.
     * If block is null, retries the root of the blocktree.
     * @param {Buffer} block The block to start from.
     * @returns {Promise<string>} The root block of the blockchain or blocktree, or null.
     */
    async function getRootBlock(block) {
        return blocktree.getRootBlock(block);
    }

    /**
     * Given a block, locates the parent of this block on the blocktree.
     * @param {Buffer} block The block to start from.
     * @returns {Promise<string>} The parent block of the specified block, or null.
     */
    async function getParentBlock(block) {
        return blocktree.getParentBlock(block);
    }

    /**
     * Given a block, finds the head block in the blockchain.
     * @param {Buffer} block The block to start with.
     * @returns {Promise<string>} The head block of the blockchain.
     */
    async function getHeadBlock(block) {
        return blocktree.getHeadBlock(block);
    }

    /**
     * Given a block, verifies that the block has a parent.
     * @param {Buffer} block The block to check
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
            throw new InvalidBlockError({ block: selected }, InvalidBlockError.reasons.notFound,
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

    return {
        readSecureBlock,
        writeSecureBlock,
        readBlockBytes,
        readRawBlock,
        getNextBlock,
        getRootBlock,
        getParentBlock,
        getHeadBlock,
        validateParentBlock,
    };
};
