/* eslint-disable no-plusplus */
const constants = require('../../../constants');
const { toInt16 } = require('../../../utils');

/**
 * Given a buffer, deserializes the data into a key.
 * @param {*} data The data to deserialize.
 * @param {*} startIndex The index to start reading from.
 * @returns {Object} A key object.
 */
function deserializeKey(data, startIndex = 0) {
    let index = startIndex;
    let result = null;
    const keySize = toInt16(data, index);
    index += constants.size.int16;
    if (keySize > 0) {
        result = data.slice(index, index + keySize);
        index += keySize;
    }
    return { result, index };
}

/**
 * Given a buffer, deserializes the data into a signature.
 * @param {*} data The data to deserialize.
 * @param {*} startIndex The index to start reading from.
 * @returns {Object} A signature object.
 */
function deserializeSignature(data, startIndex = 0) {
    let index = startIndex;
    let result = null;
    const sigLength = toInt16(data, index);
    index += constants.size.int16;
    if (sigLength > 0) {
        result = data.slice(index, index + sigLength);
        index += sigLength;
    }
    return { result, index };
}

module.exports = {
    deserializeKey,
    deserializeSignature,
};
