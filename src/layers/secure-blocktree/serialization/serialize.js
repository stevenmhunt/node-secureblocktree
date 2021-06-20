const constants = require('../../../constants');
const { fromInt16, fromByte } = require('../../../utils');

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
 * Given a key set, serializes them for being written to a block.
 * @param {*} keys The key set to serialize.
 * @returns {Buffer} A binary representation of the array.
 */
function serializeKeySet(keys) {
    const size = Object.keys(keys || {}).length;
    if (size === 0) {
        return fromByte(size);
    }
    const results = [fromByte(size)];
    Object.keys(keys).forEach((key) => {
        results.push(fromByte(key.charCodeAt()));
        const keyList = Array.isArray(keys[key]) ? keys[key] : [keys[key]];
        results.push(fromInt16(keyList.length));
        keyList.forEach((keyItem) => {
            results.push(serializeKey(keyItem));
        });
    });
    return Buffer.concat(results);
}

/**
 * Serializes a certificate.
 * @param {Buffer} key The certificate to serialize.
 * @returns {Buffer} A serialized certificate.
 */
function serializeCertificate() {
    return Buffer.alloc(0);
}

/**
 * Given a certificate set, serializes them for being written to a block.
 * @param {Object} certs The certificate set to serialize.
 * @returns {Buffer} A binary representation of the array.
 */
function serializeCertificateSet() {
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
    serializeKeySet,
    serializeCertificate,
    serializeCertificateSet,
    serializeSignature,
};
