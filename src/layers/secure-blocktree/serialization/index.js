/* eslint-disable no-plusplus, no-await-in-loop */
const constants = require('../../../constants');
const utils = require('../../../utils');
const blockTypes = require('./blockTypes');
const { serializeSignature } = require('./serialize');

/**
 * @private
 * Serializes secure block data to be written to the block.
 * @param {*} type The type of secure block to serialize.
 * @param {*} data The type-specific block data.
 * @returns {Buffer} A binary representation of the secure data.
 */
function serializeSecureBlockData(type, data) {
    if (data && blockTypes[type]) {
        return blockTypes[type].serialize(data);
    }
    return Buffer.alloc(0);
}

/**
 * Given a secure object, converts it into a blocktree object.
 * @param {Object} btBlockData The secure object.
 * @returns {Object} A blocktree object.
 */
function serializeSecureBlock(secureData) {
    const { prev, parent } = secureData;
    const data = Buffer.concat([
        // secure block type
        Buffer.from([secureData.type]),
        // signature data
        serializeSignature(secureData.sig),
        // data
        serializeSecureBlockData(secureData.type, secureData.data),
    ].filter((i) => i));
    return { prev, parent, data };
}

/**
 * Deserializes binary data into a secure block data object.
 * @param {number} type The block type.
 * @param {Buffer} data The data to deserialize.
 * @returns {Object} The deserialized secure block data.
 */
function deserializeSecureBlockData(type, data) {
    if (data && blockTypes[type]) {
        return blockTypes[type].deserialize(data);
    }
    return null;
}

/**
 * Given a blocktree object, deserializes it into a secure object.
 * @param {Buffer} buf The buffer to deserialize.
 * @returns {Object} A secure object.
 */
function deserializeSecureBlock(btBlockData) {
    if (!btBlockData) {
        return null;
    }
    const {
        timestamp, prev, parent, nonce, hash, data,
    } = btBlockData;
    let index = 0;
    const result = {
        timestamp, prev, parent, nonce, hash,
    };
    result.type = data[index++];
    const sigLength = utils.toInt16(data, index);
    index += constants.size.int16;
    if (sigLength > 0) {
        result.sig = data.slice(index, index + sigLength)
            .toString(constants.format.signature);
        index += sigLength;
    } else {
        result.sig = null;
    }
    result.data = deserializeSecureBlockData(result.type, data.slice(index));
    return result;
}

module.exports = {
    serializeSecureBlock,
    deserializeSecureBlock,
};
