const crypto = require('crypto');
const constants = require('../../src/constants');

module.exports = function osFactory() {
    /**
     * Generates hashes for block data.
     * @param {string} value
     */
    function generateHash(value) {
        return crypto.createHash(constants.block.hash).update(value).digest(constants.format.hash);
    }

    const timestamps = [];
    /**
     * Generates a 64 bit integer representing UTC epoch time.
     * @returns {BigInt} A UTC epoch timestamp.
     */
    function generateTimestamp() {
        if (timestamps.length > 0) {
            return timestamps.shift();
        }
        const now = new Date();
        const utcMilliseconds = BigInt(now.getTime()) + BigInt(now.getTimezoneOffset() * 60 * 1000);
        return utcMilliseconds;
    }

    function setNextTimestamp(val) {
        timestamps.push(val);
    }

    /**
     * Generates a cryptographically random 64 bit integer.
     * @returns {Buffer} A random 64 bit integer.
     */
    function generateNonce() {
        return crypto.randomBytes(constants.size.int64);
    }

    return {
        generateHash,
        generateTimestamp,
        setNextTimestamp,
        generateNonce,
    };
};
