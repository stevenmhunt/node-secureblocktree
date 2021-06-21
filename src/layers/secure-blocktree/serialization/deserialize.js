/* eslint-disable no-plusplus */
const constants = require('../../../constants');
const { toInt16 } = require('../../../utils');

/**
 * Given a buffer, deserializes the data into a buffer with a 2-byte size value.
 * @param {*} data The data to deserialize.
 * @param {*} startIndex The index to start reading from.
 * @returns {Object} A deserialized object.
 */
function deserializeDataShort(data, startIndex = 0) {
    let index = startIndex;
    let result = null;
    const size = toInt16(data, index);
    index += constants.size.int16;
    if (size > 0) {
        result = data.slice(index, index + size);
        index += size;
    }
    return { result, index };
}

/**
 * Given a signature, deserializes the public key from it.
 * @param {Buffer} signature The signature to extract the public key from.
 * @returns {Buffer} The public key associated with the signature.
 */
function deserializeKeyFromSignature(signature) {
    const { result } = deserializeDataShort(Buffer.from(signature, constants.format.signature));
    return result;
}

module.exports = {
    deserializeDataShort,
    deserializeKeyFromSignature,
};
