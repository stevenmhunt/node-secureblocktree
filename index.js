const cliFactory = require('./src/cli');

// blocktree layers
const securityLayerFactory = require('./src/layers/security');
const blocktreeLayerFactory = require('./src/layers/blocktree');
const blockchainLayerFactory = require('./src/layers/blockchain');
const systemLayerFactory = require('./src/layers/system');

// mocks
const cacheFactory = require('./test/mocks/cache');
const certificatesFactory = require('./test/mocks/certificates');
const osFactory = require('./test/mocks/os');
const storageFactory = require('./test/mocks/storage');

if (require.main === module) {
    const cache = cacheFactory();
    const os = osFactory();
    const storage = storageFactory();
    const system = systemLayerFactory({ cache, storage, os });
    const blockchain = blockchainLayerFactory({ system, cache, os });
    const blocktree = blocktreeLayerFactory({ blockchain });
    const secureCache = cacheFactory();
    const certificates = certificatesFactory();
    const security = securityLayerFactory({
        blocktree, secureCache, os, certificates,
    });

    cliFactory({
        system, blockchain, blocktree, security,
    })
        .then(() => process.exit(0));
}
