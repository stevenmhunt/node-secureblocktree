const constants = require('../../../constants');
const { fromInt16 } = require('../../../utils');

/**
 * Serializes a buffer up to 64K.
 * @param {Buffer} data The key to serialize.
 * @returns {Buffer} A serialized buffer.
 */
function serializeDataShort(data) {
    if (!data) {
        return fromInt16(0);
    }
    let result = data;
    if (!Buffer.isBuffer(result)) {
        result = Buffer.from(result, constants.format.key);
    }
    return Buffer.concat([
        fromInt16(Buffer.byteLength(result)),
        result,
    ]);
}

module.exports = {
    serializeDataShort,
};
