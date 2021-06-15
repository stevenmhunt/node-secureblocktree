/* eslint-disable no-console */
const rlp = require('readline');
const cliFactory = require('./src/cli');

// blocktree layers
const secureBlocktreeLayerFactory = require('./src/layers/secure-blocktree');
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
    const secureBlocktree = secureBlocktreeLayerFactory({
        blocktree, secureCache, os, certificates,
    });

    const rl = rlp.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const io = {
        input: async (level) => new Promise((resolve) => {
            const levels = new Array(level + 1).join('...');
            rl.question(`${levels}${level === 0 ? '>' : ''} `, (input) => resolve(input));
        }),
        output: async (msg) => console.log(msg),
    };

    cliFactory({
        io, system, blockchain, blocktree, secureBlocktree,
    })
        .then(() => process.exit(0));
}
