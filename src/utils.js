const constants = require('./constants');

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
function fromInt64(val) {
    if (Buffer.isBuffer(val)) {
        return val;
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
function fromInt32(val) {
    if (Buffer.isBuffer(val) && Buffer.byteLength(val) === constants.size.int32) {
        return val;
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
function fromInt16(val) {
    if (Buffer.isBuffer(val) && Buffer.byteLength(val) === constants.size.int16) {
        return val;
    }
    const buf = Buffer.allocUnsafe(constants.size.int16);
    buf.writeUInt16BE(val);
    return buf;
}

/**
 * Manages emitting events when an action occurs.
 */
async function withEvent(emitter, event, parameters, fn) {
    if (!emitter) {
        return fn();
    }
    try {
        const result = await fn();
        emitter.emit(event, {
            parameters,
            result,
        });
        return result;
    } catch (err) {
        emitter.emit('error', {
            event, parameters, err,
        });
        throw err;
    }
}

module.exports = {
    fromInt64,
    toInt64,
    fromInt32,
    toInt32,
    fromInt16,
    toInt16,
    withEvent,
};
