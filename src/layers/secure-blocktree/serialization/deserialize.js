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
 * Given a buffer, deserializes the data into a key set.
 * @param {*} data The data to deserialize.
 * @param {*} startIndex The index to start reading from.
 * @returns {Object} A key set object.
 */
function deserializeKeySet(data, startIndex = 0) {
    let index = startIndex;
    const actionCount = data[index++];
    const result = {};
    for (let i = 0; i < actionCount; i += 1) {
        const action = String.fromCharCode(data[index++]);
        const keyCount = toInt16(data, index);
        index += constants.size.int16;
        const actionKeys = [];
        for (let j = 0; j < keyCount; j += 1) {
            const actionKey = deserializeKey(data, index);
            index = actionKey.index;
            actionKeys.push(actionKey.result);
        }
        result[action] = actionKeys;
    }
    return { result, index };
}

/**
 * Given a buffer, deserializes the data into a certificate.
 * @param {*} data The data to deserialize.
 * @param {*} startIndex The index to start reading from.
 * @returns {Object} A certificate object.
 */
function deserializeCertificate(buf, index) {
    return {
        result: null,
        index,
    };
}

/**
 * Given a buffer, deserializes the data into a certificate set.
 * @param {*} data The data to deserialize.
 * @param {*} startIndex The index to start reading from.
 * @returns {Object} A certificate set object.
 */
function deserializeCertificateSet(buf, index) {
    return {
        result: null,
        index,
    };
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
    deserializeKeySet,
    deserializeCertificate,
    deserializeCertificateSet,
    deserializeSignature,
};
