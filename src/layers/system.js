// Blocktree API Level 0 - System

// TODO: dependeny injection.
const cache = require('../cache/mock');
const storage = require('../storage/mock');
const system = require('../system/mock');

/**
 * Generates hashes for block data.
 * @param {string} value
 */
function generateHash(value) {
    return system.generateHash(value);
}

/**
 * Generates a 64 bit integer representing UTC epoch time.
 * @returns {BigInt} A UTC epoch timestamp.
 */
function generateTimestamp() {
    return system.generateTimestamp();
}

/**
 * Generates a cryptographically random 32 bit integer.
 * @returns {Buffer} A random 32 bit integer.
 */
function generateNonce() {
    return system.generateNonce();
}

/**
 * Reads a block from storage.
 * @param {string} hash The hash of the block to read.
 * @returns {Promise<Buffer>} The binary data being stored.
 */
async function readStorage(hash) {
    return storage.readStorage(hash);
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
 * Reads data from the system cache.
 * @param {string} scope The scope (usually a block or blockchain hash) where the value can be found.
 * @param {string} name The name of the value to locate.
 * @returns {Promise<string>} The located cache value, or null.
 */
async function readCache(scope, name) {
    return cache.readCache(scope, name);
}

/**
 * Writes data to the system cache.
 * @param {string} scope The scope (usually a block or blockchain hash) where the value can be found.
 * @param {string} name The name of the value to locate.
 * @param {string} value The value to write to the cache.
 */
async function writeCache(scope, name, value) {
    return cache.writeCache(scope, name, value);
}

module.exports = {
    readStorage,
    writeStorage,
    mapInStorage,
    findInStorage,
    readCache,
    writeCache,
    generateHash,
    generateTimestamp,
    generateNonce
};
