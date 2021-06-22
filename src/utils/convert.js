const constants = require('../constants');
const { SerializationError } = require('../errors');

/**
 * Reads a 64-bit unsigned integer from the buffer.
 * @param {Buffer} buf The buffer to read from.
 * @param {number} index The index to start reading from.
 * @returns {BigInt} The number.
 */
function toInt64(buf, index) {
    return buf.readBigUInt64BE(index);
}

/**
 * Writes a 64-bit unsigned integer to a buffer.
 * @param {BigInt} val The number to write.
 * @returns {Buffer} The buffer.
 */
function fromInt64(val, name = '(value)') {
    if (Buffer.isBuffer(val)) {
        if (Buffer.byteLength(val) !== constants.size.int64) {
            throw new SerializationError({
                name,
                size: Buffer.byteLength(val),
                range: [0n, constants.max.int64],
            },
            SerializationError.reasons.argumentOutOfBounds);
        }
        return val;
    }
    if (val < 0n || val > constants.max.int64) {
        throw new SerializationError(
            { name, size: val, range: [0n, constants.max.int64] },
            SerializationError.reasons.argumentOutOfBounds,
        );
    }
    const buf = Buffer.allocUnsafe(constants.size.int64);
    buf.writeBigUInt64BE(val);
    return buf;
}

/**
 * Reads a 32-bit unsigned integer from the buffer.
 * @param {Buffer} buf The buffer to read from.
 * @param {number} index The index to start reading from.
 * @returns {number} The number.
 */
function toInt32(buf, index) {
    return buf.readUInt32BE(index);
}

/**
 * Writes a 32-bit unsigned integer to a buffer.
 * @param {number} val The number to write.
 * @returns {Buffer} The buffer.
 */
function fromInt32(val, name = '(value)') {
    if (Buffer.isBuffer(val)) {
        if (Buffer.byteLength(val) !== constants.size.int32) {
            throw new SerializationError({
                name,
                size: Buffer.byteLength(val),
                range: [0, constants.max.int32],
            },
            SerializationError.reasons.argumentOutOfBounds);
        }
        return val;
    }
    if (val < 0 || val > constants.max.int32) {
        throw new SerializationError(
            { name, size: val, range: [0, constants.max.int32] },
            SerializationError.reasons.argumentOutOfBounds,
        );
    }
    const buf = Buffer.allocUnsafe(constants.size.int32);
    buf.writeUInt32BE(val);
    return buf;
}

/**
 * Reads a 16-bit unsigned integer from the buffer.
 * @param {Buffer} buf The buffer to read from.
 * @param {number} index The index to start reading from.
 * @returns {number} The number.
 */
function toInt16(buf, index) {
    return buf.readUInt16BE(index);
}

/**
 * Writes a 16-bit unsigned integer to a buffer.
 * @param {number} val The number to write.
 * @returns {Buffer} The buffer.
 */
function fromInt16(val, name = '(value)') {
    if (Buffer.isBuffer(val)) {
        if (Buffer.byteLength(val) !== constants.size.int32) {
            throw new SerializationError({
                name,
                size: Buffer.byteLength(val),
                range: [0, constants.max.int16],
            },
            SerializationError.reasons.argumentOutOfBounds);
        }
        return val;
    }
    if (val < 0 || val > constants.max.int16) {
        throw new SerializationError(
            { name, size: val, range: [0, constants.max.int16] },
            SerializationError.reasons.argumentOutOfBounds,
        );
    }
    const buf = Buffer.allocUnsafe(constants.size.int16);
    buf.writeUInt16BE(val);
    return buf;
}

/**
 * Reads an 8-bit unsigned integer from the buffer.
 * @param {Buffer} buf The buffer to read from.
 * @param {number} index The index to start reading from.
 * @returns {number} The number.
 */
function toByte(buf, index) {
    return buf[index];
}

/**
 * Writes an 8-bit unsigned integer to a buffer.
 * @param {number} val The number to write.
 * @returns {Buffer} The buffer.
 */
function fromByte(val, name = '(value)') {
    if (Buffer.isBuffer(val)) {
        if (Buffer.byteLength(val) !== constants.size.byte) {
            throw new SerializationError({
                name,
                size: Buffer.byteLength(val),
                range: [0, constants.max.byte],
            },
            SerializationError.reasons.argumentOutOfBounds);
        }
        return val;
    }
    if (val < 0 || val > constants.max.byte) {
        throw new SerializationError(
            { name, size: val, range: [0, constants.max.byte] },
            SerializationError.reasons.argumentOutOfBounds,
        );
    }
    return Buffer.from([val]);
}

/**
 * Serializes a buffer up to 64K.
 * @param {Buffer} data The key to serialize.
 * @returns {Buffer} A serialized buffer.
 */
function fromVarBinary(data) {
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

/**
 * Given a buffer, deserializes the data into a buffer with a 2-byte size value.
 * @param {*} data The data to deserialize.
 * @param {*} startIndex The index to start reading from.
 * @returns {Object} A deserialized object.
 */
function toVarBinary(data, startIndex = 0) {
    let index = startIndex;
    let result = null;
    const size = toInt16(data, index);
    index += constants.size.int16;
    if (size > 0) {
        result = data.slice(index, index + size);
        index += size;
    }
    return { result, index };
}

module.exports = {
    fromInt64,
    toInt64,
    fromInt32,
    toInt32,
    fromInt16,
    toInt16,
    fromByte,
    toByte,
    fromVarBinary,
    toVarBinary,
};
