const constants = require('../../../constants');
const { fromInt16 } = require('../../../utils');

/**
 * @private
 * Serializes a key.
 * @param {string} key The key to serialize.
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
 * Given a list of keys, serializes them for being written to a block.
 * @param {*} keys The list of keys to serialize.
 * @returns {Buffer} A binary representation of the array.
 */
function serializeKeys(keys) {
    const results = [Buffer.from([Object.keys(keys).length])];
    Object.keys(keys).forEach((key) => {
        results.push(Buffer.from([key.charCodeAt()]));
        const keyList = Array.isArray(keys[key]) ? keys[key] : [keys[key]];
        results.push(fromInt16(keyList.length));
        keyList.forEach((keyItem) => {
            results.push(serializeKey(keyItem));
        });
    });
    return Buffer.concat(results);
}

function serializeCertificate() {
    return Buffer.alloc(0);
}

function serializeCertificates() {
    return Buffer.alloc(0);
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
    serializeKeys,
    serializeCertificate,
    serializeCertificates,
    serializeSignature,
};
