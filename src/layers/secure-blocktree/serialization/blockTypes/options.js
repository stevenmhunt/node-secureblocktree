/* eslint-disable no-plusplus */
const { fromByte } = require('../../../../utils');

/**
 * Serialize and deserialize functions for options.
 */
module.exports = {
    /**
     * Serializes an options block.
     * @returns {Buffer} The serialized block.
     */
    serialize: function serializeOptionsBlock(options) {
        const keys = Object.keys(options || {});
        const size = keys.length;

        if (size === 0) {
            return fromByte(size);
        }
        const result = [fromByte(size, 'options')];
        for (let i = 0; i < size; i += 1) {
            const key = keys[i] || '';
            const keyBytes = Buffer.from(key, 'utf-8');
            const keyLength = Buffer.byteLength(keyBytes);

            result.push(fromByte(keyLength, 'key'));
            result.push(keyBytes);

            const value = options[key];
            const valueBytes = Buffer.from(value, 'utf-8');
            const valueLength = Buffer.byteLength(valueBytes);

            result.push(fromByte(valueLength, 'value'));
            result.push(valueBytes);
        }
        return Buffer.concat(result);
    },

    /**
     * Deserializes a options block.
     * @returns {Object} The deserialized block.
     */
    deserialize: function deserializeOptionsBlock(data, startIndex = 0) {
        const result = {};
        let index = startIndex;
        const length = data[index++];

        for (let i = 0; i < length; i += 1) {
            const keySize = data[index++];
            const key = Buffer.slice(index, index + keySize).toString('utf-8');
            index += keySize;

            const valueSize = data[index++];
            const value = Buffer.slice(index, index + valueSize).toString('utf-8');
            index += valueSize;
            result[key] = value;
        }

        return result;
    },
};
