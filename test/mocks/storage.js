module.exports = function storageFactory() {
    const data = {};

    /**
     * Reads a block from storage.
     * @param {string} hash The hash of the block to read.
     * @returns {Promise<Buffer>} The binary data being stored.
     */
    async function readStorage(hash) {
        return data[hash];
    }

    /**
     * Writes a block to storage.
     * @param {string} value The value to write to storage.
     * @returns {Promise<string>} The hash of the written block.
     */
    async function writeStorage(hash, value) {
        data[hash] = value;
        return hash;
    }

    async function readKeys() {
        return Object.keys(data).map((i) => i);
    }

    /**
     * Iterates through all blocks in the system using the map() function.
     * @param {Function} fn The map() callback function.
     * @returns {Promise<Array>} the result of the map() call.
     */
    async function mapInStorage(fn) {
        return Object.values(data).map(fn);
    }

    /**
     * Iterates through all blocks in the system using the find() function.
     * @param {Function} fn The find() callback function.
     * @returns {Promise} The result of the find() call.
     */
    async function findInStorage(fn) {
        return Object.values(data).find(fn);
    }

    return {
        readStorage,
        writeStorage,
        readKeys,
        mapInStorage,
        findInStorage,
    };
};
