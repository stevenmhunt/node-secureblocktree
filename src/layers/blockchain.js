/* eslint-disable no-await-in-loop */
const EventEmitter = require('events');
const constants = require('../constants');
const { SerializationError, InvalidBlockError } = require('../errors');
const utils = require('../utils');

/**
 * Blocktree Layer 1 - Blockchain
 */
module.exports = function blockchainLayerFactory({ system }) {
    /**
     * @private
     * Event capture object.
     */
    let emitter = null;

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
                constants.layer.blockchain);
        }
        return block;
    }

    /**
     * @private
     * Given a blockchain object, converts it into a Buffer.
     * @param {Object} bcBlockData The blockchain object.
     * @returns {Buffer} The binary representation of the block.
     */
    function serializeBlockchainData(bcBlockData, timestamp, seq) {
        return Buffer.concat([
            // sequence
            utils.fromInt64(seq),
            // previous hash
            checkBlockHash(bcBlockData.prev),
            // uniqueness
            utils.fromInt64(utils.generateNonce()),
            // timestamp
            utils.fromInt64(timestamp),
            // data
            bcBlockData.data,
        ]);
    }

    /**
     * @private
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
        result.seq = utils.toInt64(buf, index);
        index += constants.size.int64;
        result.prev = buf.slice(index, index + constants.size.hash);
        if (Buffer.compare(result.prev, constants.block.zero) === 0) {
            result.prev = null;
        }
        index += constants.size.hash;
        result.nonce = utils.toInt64(buf, index);
        index += constants.size.int64;
        result.timestamp = utils.toInt64(buf, index);
        index += constants.size.int64;
        result.data = buf.slice(index);
        result.hash = utils.generateHash(buf);
        return result;
    }

    /**
     * Reads a block from storage.
     * @param {Buffer} block The block hash to read.
     * @returns {Promise<Object>} The requested blockchain data.
     */
    async function readBlock(block) {
        return utils.withEvent(emitter, 'read-block', {
            block,
        }, async () => deserializeBlockchainData(
            await system.readStorage(checkBlockHash(block)),
        ));
    }

    /**
     * Deserializes the given raw block data.
     * @param {*} buf The raw block data to deserialize.
     * @returns {Promise<Object>} The deserialized block data.
     */
    async function readBlockBytes(buf) {
        return deserializeBlockchainData(buf);
    }

    /**
     * Reads the raw bytes from a block.
     * @param {*} block The block hash to read.
     * @returns {Promise<Buffer>} The requested bytes.
     */
    async function readRawBlock(block) {
        return system.readStorage(checkBlockHash(block));
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
     * @param {Buffer} block The block to start from.
     * @returns {Promise<string>} The root block of the blockchain.
     */
    async function getRootBlock(block) {
        let result = checkBlockHash(block);
        let next = result;
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
     * Given a block, scans the blocks in the system to find the next one.
     * @param {Buffer} block The block to start from.
     * @returns {Promise<string>} The hash of the next block, or null.
     */
    async function getNextBlock(block) {
        const blockHash = checkBlockHash(block);
        // 1) try to locate the value in cache.
        const cached = await system.readCache(blockHash, constants.cache.next);
        if (cached) {
            if (cached === 'null') {
                return null;
            }
            return cached;
        }

        // 2) otherwise, walk through all the blocks to find the next one.
        const value = await system.findInStorage(
            (buf) => {
                const prevData = deserializeBlockchainData(buf).prev;
                return (!blockHash && !prevData)
                    || (blockHash && prevData && Buffer.compare(prevData, blockHash) === 0);
            },
        );

        // 3) if found, cache it for next time.
        if (value) {
            const result = utils.generateHash(value);
            await system.writeCache(blockHash, constants.cache.next, result);
            return result;
        }
        return null;
    }

    /**
     * @private
     * Handles caching of the root block.
     * @param {Buffer} block The block to update caches for.
     * @param {Object} bcBlockData The blockchain object.
     * @returns {Promis<string>} The root block of the blockchain.
     */
    async function cacheRootBlock(block, bcBlockData) {
        const blockHash = checkBlockHash(block);
        // 1) if this block IS the root node, then cache itself.
        if (!bcBlockData.prev) {
            await system.writeCache(blockHash, constants.cache.rootBlock, blockHash);
            return block;
        }

        // 2) check if the previous node in the blockchain knows who the root is.
        const cached = await system.readCache(checkBlockHash(bcBlockData.prev),
            constants.cache.rootBlock);
        if (cached) {
            await system.writeCache(blockHash, constants.cache.rootBlock, cached);
            return cached;
        }

        // 3) otherwise, walk across the blocks to the beginning of the blockchain.
        const root = await getRootBlock(blockHash);
        await system.writeCache(blockHash, constants.cache.rootBlock, root);
        return root;
    }

    /**
     * Writes a block to storage.
     * @param {Object} bcBlockData The blockchain object.
     * @returns {Promise<string>} The hash of the newly written block.
     */
    async function writeBlock(bcBlockData, options = {}) {
        return utils.withEvent(emitter, 'write-block', { bcBlockData, options }, async () => {
            const timestamp = system.generateTimestamp();
            const prev = bcBlockData.prev ? await readBlock(bcBlockData.prev) : null;
            const seq = (prev || { seq: 0n }).seq + 1n;
            if (options.validate !== false && bcBlockData.prev) {
                if (!prev) {
                    throw new InvalidBlockError({
                        block: bcBlockData.prev,
                    }, InvalidBlockError.reasons.isNull, constants.layer.blockchain);
                }
                if (prev.timestamp > timestamp) {
                    throw new InvalidBlockError({
                        block: bcBlockData.prev,
                        prevTimestamp: prev.timestamp,
                        timestamp,
                    }, InvalidBlockError.reasons.invalidTimestamp,
                    constants.layer.blockchain);
                }

                const next = await getNextBlock(bcBlockData.prev);
                if (next) {
                    throw new InvalidBlockError({
                        block: bcBlockData.prev,
                        next,
                    }, InvalidBlockError.reasons.nextBlockExists,
                    constants.layer.blockchain);
                }
            }
            const block = checkBlockHash(await system.writeStorage(
                serializeBlockchainData(bcBlockData, timestamp, seq),
            ));
            if (options.cacheRoot !== false) {
                const root = await cacheRootBlock(block, bcBlockData);
                await system.writeCache(root, constants.cache.headBlock, block);
            }
            if (options.cacheNext !== false && bcBlockData.prev) {
                await system.writeCache(bcBlockData.prev, constants.cache.next, block);
            }
            await system.writeCache(block, constants.cache.next, 'null');
            return block;
        });
    }

    /**
     * Retrieves a count of the number of blocks in the system.
     * @returns {Promise<number>} The number of blocks in the system.
     */
    async function countBlocks() {
        return system.countInStorage();
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
     * Scans through all blocks in the system and returns all matching blocks.
     * @param {Function} fn The predicate function.
     * @returns {Promise<Array>} The matching blocks.
     */
    async function findAllInBlocks(fn) {
        return (await system.mapInStorage((data) => deserializeBlockchainData(data)))
            .filter(fn);
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
     * Given a block, finds the head block in the blockchain.
     * @param {Buffer} block The block to start with.
     * @returns {Promise<string>} The head block of the blockchain.
     */
    async function getHeadBlock(block) {
        const bc = await getRootBlock(checkBlockHash(block));
        if (!bc) {
            return null;
        }
        const cached = await system.readCache(bc, constants.cache.headBlock);
        if (cached) {
            return cached;
        }
        // optimization: start from 'block' instead of the root.
        let result = block;
        let next = null;
        do {
            next = await getNextBlock(result);
            result = next || result;
        }
        while (next != null);
        await system.writeCache(bc, constants.cache.headBlock, result);
        return result;
    }

    /**
     * Given a block, validates all previous blocks in the blockchain.
     * @param {Buffer} block
     */
    async function validateBlockchain(block, options = {}) {
        let next = options.startFromHead
            ? await getHeadBlock(block) : checkBlockHash(block);
        let blockCount = 0;
        let blockBefore = null;
        do {
            blockCount += 1;
            const nextBlock = await readBlock(next);
            if (!nextBlock) {
                return {
                    isValid: false,
                    reason: constants.validation.missingBlock,
                    block: next,
                    blockCount,
                };
            }
            if (blockBefore) {
                if (blockBefore.timestamp < nextBlock.timestamp) {
                    return {
                        isValid: false,
                        reason: constants.validation.invalidTimestamp,
                        block: next,
                        blockCount,
                    };
                }
                if (blockBefore.seq !== nextBlock.seq + 1n) {
                    return {
                        isValid: false,
                        reason: constants.validation.invalidSequence,
                        block: next,
                        blockCount,
                    };
                }
            }

            next = (nextBlock || {}).prev;
            blockBefore = nextBlock;
        }
        while (next != null);

        if (blockBefore.seq !== 1n) {
            return {
                isValid: false,
                reason: constants.validation.invalidSequence,
                block: blockBefore.hash,
                blockCount,
            };
        }

        return { isValid: true, blockCount };
    }

    async function startEventCapture() {
        emitter = new EventEmitter();
    }

    async function stopEventCapture() {
        emitter.removeAllListeners();
        emitter = null;
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
                await env.println(await readBlock(block));
            });
            return true;
        }
        case 'get-head-block': {
            await env.resolveBlock(parameters[0], listBlocks, async (block) => {
                await env.println(await getHeadBlock(block));
            });
            return true;
        }
        case 'get-root-block': {
            await env.resolveBlock(parameters[0], listBlocks, async (block) => {
                await env.println(await getRootBlock(block));
            });
            return true;
        }
        case 'get-next-block': {
            await env.resolveBlock(parameters[0], listBlocks, async (block) => {
                await env.println(await getNextBlock(block));
            });
            return true;
        }
        case 'validate-blockchain': {
            await env.resolveBlock(parameters[0], listBlocks, async (block) => {
                await env.println(await validateBlockchain(block));
            });
            return true;
        }
        case 'list-blocks': {
            await env.println(await listBlocks());
            return true;
        }
        case 'start-blockchain-event-capture': {
            await startEventCapture();
            emitter.on('read-block', async ({ parameters: paramData, result }) => {
                await env.println("Captured event 'read-block'", 'parameters:', paramData, 'result:', result);
            });
            emitter.on('write-block', async ({ parameters: paramData, result }) => {
                await env.println("Captured event 'write-block'", 'parameters:', paramData, 'result:', result);
            });
            return true;
        }
        case 'stop-blockchain-event-capture':
            await stopEventCapture();
            return true;
        default:
            return false;
        }
    }

    return {
        readBlock,
        readRawBlock,
        readBlockBytes,
        writeBlock,
        listBlocks,
        countBlocks,
        findInBlocks,
        findAllInBlocks,
        mapInBlocks,
        getHeadBlock,
        getRootBlock,
        getNextBlock,
        validateBlockchain,
        handleCommand,
    };
};
