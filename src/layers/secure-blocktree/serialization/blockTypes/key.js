/* eslint-disable no-plusplus */
const constants = require('../../../../constants');
const {
    fromInt64, toInt64, fromByte, fromVarBinary, toVarBinary,
} = require('../../../../utils/convert');

/**
 * Serialize and deserialize functions for key blocks.
 */
module.exports = {
    /**
     * Serializes a key block.
     * @returns {Buffer} The serialized block.
     */
    serialize: function fromVarBinaryBlock({
        parentKey, key, action, tsInit, tsExp, data,
    }) {
        const dataValue = data || Buffer.alloc(0);
        return Buffer.concat([
            // parent key (for validating key chain)
            fromVarBinary(parentKey),
            // key to add
            fromVarBinary(key),
            // the action to associate
            fromByte(action.charCodeAt(), 'action'),
            // start and expiration timestamps for key
            fromInt64(tsInit),
            fromInt64(tsExp),
            // (optional) additional data
            dataValue,
        ]);
    },
    /**
     * Deserializes a key block.
     * @returns {Object} The deserialized block.
     */
    deserialize: function toVarBinaryBlock(data, startIndex = 0) {
        const result = {};
        let index = startIndex;

        let res = toVarBinary(data, index);
        result.parentKey = res.result;
        index = res.index;

        res = toVarBinary(data, index);
        result.key = res.result;
        index = res.index;

        result.action = String.fromCharCode(data[index++]);

        result.tsInit = toInt64(data, index);
        index += constants.size.int64;

        result.tsExp = toInt64(data, index);
        index += constants.size.int64;

        const additionalData = data.slice(index);
        if (Buffer.byteLength(additionalData) > 0) {
            result.data = additionalData;
        }
        return result;
    },
};
