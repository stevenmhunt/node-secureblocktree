/* eslint-disable no-plusplus */
const constants = require('../../../constants');
const { toInt16 } = require('../../../utils');

function deserializeKey(data, startIndex = 0, format = constants.format.key) {
    let index = startIndex;
    let result = null;
    const keySize = toInt16(data, index);
    index += constants.size.int16;
    if (keySize > 0) {
        result = data.slice(index, index + keySize);
        index += keySize;
    }

    if (result && format) {
        result = result.toString(format);
    }
    return { result, index };
}

function deserializeKeys(data, startIndex = 0) {
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

function deserializeCertificate(buf, index) {
    return {
        result: null,
        index,
    };
}

function deserializeCertificates(buf, index) {
    return {
        result: null,
        index,
    };
}

function deserializeSignature(data, startIndex = 0) {
    let index = startIndex;
    let result = null;
    const sigLength = toInt16(data, index);
    index += constants.size.int16;
    if (sigLength > 0) {
        result = data.slice(index, index + sigLength)
            .toString(constants.format.signature);
        index += sigLength;
    }
    return { result, index };
}

module.exports = {
    deserializeKey,
    deserializeKeys,
    deserializeCertificate,
    deserializeCertificates,
    deserializeSignature,
};
