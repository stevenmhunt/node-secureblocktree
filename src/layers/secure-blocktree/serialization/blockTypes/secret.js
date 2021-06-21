/* eslint-disable no-plusplus */
const constants = require('../../../../constants');
const {
    fromInt64, toInt64, fromVarBinary, toVarBinary,
} = require('../../../../utils');

/**
 * Serialize and deserialize functions for secret blocks.
 */
module.exports = {
    /**
     * Serializes a secret block.
     * @returns {Buffer} The serialized block.
     */
    serialize: function serializeSecretBlock({
        key, ref, secret, tsInit, tsExp, data,
    }) {
        const dataValue = data || Buffer.alloc(0);
        return Buffer.concat([
            // key associated with the secret
            fromVarBinary(key),
            // the reference value for the secret
            fromVarBinary(ref),
            // the secret data
            fromVarBinary(secret),
            // start and expiration timestamps for the secret
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
        result.key = res.result;
        index = res.index;

        res = toVarBinary(data, index);
        result.ref = res.result;
        index = res.index;

        res = toVarBinary(data, index);
        result.secret = res.result;
        index = res.index;

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
