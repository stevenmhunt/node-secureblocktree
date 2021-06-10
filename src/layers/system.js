const hash = require('object-hash');
const crypto = require('crypto');

const data = {};
const cache = {};

/**
 * Generates hashes for block data.
 * @param {string} value 
 */
function generateHash(value) {
    return hash(value);
}

/**
 * Generates a 64 bit integer representing UTC epoch time.
 * @returns {BigInt} A UTC epoch timestamp.
 */
function generateTimestamp() {
    const now = new Date();
    const utcMilliseconds = BigInt(now.getTime()) + BigInt(now.getTimezoneOffset() * 60 * 1000);
    return utcMilliseconds / 1000n;
}

/**
 * Generates a cryptographically random 32 bit integer.
 * @returns {Buffer} A random 32 bit integer.
 */
function generateNonce() {
    return crypto.randomBytes(4);
}

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
async function writeStorage(value) {
    const hash = generateHash(value);
    data[hash] = value;
    return hash;
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

/**
 * Reads data from the system cache.
 * @param {string} scope The scope (usually a block or blockchain hash) where the value can be found.
 * @param {string} name The name of the value to locate.
 * @returns {Promise<string>} The located cache value, or null.
 */
async function readCache(scope, name) {
    const result = cache[`${scope || 'global'}___${name}`];
    return result === undefined ? null : result;
}

/**
 * Writes data to the system cache.
 * @param {string} scope The scope (usually a block or blockchain hash) where the value can be found.
 * @param {string} name The name of the value to locate.
 * @param {string} value The value to write to the cache.
 */
async function writeCache(scope, name, value) {
    cache[`${scope || 'global'}___${name}`] = value;
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
