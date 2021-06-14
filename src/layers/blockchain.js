/* eslint-disable no-await-in-loop */
const constants = require('../constants');
const convert = require('../convert');

/**
 * Blocktree Level 1 - Blockchain
 */
module.exports = function blockchainLayerFactory({ system }) {
    /**
     * Given a blockchain object, converts it into a Buffer.
     * @param {Object} bcBlockData The blockchain object.
     * @returns {Buffer} The binary representation of the block.
     */
    function serializeBlockchainData(bcBlockData) {
        let prev = bcBlockData.prev || Buffer.alloc(constants.size.hash);
        if (!Buffer.isBuffer(prev)) {
            prev = Buffer.from(prev, constants.format.hash);
            if (Buffer.byteLength(prev) !== constants.size.hash) {
                throw new Error('Unexpected byte length for SHA-256 hash.');
            }
        }
        const nonce = system.generateNonce();
        const timestamp = system.generateTimestamp();
        const buf = Buffer.concat([
            // previous hash
            prev,
            // uniqueness
            convert.fromInt32(nonce),
            // timestamp
            convert.fromInt64(timestamp),
            // data
            bcBlockData.data,
        ]);
        return buf;
    }

    /**
     * Given a buffer, deserializes it into a blockchain object.
     * @param {Buffer} buf The buffer to deserialize.
     * @returns {Object} A blockchain object.
     */
    function deserializeBlockchainData(buf) {
        if (!buf) {
            return null;
        }
        let index = 0;
        const result = {};
        result.prev = buf.slice(index, index + constants.size.hash);
        index += constants.size.hash;
        // handle the case where prev is null.
        if (Buffer.compare(result.prev, Buffer.alloc(constants.size.hash)) === 0) {
            result.prev = null;
        } else {
            result.prev = result.prev.toString(constants.format.hash);
        }
        result.nonce = convert.toInt32(buf, index);
        index += constants.size.int32;
        result.timestamp = convert.toInt64(buf, index);
        index += constants.size.int64;
        result.data = buf.slice(index);
        result.hash = system.generateHash(buf);
        return result;
    }

    /**
     * Reads a block from storage.
     * @param {string} block The block hash to read.
     * @returns {Promise<Object>} The requested blockchain data.
     */
    async function readBlock(block) {
        return deserializeBlockchainData(await system.readStorage(block));
    }

    /**
     * Retrieves the specified list of blocks.
     * @param {string} partial The "starts with" search to perform, or null to retrieve all blocks.
     * @returns {Promise<Array>} The list of requested blocks.
     */
    async function listBlocks(partial = null) {
        return system.readKeys(partial);
    }

    /**
     * Given a block, locates the root block of the blockchain.
     * @param {string} block The block to start from.
     * @returns {Promise<string>} The root block of the blockchain.
     */
    async function getRootBlock(block) {
        let result = block;
        let next = block;
        do {
            const nextBlock = await readBlock(next);
            next = (nextBlock || {}).prev;
            result = next || result;
            if (!nextBlock) {
                result = null;
            }
        }
        while (next != null);
        return result;
    }

    /**
     * @private
     * Handles caching of the root block.
     * @param {string} block The block to update caches for.
     * @param {Object} bcBlockData The blockchain object.
     * @returns {Promis<string>} The root block of the blockchain.
     */
    async function cacheRootBlock(block, bcBlockData) {
        if (!bcBlockData.prev) {
            // if this block IS the root node, then cache itself.
            await system.writeCache(block, constants.cache.rootBlock, block);
            return block;
        }

        // check if the previous node in the blockchain knows who the root is.
        const cached = await system.readCache(bcBlockData.prev, constants.cache.rootBlock);
        if (cached) {
            await system.writeCache(block, constants.cache.rootBlock, cached);
            return cached;
        }

        // otherwise, walk across the blocks to the beginning of the blockchain.
        const root = await getRootBlock(block);
        await system.writeCache(block, constants.cache.rootBlock, root);
        return root;
    }

    /**
     * Writes a block to storage.
     * @param {Object} bcBlockData The blockchain object.
     * @returns {Promise<string>} The hash of the newly written block.
     */
    async function writeBlock(bcBlockData, options = {}) {
        if (options.validate !== false && bcBlockData.prev !== null) {
            const prev = await readBlock(bcBlockData.prev);
            if (!prev) {
                throw new Error(`Invalid block ${bcBlockData.prev}`);
            }
        }
        const block = await system.writeStorage(serializeBlockchainData(bcBlockData));
        if (options.cacheRoot !== false) {
            const root = await cacheRootBlock(block, bcBlockData);
            await system.writeCache(root, constants.cache.headBlock, block);
        }
        return block;
    }

    /**
     * Scans through all blocks in the system until a block matching the predicate is found.
     * @param {Function} fn The predicate function.
     * @returns {Promise<Object>} The matching block, or null.
     */
    async function findInBlocks(fn) {
        const result = await system.findInStorage((data) => fn(deserializeBlockchainData(data)));
        if (result) {
            return deserializeBlockchainData(result);
        }
        return null;
    }

    /**
     * Scans through all blocks in the system and runs the map() function.
     * @param {Function} fn The selector function.
     * @returns {Promise<Array>} The result of the map() call.
     */
    async function mapInBlocks(fn) {
        return system.mapInStorage((data) => fn(deserializeBlockchainData(data)));
    }

    /**
     * Given a block, scans the blocks in the system to find the next one.
     * @param {string} block The block to start from.
     * @returns {Promise<string>} The hash of the next block, or null.
     */
    async function getNextBlock(block) {
        const cached = await system.readCache(block, constants.cache.next);
        if (cached) {
            return cached;
        }
        const value = await system.findInStorage(
            (buf) => deserializeBlockchainData(buf).prev === block,
        );
        if (value) {
            const result = system.generateHash(value);
            await system.writeCache(block, constants.cache.next, result);
            return result;
        }
        return null;
    }

    /**
     * Given a block, finds the head block in the blockchain.
     * @param {string} block The block to start with.
     * @returns {Promise<string>} The head block of the blockchain.
     */
    async function getHeadBlock(block) {
        const bc = await getRootBlock(block);
        if (!bc) {
            return null;
        }
        const cached = await system.readCache(bc, constants.cache.headBlock);
        if (cached) {
            return cached;
        }
        let result = bc;
        let next = null;
        let count = 0;
        do {
            next = await getNextBlock(result);
            result = next || result;
            count += 1;
        }
        while (next != null);
        if (count > 1) {
            await system.writeCache(bc, constants.cache.headBlock, result);
            return result;
        }
        return null;
    }

    /**
     * Given a block, validates all previous blocks in the blockchain.
     * @param {string} block
     */
    async function validateBlockchain(block) {
        let next = block;
        let blockCount = 0;
        do {
            const nextBlock = await readBlock(next);
            if (!nextBlock) {
                return {
                    isValid: false,
                    reason: constants.validation.missingBlock,
                    block: next,
                    blockCount,
                };
            }
            blockCount += 1;
            next = (nextBlock || {}).prev;
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
        case 'read-block':
        {
            await env.resolveBlock(parameters[0], listBlocks, async (block) => {
                console.log(await readBlock(block));
            });
            return true;
        }
        case 'get-head-block': {
            await env.resolveBlock(parameters[0], listBlocks, async (block) => {
                console.log(await getHeadBlock(block));
            });
            return true;
        }
        case 'get-root-block': {
            await env.resolveBlock(parameters[0], listBlocks, async (block) => {
                console.log(await getRootBlock(block));
            });
            return true;
        }
        case 'get-next-block': {
            await env.resolveBlock(parameters[0], listBlocks, async (block) => {
                console.log(await getNextBlock(block));
            });
            return true;
        }
        case 'list-blocks': {
            (await listBlocks()).map((i) => console.log(i));
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
        findInBlocks,
        mapInBlocks,
        getHeadBlock,
        getRootBlock,
        getNextBlock,
        validateBlockchain,
        serializeBlockchainData,
        deserializeBlockchainData,
        handleCommand,
    };
};
