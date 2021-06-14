/* eslint-disable no-await-in-loop */
const constants = require('../constants');

/**
 * Blocktree Layer 2 - Blocktree
 */
module.exports = function blocktreeLayerFactory({ blockchain }) {
    /**
     * Given a blocktree object, converts it into a blockchain object.
     * @param {Object} btBlockData The blocktree object.
     * @returns {Object} A blockchain object.
     */
    function serializeBlocktreeData(btBlockData) {
        const { prev } = btBlockData;
        let parent = btBlockData.parent || Buffer.alloc(constants.size.hash);
        if (!Buffer.isBuffer(parent)) {
            parent = Buffer.from(parent, constants.format.hash);
            if (Buffer.byteLength(parent) !== constants.size.hash) {
                throw new Error('Unexpected byte length for SHA-256 hash.');
            }
        }
        const data = Buffer.concat([
            // parent hash
            parent,
            // data
            btBlockData.data,
        ]);
        return { prev, data };
    }

    /**
     * Given a blockchain object, deserializes it into a blocktree object.
     * @param {Buffer} buf The buffer to deserialize.
     * @returns {Object} A blockchain object.
     */
    function deserializeBlocktreeData(bcBlockData) {
        if (!bcBlockData) {
            return null;
        }
        const {
            timestamp, prev, nonce, hash, data,
        } = bcBlockData;
        let index = 0;
        const result = {
            timestamp, prev, nonce, hash,
        };
        result.parent = data.slice(index, index + constants.size.hash);
        index += constants.size.hash;
        // handle the case where parent is null.
        if (Buffer.compare(result.parent, Buffer.alloc(constants.size.hash)) === 0) {
            result.parent = null;
        } else {
            result.parent = result.parent.toString(constants.format.hash);
        }
        result.data = data.slice(index);
        return result;
    }

    /**
     * Reads a block from the blocktree.
     * @param {string} block The block hash to read.
     * @returns {Promise<Object>} The requested blocktree data.
     */
    async function readBlock(block) {
        return deserializeBlocktreeData(await blockchain.readBlock(block));
    }

    /**
     * Writes a block to the blocktree.
     * @param {Object} btBlockData The blocktree object.
     * @returns {Promise<string>} The hash of the newly written block.
     */
    async function writeBlock(btBlockData, options = {}) {
        return blockchain.writeBlock(serializeBlocktreeData(btBlockData), options);
    }

    /**
     * Retrieves the specified list of blocks.
     * @param {string} partial The "starts with" search to perform, or null to retrieve all blocks.
     * @returns {Promise<Array>} The list of requested blocks.
     */
    async function listBlocks(partial = null) {
        return blockchain.listBlocks(partial);
    }

    /**
     * Retrieves a count of the number of blocks in the system.
     * @returns {Promise<number>} The number of blocks in the system.
     */
    async function countBlocks() {
        return blockchain.countBlocks();
    }

    /**
     * Scans through all blocks in the system until a block matching the predicate is found.
     * @param {Function} fn The predicate function.
     * @returns {Promise<Object>} The matching block, or null.
     */
    async function findInBlocks(fn) {
        const result = await blockchain.findInBlocks((data) => fn(deserializeBlocktreeData(data)));
        if (result) {
            return deserializeBlocktreeData(result);
        }
        return null;
    }

    /**
     * Scans through all blocks in the system and returns all matching blocks.
     * @param {Function} fn The predicate function.
     * @returns {Promise<Array>} The matching blocks.
     */
    async function findAllInBlocks(fn) {
        return (await blockchain.mapInBlocks((data) => deserializeBlocktreeData(data)))
            .filter(fn);
    }

    /**
     * Scans through all blocks in the system and runs the map() function.
     * @param {Function} fn The selector function.
     * @returns {Promise<Array>} The result of the map() call.
     */
    async function mapInBlocks(fn) {
        return blockchain.mapInBlocks((data) => fn(deserializeBlocktreeData(data)));
    }

    /**
     * Given a block, returns its data as well as data for all parent blocks.
     * @param {string} block The block to start from.
     * @returns {Promise<Array>} Block data for the block and all parents.
     */
    async function performParentScan(block) {
        const result = [];
        let next = block;
        do {
            const nextBlock = await readBlock(next);
            if (next && !nextBlock) {
                return null;
            }
            result.push(nextBlock);
            next = (nextBlock || {}).parent;
        }
        while (next != null);
        return result;
    }

    /**
     * Given a block, locates all child root blocks.
     * @param {*} block The block to start from.
     * @returns {Promise<Array>} Block data for all child root blocks.
     */
    async function performChildScan(block) {
        return findAllInBlocks((b) => b.prev === null && b.parent === block);
    }

    /**
     * Given a block, scans the blocks in the system to find the next one.
     * @param {string} block The block to start from.
     * @returns {Promise<string>} The hash of the next block, or null.
     */
    async function getNextBlock(block) {
        return blockchain.getNextBlock(block);
    }

    /**
     * Given a block, locates the root block of the blockchain.
     * If block is null, retries the root of the blocktree.
     * @param {string} block The block to start from.
     * @returns {Promise<string>} The root block of the blockchain or blocktree, or null.
     */
    async function getRootBlock(block) {
        return blockchain.getRootBlock(block);
    }

    /**
     * Given a block, locates the parent of this block on the blocktree.
     * @param {string} block The block to start from.
     * @returns {Promise<string>} The parent block of the specified block, or null.
     */
    async function getParentBlock(block) {
        const blockData = await readBlock(block);
        if (!blockData) {
            throw new Error(`Invalid block ${block}`);
        }
        return blockData.parent;
    }

    /**
     * Given a block, finds the head block in the blockchain.
     * @param {string} block The block to start with.
     * @returns {Promise<string>} The head block of the blockchain.
     */
    async function getHeadBlock(block) {
        return blockchain.getHeadBlock(block);
    }

    /**
     * Given a block, validates all previous blocks in the blocktree.
     * @param {string} block
     * @returns {Promise<Object>} A validation report.
     */
    async function validateBlocktree(block) {
        let next = block;
        let blockCount = 0;
        do {
            const validation = await blockchain.validateBlockchain(next);
            if (!validation.isValid) {
                return validation;
            }
            blockCount += validation.blockCount;
            const nextBlock = await readBlock(next);
            if (next && !nextBlock) {
                return {
                    isValid: false,
                    reason: constants.validation.missingParentBlock,
                    block: next,
                    blockCount,
                };
            }
            next = (nextBlock || {}).parent;
        }
        while (next != null);
        return { isValid: true, blockCount };
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
        case 'read-tree-block': {
            await env.resolveBlock(parameters[0], listBlocks, async (block) => {
                console.log(await readBlock(block));
            });
            return true;
        }
        case 'parent-scan': {
            await env.resolveBlock(parameters[0], listBlocks, async (block) => {
                console.log(await performParentScan(block));
            });
            return true;
        }
        case 'child-scan': {
            await env.resolveBlock(parameters[0], listBlocks, async (block) => {
                console.log(await performChildScan(block));
            });
            return true;
        }
        case 'get-parent-block': {
            await env.resolveBlock(parameters[0], listBlocks, async (block) => {
                console.log(await getParentBlock(block));
            });
            return true;
        }
        case 'validate-blocktree': {
            await env.resolveBlock(parameters[0], listBlocks, async (block) => {
                console.log(await validateBlocktree(block));
            });
            return true;
        }
        default:
            return false;
        }
    }

    return {
        readBlock,
        writeBlock,
        listBlocks,
        countBlocks,
        findInBlocks,
        mapInBlocks,
        performParentScan,
        performChildScan,
        getHeadBlock,
        getRootBlock,
        getParentBlock,
        getNextBlock,
        validateBlocktree,
        serializeBlocktreeData,
        deserializeBlocktreeData,
        handleCommand,
    };
};
