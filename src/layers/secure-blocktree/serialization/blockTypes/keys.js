/* eslint-disable no-plusplus, no-await-in-loop */
const constants = require('../../../../constants');
const { fromInt64, toInt16, toInt64 } = require('../../../../utils');
const { serializeKey, serializeKeys } = require('../serialize');

module.exports = {
    serialize: function serializeKeysBlock({
        parentKey, keys, tsInit, tsExp, data,
    }) {
        const dataValue = data || Buffer.alloc(0);
        return Buffer.concat([
            // start and expiration timestamps for keys
            fromInt64(tsInit),
            fromInt64(tsExp),
            // parent key (for validating key chain)
            serializeKey(parentKey),
            // keys to add
            serializeKeys(keys),
            // (optional) additional data
            dataValue,
        ]);
    },
    deserialize: function deserializeKeysBlock(data, startIndex = 0) {
        const result = {};
        let index = startIndex;
        result.tsInit = toInt64(data, index);
        index += constants.size.int64;
        result.tsExp = toInt64(data, index);
        index += constants.size.int64;
        const parentKeySize = toInt16(data, index);
        index += constants.size.int16;
        if (parentKeySize === 0) {
            result.parentKey = null;
        } else {
            result.parentKey = data.slice(index, index + parentKeySize)
                .toString(constants.format.key);
            index += parentKeySize;
        }
        const actionCount = data[index++];
        const keys = {};
        for (let i = 0; i < actionCount; i += 1) {
            const action = String.fromCharCode(data[index++]);
            const keyCount = toInt16(data, index);
            index += constants.size.int16;
            const actionKeys = [];
            for (let j = 0; j < keyCount; j += 1) {
                const keySize = toInt16(data, index);
                index += constants.size.int16;
                actionKeys.push(data.slice(index, index + keySize)
                    .toString(constants.format.key));
                index += keySize;
            }
            keys[action] = actionKeys;
        }
        result.keys = keys;
        const additionalData = data.slice(index);
        if (Buffer.byteLength(additionalData) > 0) {
            result.data = additionalData;
        }
        return result;
    },
};
