/* eslint-disable no-await-in-loop */
const HashTable = require('@ronomon/hash-table');

module.exports = function storageFactory({
    keySize, valueSize, min, max,
}) {
    const hashTable = new HashTable(
        keySize || 32, valueSize || 2 ** 16, min || 1024, max || 65535,
    );
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
        const result = Buffer.alloc(valueSize);
        if (!hashTable.get(hash, 0, result, 0)) {
            return null;
        }
        const size = result.readUInt16BE(0);
        return result.slice(2, size + 2);
    }

    /**
     * Writes a block to storage.
     * @param {string} value The value to write to storage.
     * @returns {Promise<string>} The hash of the written block.
     */
    async function writeStorage(hash, value) {
        const size = Buffer.allocUnsafe(2);
        size.writeUInt16BE(Buffer.byteLength(value), 0);
        hashTable.set(hash, 0, Buffer.concat([size, value]), 0);
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
        return BigInt(hashTable.length);
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
