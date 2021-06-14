const constants = require('./constants');

function toInt64(buf, index) {
    return buf.readBigInt64BE(index);
}

function fromInt64(val) {
    if (Buffer.isBuffer(val)) {
        return val;
    }
    const buf = Buffer.allocUnsafe(constants.size.int64);
    buf.writeBigInt64BE(val);
    return buf;
}

function toInt32(buf, index) {
    return buf.readUInt32BE(index);
}

function fromInt32(val) {
    if (Buffer.isBuffer(val) && Buffer.byteLength(val) === constants.size.int32) {
        return val;
    }
    const buf = Buffer.allocUnsafe(constants.size.int32);
    buf.writeUInt32BE(val);
    return buf;
}

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
    withEvent,
};
