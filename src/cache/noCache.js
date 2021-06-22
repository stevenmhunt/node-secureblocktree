/**
 * Mock cache factory that doesn't cache anything.
 */
module.exports = function noCacheFactory() {
    async function readCache() {
        return null;
    }

    async function writeCache() {
        return null;
    }

    async function pushCache() {
        return null;
    }

    return {
        readCache,
        writeCache,
        pushCache,
    };
};
