/* eslint-disable no-plusplus */
const constants = require('../../../constants');
const {
    fromByte, fromVarBinary, toVarBinary,
} = require('../../../utils/convert');
const blockTypes = require('./blockTypes');

/**
 * Serializes secure block data to be written to the block.
 * @param {*} type The type of secure block to serialize.
 * @param {*} data The type-specific block data.
 * @returns {Buffer} A binary representation of the secure data.
 */
function serializeSecureBlockData(type, data) {
    if (data && data.isEncrypted && data.key && Buffer.isBuffer(data.encryptedData)) {
        return Buffer.concat([
            fromByte(constants.secureBlockData.encrypted),
            fromVarBinary(data.key),
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
    const {
        type, sig, prev, parent, layer, data: resData,
    } = secureData;

    const data = Buffer.concat([
        // secure block type
        fromByte(type),
        // signature data
        fromVarBinary(sig),
        // data
        serializeSecureBlockData(type, resData),
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
        const key = toVarBinary(data, 1);
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

    const res = toVarBinary(data, index);
    result.sig = res.result;
    index = res.index;

    result.data = deserializeSecureBlockData(result.type, data.slice(index));
    return result;
}

/**
 * Given a signature, deserializes the public key from it.
 * @param {Buffer} signature The signature to extract the public key from.
 * @returns {Buffer} The public key associated with the signature.
 */
function deserializeKeyFromSignature(signature) {
    const { result } = toVarBinary(Buffer.from(signature, constants.format.signature),
        constants.size.int64);
    return result;
}

module.exports = {
    serializeSecureBlock,
    deserializeSecureBlock,
    serializeSecureBlockData,
    deserializeSecureBlockData,
    deserializeKeyFromSignature,
};
