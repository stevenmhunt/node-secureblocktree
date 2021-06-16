/* eslint-disable no-plusplus, no-await-in-loop */
const constants = require('../../constants');
const utils = require('../../utils');

module.exports = function secureBlocktreeSerializationFactory() {
    /**
     * @private
     * Given a list of keys, serializes them for being written to a block.
     * @param {*} keys The list of keys to serialize.
     * @returns {Buffer} A binary representation of the array.
     */
    function serializeKeys(keys) {
        const results = [Buffer.from([Object.keys(keys).length])];
        Object.keys(keys).forEach((key) => {
            results.push(Buffer.from([key.charCodeAt()]));
            const keyList = Array.isArray(keys[key]) ? keys[key] : [keys[key]];
            results.push(utils.fromInt16(keyList.length));
            keyList.forEach((keyItem) => {
                let keyData = keyItem || Buffer.alloc(0);
                if (!Buffer.isBuffer(keyData)) {
                    keyData = Buffer.from(keyData, constants.format.key);
                }
                results.push(utils.fromInt16(Buffer.byteLength(keyData)));
                results.push(keyData);
            });
        });
        return Buffer.concat(results);
    }

    /**
     * @private
     * Serializes secure block data to be written to the block.
     * @param {*} type The type of secure block to serialize.
     * @param {*} dataItem The type-specific block data.
     * @returns {Buffer} A binary representation of the secure data.
     */
    function serializeSecureBlockData(type, dataItem) {
        if (type === constants.blockType.keys) {
            const {
                keys, tsInit, tsExp, data,
            } = dataItem;
            const dataValue = data || Buffer.alloc(0);
            return Buffer.concat([
                // start and expiration timestamps for keys
                utils.fromInt64(tsInit),
                utils.fromInt64(tsExp),
                serializeKeys(keys),
                // (optional) additional data
                dataValue,
            ]);
        }
        return Buffer.alloc(0);
    }

    /**
     * @private
     * Serializes a digital signature for storing within a secure block.
     * @param {*} sig The signature to serialize.
     * @returns {Buffer} A binary representation of the signature.
     */
    function serializeSignature(sig) {
        let sigData = sig || Buffer.alloc(0);
        if (!Buffer.isBuffer(sigData)) {
            sigData = Buffer.from(sigData, constants.format.signature);
        }
        return Buffer.concat([
            utils.fromInt16(Buffer.byteLength(sigData)),
            sigData,
        ]);
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
        if (!data) {
            return null;
        }
        let index = 0;
        const result = {};
        if (type === constants.blockType.keys) {
            result.tsInit = utils.toInt64(data, index);
            index += constants.size.int64;
            result.tsExp = utils.toInt64(data, index);
            index += constants.size.int64;
            const actionCount = data[index++];
            const keys = {};
            for (let i = 0; i < actionCount; i += 1) {
                const action = String.fromCharCode(data[index++]);
                const keyCount = utils.toInt16(data, index);
                index += constants.size.int16;
                const actionKeys = [];
                for (let j = 0; j < keyCount; j += 1) {
                    const keySize = utils.toInt16(data, index);
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
        }
        return result;
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

    return {
        serializeSecureBlock,
        deserializeSecureBlock,
    };
};
