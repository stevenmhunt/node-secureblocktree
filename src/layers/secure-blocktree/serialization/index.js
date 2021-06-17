/* eslint-disable no-plusplus */
const constants = require('../../../constants');
const blockTypes = require('./blockTypes');
const { serializeSignature } = require('./serialize');
const { deserializeSignature } = require('./deserialize');

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
    const { prev, parent, layer } = secureData;
    const data = Buffer.concat([
        // secure block type
        Buffer.from([secureData.type]),
        // signature data
        serializeSignature(secureData.sig),
        // data
        serializeSecureBlockData(secureData.type, secureData.data),
    ].filter((i) => i));
    return {
        prev,
        parent,
        data,
        layer: layer >= constants.layer.secureBlocktree ? layer : constants.layer.secureBlocktree,
    };
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
        timestamp, prev, parent, nonce, hash, layer, data,
    } = btBlockData;

    // check the layer number.
    if (layer < constants.layer.secureBlocktree) {
        return null;
    }

    let index = 0;
    const result = {
        timestamp, prev, parent, nonce, hash, layer,
    };
    result.type = data[index++];
    const res = deserializeSignature(data, index);
    result.sig = res.result;
    index = res.index;
    result.data = deserializeSecureBlockData(result.type, data.slice(index));
    return result;
}

module.exports = {
    serializeSecureBlock,
    deserializeSecureBlock,
};
