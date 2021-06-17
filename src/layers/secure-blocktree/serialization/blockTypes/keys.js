/* eslint-disable no-plusplus */
const constants = require('../../../../constants');
const { fromInt64, toInt64 } = require('../../../../utils');
const { serializeKey, serializeKeys } = require('../serialize');
const { deserializeKey, deserializeKeys } = require('../deserialize');

/**
 * Serialize and deserialize functions for key blocks.
 */
module.exports = {
    /**
     * Serializes a keys block.
     * @returns {Buffer} The serialized block.
     */
    serialize: function serializeKeysBlock({
        parentKey, keys, storedKeys, tsInit, tsExp, data,
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
            // stored keys to add
            serializeKeys(storedKeys),
            // (optional) additional data
            dataValue,
        ]);
    },
    /**
     * Deserializes a keys block.
     * @returns {Object} The deserialized block.
     */
    deserialize: function deserializeKeysBlock(data, startIndex = 0) {
        const result = {};
        let index = startIndex;

        result.tsInit = toInt64(data, index);
        index += constants.size.int64;

        result.tsExp = toInt64(data, index);
        index += constants.size.int64;

        let res = deserializeKey(data, index);
        result.parentKey = res.result;
        index = res.index;

        res = deserializeKeys(data, index);
        result.keys = res.result;
        index = res.index;

        res = deserializeKeys(data, index);
        result.storedKeys = res.result;
        index = res.index;

        const additionalData = data.slice(index);
        if (Buffer.byteLength(additionalData) > 0) {
            result.data = additionalData;
        }
        return result;
    },
};
