// Blocktree API Level 2 - Blocktree

const constants = require('../constants');
const convert = require('../convert');

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
            btBlockData.data
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
        const { timestamp, prev, nonce, hash, data } = bcBlockData;
        let index = 0;
        const result = { timestamp, prev, nonce, hash };
        result.parent = data.slice(index, index + constants.size.hash);
        index += constants.size.hash;
        // handle the case where parent is null.
        if (Buffer.compare(result.parent, Buffer.alloc(constants.size.hash)) === 0) {
            result.parent = null;
        }
        else {
            result.parent = result.parent.toString(constants.format.hash);
        }
        result.data = data.slice(index);
        return result;
    }

    /**
     * Reads a block from the blockchain.
     * @param {string} block The block hash to read.
     * @returns {Promise<Object>} The requested blocktree data.
     */
    async function readBlock(block) {
        return deserializeBlocktreeData(await blockchain.readBlock(block));
    }

    /**
     * Writes a block to the blockchain.
     * @param {Object} btBlockData The blocktree object.
     * @returns {Promise<string>} The hash of the newly written block.
     */
    async function writeBlock(btBlockData, options = {}) {
        return blockchain.writeBlock(serializeBlocktreeData(btBlockData), options);
    }

    async function listBlocks(partial = null) {
        return blockchain.listBlocks(partial);
    }

    /**
     * Scans through all blocks in the system until a block matching the predicate is found.
     * @param {*} fn The predicate function.
     * @returns {Promise<Object>} The matching block, or null.
     */
    async function findInBlocks(fn) {
        const result = await blockchain.findInBlocks(data => fn(deserializeBlocktreeData(data)));
        if (result) {
            return deserializeBlocktreeData(result);
        }
        return null;
    }

    /**
     * Scans through all blocks in the system and runs the map() function.
     * @param {*} fn The selector function.
     * @returns {Promise<Array>} The result of the map() call.
     */
    async function mapInBlocks(fn) {
        return await blockchain.mapInBlocks(data => fn(deserializeBlocktreeData(data)));
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
     * @param {string} block The block to start from.
     * @returns {Promise<string>} The root block of the blockchain.
     */
    async function getRootBlock(block) {
        return blockchain.getRootBlock(block);
    }

    async function getParentBlock(block) {
        const blockData = await readBlock(block);
        if (!blockData) {
            throw new Error(`Invalid block ${block}`);
        }
        return blockData.parent;
    }

    async function getParentRootBlock(block) {
        let result = block;
        let next = block;
        do {
            const nextBlock = await readBlock(next);
            next = (nextBlock || {}).parent
            result = next || result
            if (!nextBlock) {
                result = null;
            }
        }
        while (next != null);
        return result;
    }

    /**
     * Given a block, finds the head block in the blockchain.
     * @param {string} block The block to start with.
     * @returns {Promise<string>} The head block of the blockchain.
     */
    async function getHeadBlock(block) {
        return blockchain.getHeadBlock(block);
    }

    async function copyBlock(block) {
        return blockchain.copyBlock(block);
    }

    /**
     * Given a block, validates all previous blocks in the blockchain.
     * @param {*} block 
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
                    blockCount
                };
            }
            next = (nextBlock || {}).parent
            if (next) {
                blockCount += 1;
            }
        }
        while (next != null);
        return { isValid: true, blockCount };
    }

    async function handleCommand(env, command, parameters) {
        switch (command) {
            case 'read-tree-block': {
                await env.resolveBlock(parameters[0], listBlocks, async function (block) {
                    console.log(await readBlock(block));
                });
                return true;
            }
        }
        return false;
    }

    return {
        readBlock,
        writeBlock,
        listBlocks,
        findInBlocks,
        mapInBlocks,
        getHeadBlock,
        getRootBlock,
        getParentBlock,
        getParentRootBlock,
        getNextBlock,
        copyBlock,
        validateBlocktree,
        serializeBlocktreeData,
        deserializeBlocktreeData,
        handleCommand
    };
};
