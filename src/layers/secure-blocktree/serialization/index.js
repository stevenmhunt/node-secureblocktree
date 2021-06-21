/* eslint-disable no-plusplus */
const constants = require('../../../constants');
const { fromByte } = require('../../../utils');
const blockTypes = require('./blockTypes');
const { serializeDataShort } = require('./serialize');
const { deserializeDataShort } = require('./deserialize');

/**
 * @private
 * Serializes secure block data to be written to the block.
 * @param {*} type The type of secure block to serialize.
 * @param {*} data The type-specific block data.
 * @returns {Buffer} A binary representation of the secure data.
 */
function serializeSecureBlockData(type, data) {
    if (data && data.isEncrypted && data.key && Buffer.isBuffer(data.encryptedData)) {
        return Buffer.concat([
            fromByte(constants.secureBlockData.encrypted),
            serializeDataShort(data.key),
            data.encryptedData,
        ]);
    }
    if (data && blockTypes[type]) {
        return Buffer.concat([
            fromByte(constants.secureBlockData.unencrypted),
            blockTypes[type].serialize(data),
        ]);
    }
    return fromByte(constants.secureBlockData.null);
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
        fromByte(secureData.type),
        // signature data
        serializeDataShort(secureData.sig),
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
    if (!data || !Buffer.isBuffer(data)) {
        return null;
    }
    switch (data[0]) {
    case constants.secureBlockData.null:
        return null;
    case constants.secureBlockData.unencrypted:
        if (data && blockTypes[type]) {
            return blockTypes[type].deserialize(data, 1);
        }
        return null;
    case constants.secureBlockData.encrypted: {
        const key = deserializeDataShort(data, 1);
        return {
            isEncrypted: true,
            key: key.result,
            data: data.slice(key.index),
        };
    }
    default:
        return null;
    }
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
    const res = deserializeDataShort(data, index);
    result.sig = res.result;
    index = res.index;
    result.data = deserializeSecureBlockData(result.type, data.slice(index));
    return result;
}

module.exports = {
    serializeSecureBlock,
    deserializeSecureBlock,
};
