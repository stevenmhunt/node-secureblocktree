/* eslint-disable no-await-in-loop, no-plusplus */
const constants = require('../constants');
const { SerializationError, InvalidBlockError } = require('../errors');
const { fromByte } = require('../utils/convert');

/**
 * Blocktree Layer 2 - Blocktree
 */
module.exports = function blocktreeLayerFactory({ blockchain, cache }) {
    /**
     * @private
     * Checks the block hash value.
     * @param {Buffer} block The block to check.
     * @returns {Buffer} the hash (or throws an error if invalid)
     */
    function checkBlockHash(block) {
        if (!block) {
            return constants.block.zero;
        }
        if (Buffer.byteLength(block) !== constants.size.hash) {
            throw new SerializationError({ data: block },
                SerializationError.reasons.invalidBlockHash,
                constants.layer.blocktree);
        }
        return block;
    }

    /**
     * Given a blocktree object, converts it into a blockchain object.
     * @param {Object} btBlockData The blocktree object.
     * @returns {Object} A blockchain object.
     */
    function serializeBlocktreeData({
        prev, parent, layer, data,
    }) {
        return {
            prev,
            data: Buffer.concat([
                // parent hash
                checkBlockHash(parent),
                // layer
                fromByte(layer || constants.layer.blocktree, 'layer'),
                // data
                data,
            ]),
        };
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
        if (Buffer.compare(result.parent, constants.block.zero) === 0) {
            result.parent = null;
        }
        result.layer = data[index++];
        result.data = data.slice(index);
        return result;
    }

    /**
     * Reads a block from the blocktree.
     * @param {Buffer} block The block hash to read.
     * @returns {Promise<Object>} The requested blocktree data.
     */
    async function readBlock(block, options) {
        return deserializeBlocktreeData(
            await blockchain.readBlock(checkBlockHash(block), options),
        );
    }

    /**
     * Deserializes the given raw block data.
     * @param {*} buf The raw block data to deserialize.
     * @returns {Promise<Object>} The deserialized block data.
     */
    async function readBlockBytes(buf) {
        return deserializeBlocktreeData(await blockchain.readBlockBytes(buf));
    }

    /**
     * Reads the raw bytes from a block.
     * @param {*} block The block hash to read.
     * @returns {Promise<Buffer>} The requested bytes.
     */
    async function readRawBlock(block) {
        return blockchain.readRawBlock(checkBlockHash(block));
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
     * Writes a block to the blocktree.
     * @param {Object} btBlockData The blocktree object.
     * @returns {Promise<string>} The hash of the newly written block.
     */
    async function writeBlock(btBlockData, options = {}) {
        if (options.validate !== false && btBlockData.parent) {
            if ((await listBlocks(btBlockData.parent)).length === 0) {
                throw new InvalidBlockError({ block: btBlockData.parent },
                    InvalidBlockError.reasons.invalidParentBlock,
                    constants.layer.blocktree);
            }
        }
        const result = await blockchain.writeBlock(serializeBlocktreeData(btBlockData), options);
        if (btBlockData.parent) {
            await cache.pushCache(btBlockData.parent, constants.cache.childBlocks, result);
        }
        return result;
    }

    /**
     * Retrieves a count of the number of blocks in the system.
     * @returns {Promise<BigInt>} The number of blocks in the system.
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
     * @param {Buffer} block The block to start from.
     * @returns {Promise<Array>} Block data for the block and all parents.
     */
    async function performParentScan(block) {
        const result = [];
        let next = checkBlockHash(block);
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
     * @param {Buffer} block The block to start from.
     * @returns {Promise<Array>} Block data for all child root blocks.
     */
    async function performChildScan(block) {
        const blockHash = checkBlockHash(block);
        const cached = await cache.readCache(blockHash, constants.cache.childBlocks);
        if (cached && Array.isArray(cached)) {
            return Promise.all(cached.map(readBlock));
        }
        const result = await findAllInBlocks((b) => b.prev === null
         && b.parent && blockHash && Buffer.compare(b.parent, blockHash) === 0);
        await cache.writeCache(blockHash, constants.cache.childBlocks,
            result.map((i) => i.hash));
        return result;
    }

    /**
     * Given a block, scans the blocks in the system to find the next one.
     * @param {Buffer} block The block to start from.
     * @returns {Promise<string>} The hash of the next block, or null.
     */
    async function getNextBlock(block) {
        return blockchain.getNextBlock(checkBlockHash(block));
    }

    /**
     * Given a block, locates the root block of the blockchain.
     * If block is null, retries the root of the blocktree.
     * @param {Buffer} block The block to start from.
     * @returns {Promise<string>} The root block of the blockchain or blocktree, or null.
     */
    async function getRootBlock(block) {
        return blockchain.getRootBlock(checkBlockHash(block));
    }

    /**
     * Given a block, locates the parent of this block on the blocktree.
     * @param {Buffer} block The block to start from.
     * @returns {Promise<string>} The parent block of the specified block, or null.
     */
    async function getParentBlock(block) {
        const blockData = await readBlock(checkBlockHash(block));
        if (!blockData) {
            throw new InvalidBlockError({ block }, InvalidBlockError.reasons.notFound,
                constants.layer.blocktree);
        }
        return blockData.parent;
    }

    /**
     * Given a block, finds the head block in the blockchain.
     * @param {Buffer} block The block to start with.
     * @returns {Promise<string>} The head block of the blockchain.
     */
    async function getHeadBlock(block) {
        return blockchain.getHeadBlock(checkBlockHash(block));
    }

    /**
     * Given a block, validates all previous blocks in the blocktree.
     * @param {Buffer} block
     * @returns {Promise<Object>} A validation report.
     */
    async function validateBlocktree(block, options) {
        let next = checkBlockHash(block);
        let blockCount = 0;
        do {
            const validation = await blockchain.validateBlockchain(next, options);
            if (!validation.isValid) {
                return {
                    ...validation,
                    ...{ blockCount: validation.blockCount + blockCount },
                };
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
                await env.println(await readBlock(block));
            });
            return true;
        }
        case 'parent-scan': {
            await env.resolveBlock(parameters[0], listBlocks, async (block) => {
                await env.println(await performParentScan(block));
            });
            return true;
        }
        case 'child-scan': {
            await env.resolveBlock(parameters[0], listBlocks, async (block) => {
                await env.println(await performChildScan(block));
            });
            return true;
        }
        case 'get-parent-block': {
            await env.resolveBlock(parameters[0], listBlocks, async (block) => {
                await env.println(await getParentBlock(block));
            });
            return true;
        }
        case 'validate-blocktree': {
            await env.resolveBlock(parameters[0], listBlocks, async (block) => {
                await env.println(await validateBlocktree(block));
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
        readBlockBytes,
        readRawBlock,
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
