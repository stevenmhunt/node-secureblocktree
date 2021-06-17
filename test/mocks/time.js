module.exports = function timeFactory() {
    const timestamps = [];
    /**
     * Generates a 64 bit integer representing UTC epoch time.
     * @returns {BigInt} A UTC epoch timestamp.
     */
    function generateTimestamp() {
        if (timestamps.length > 0) {
            return timestamps.shift();
        }
        const now = new Date();
        const utcMilliseconds = BigInt(now.getTime()) + BigInt(now.getTimezoneOffset() * 60 * 1000);
        return utcMilliseconds;
    }

    function setNextTimestamp(val) {
        timestamps.push(val);
    }

    return {
        generateTimestamp,
        setNextTimestamp,
    };
};
