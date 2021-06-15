/**
 * Blocktree Level 0 - System
 */
module.exports = function systemLayerFactory({ cache, storage, os }) {
    /**
     * Generates hashes for block data.
     * @param {string} value
     */
    function generateHash(value) {
        return os.generateHash(value);
    }

    /**
     * Generates a 64 bit integer representing UTC epoch time.
     * @returns {BigInt} A UTC epoch timestamp.
     */
    function generateTimestamp() {
        return os.generateTimestamp();
    }

    /**
     * Generates a cryptographically random 32 bit integer.
     * @returns {Buffer} A random 32 bit integer.
     */
    function generateNonce() {
        return os.generateNonce();
    }

    /**
     * Reads a block from storage.
     * @param {string} hash The hash of the block to read.
     * @returns {Promise<Buffer>} The binary data being stored.
     */
    async function readStorage(hash) {
        const result = await storage.readStorage(hash);
        if (result && generateHash(result) !== hash) {
            return null;
        }
        return result;
    }

    /**
     * Writes a block to storage.
     * @param {string} value The value to write to storage.
     * @returns {Promise<string>} The hash of the written block.
     */
    async function writeStorage(value) {
        const hash = generateHash(value);
        return storage.writeStorage(hash, value);
    }

    /**
     * Retrieves the specified list of keys.
     * @param {string} partial The "starts with" search to perform, or null to retrieve all keys.
     * @returns {Promise<Array>} The list of requested keys.
     */
    async function readKeys(partial = null) {
        const result = await storage.readKeys();
        if (partial) {
            return result.filter((i) => i.startsWith(partial));
        }
        return result;
    }

    /**
     * Iterates through all blocks in the system using the map() function.
     * @param {Function} fn The map() callback function.
     * @returns {Promise<Array>} the result of the map() call.
     */
    async function mapInStorage(fn) {
        return storage.mapInStorage(fn);
    }

    /**
     * Iterates through all blocks in the system using the find() function.
     * @param {Function} fn The find() callback function.
     * @returns {Promise} The result of the find() call.
     */
    async function findInStorage(fn) {
        return storage.findInStorage(fn);
    }

    /**
     * Retrieves a count of the number of blocks in storage.
     * @returns {Promise<number>} The number of blocks in storage.
     */
    async function countInStorage() {
        return storage.countInStorage();
    }

    /**
     * Reads data from the system cache.
     * @param {string} scope The scope (usually a block or blockchain hash)
     * where the value can be found.
     * @param {string} name The name of the value to locate.
     * @returns {Promise<string>} The located cache value, or null.
     */
    async function readCache(scope, name) {
        return cache.readCache(scope, name);
    }

    /**
     * Writes data to the system cache.
     * @param {string} scope The scope (usually a block or blockchain hash)
     * where the value can be found.
     * @param {string} name The name of the value to locate.
     * @param {string} value The value to write to the cache.
     */
    async function writeCache(scope, name, value) {
        return cache.writeCache(scope, name, value);
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
        case 'generate-hash':
            await env.println(generateHash(parameters[0]));
            return true;
        default:
            return false;
        }
    }

    return {
        readStorage,
        writeStorage,
        readKeys,
        mapInStorage,
        findInStorage,
        countInStorage,
        readCache,
        writeCache,
        generateHash,
        generateTimestamp,
        generateNonce,
        handleCommand,
    };
};
