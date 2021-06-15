module.exports = function cacheFactory() {
    const cache = {};

    /**
     * Reads data from the cache.
     * @param {string} scope The scope (usually a block or blockchain hash)
     * where the value can be found.
     * @param {string} name The name of the value to locate.
     * @returns {Promise<string>} The located cache value, or null.
     */
    async function readCache(scope, name) {
        const result = cache[`${scope || 'global'}___${name}`];
        return result === undefined ? null : result;
    }

    /**
     * Writes data to the cache.
     * @param {string} scope The scope (usually a block or blockchain hash)
     * where the value can be found.
     * @param {string} name The name of the value to locate.
     * @param {string} value The value to write to the cache.
     */
    async function writeCache(scope, name, value) {
        cache[`${scope || 'global'}___${name}`] = value;
    }

    /**
     * Pushes data onto the specified cache value.
     * @param {string} scope The scope (usually a block or blockchain hash)
     * where the value can be found.
     * @param {string} name The name of the value to locate.
     * @param {string} value The value to push onto to the cache.
     */
    async function pushCache(scope, name, value) {
        const key = `${scope || 'global'}___${name}`;
        const list = cache[key] || [];
        list.push(value);
        cache[key] = list;
    }

    return {
        readCache,
        writeCache,
        pushCache,
    };
};
