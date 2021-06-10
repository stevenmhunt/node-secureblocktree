const hash = require('object-hash');
const crypto = require('crypto');

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

module.exports = {
    generateHash,
    generateTimestamp,
    generateNonce
};
