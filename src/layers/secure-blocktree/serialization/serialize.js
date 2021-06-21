const constants = require('../../../constants');
const { fromInt16 } = require('../../../utils');

/**
 * Serializes a key.
 * @param {Buffer} key The key to serialize.
 * @returns {Buffer} A serialized key.
 */
function serializeKey(key) {
    if (!key) {
        return fromInt16(0);
    }
    let keyData = key;
    if (!Buffer.isBuffer(keyData)) {
        keyData = Buffer.from(keyData, constants.format.key);
    }
    return Buffer.concat([
        fromInt16(Buffer.byteLength(keyData)),
        keyData,
    ]);
}

/**
 * @private
 * Serializes a digital signature for storing within a secure block.
 * @param {*} sig The signature to serialize.
 * @returns {Buffer} A binary representation of the signature.
 */
function serializeSignature(sig) {
    let sigData = sig || Buffer.alloc(0);
    if (!Buffer.isBuffer(sigData)) {
        sigData = Buffer.from(sigData, constants.format.signature);
    }
    return Buffer.concat([
        fromInt16(Buffer.byteLength(sigData)),
        sigData,
    ]);
}

module.exports = {
    serializeKey,
    serializeSignature,
};
