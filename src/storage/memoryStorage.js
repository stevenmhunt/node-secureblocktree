/* eslint-disable no-await-in-loop */

/**
 * Mock storage factory (in-memory, using a vanilla JS object)
 */
module.exports = function storageFactory() {
    const data = {};
    const keys = [];

    /**
     * Reads a block from storage.
     * @param {string} hash The hash of the block to read.
     * @returns {Promise<Buffer>} The binary data being stored.
     */
    async function readStorage(hash) {
        if (!hash) {
            return null;
        }
        return data[hash.toString('base64')];
    }

    /**
     * Writes a block to storage.
     * @param {string} value The value to write to storage.
     * @returns {Promise<string>} The hash of the written block.
     */
    async function writeStorage(hash, value) {
        data[hash.toString('base64')] = value;
        keys.push(hash);
        return hash;
    }

    async function readKeys() {
        return keys;
    }

    /**
     * Iterates through all blocks in storage using the map() function.
     * @param {Function} fn The map() callback function.
     * @returns {Promise<Array>} the result of the map() call.
     */
    async function mapInStorage(fn) {
        const result = new Array(keys.length);
        for (let i = 0; i < keys.length; i += 1) {
            const value = await readStorage(keys[i]);
            result[i] = fn(value);
        }
        return result;
    }

    /**
     * Iterates through all blocks in storage using the find() function.
     * @param {Function} fn The find() callback function.
     * @returns {Promise} The result of the find() call.
     */
    async function findInStorage(fn) {
        for (let i = 0; i < keys.length; i += 1) {
            const value = await readStorage(keys[i]);
            if (fn(value)) {
                return value;
            }
        }
        return undefined;
    }

    /**
     * Retrieves a count of the number of blocks in storage.
     * @returns {Promise<number>} The number of blocks in storage.
     */
    async function countInStorage() {
        return keys.length;
    }

    return {
        readStorage,
        writeStorage,
        readKeys,
        mapInStorage,
        findInStorage,
        countInStorage,
    };
};
