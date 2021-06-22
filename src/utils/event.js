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
    withEvent,
};
