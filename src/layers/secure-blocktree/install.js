const constants = require('../../constants');

module.exports = function secureBlocktreeInstallFactory({
    context, secureCache,
}) {
    /**
     * Performs the initial configuration of a secure blocktree.
     * @param {Object} rootKeys The keys to associate with the root blockchain.
     * @param {Object} rootZoneKeys The keys to associate with the root zone.
     * @param {Function} signAsRoot A function which will sign using the root key.
     * @returns {Promise<Object>} The root and root zone blocks.
     */
    async function installRoot({ rootKeys, rootZoneKeys, signAsRoot }) {
        // create the root block.
        const rootBlock = await context.createRoot({
            keys: rootKeys,
        });

        // establish the root zone.
        const rootZone = await context.createZone({
            sig: signAsRoot,
            block: rootBlock,
        });
        await secureCache.writeCache(null, constants.secureCache.rootZone, rootZone);

        // set the root zone keys.
        await context.setKeys({
            sig: signAsRoot,
            block: rootZone,
            parentKey: rootKeys[constants.action.write][0],
            keys: rootZoneKeys,
        });
        return { rootBlock, rootZone };
    }

    return {
        installRoot,
    };
};
