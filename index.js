/* eslint-disable no-console */
const rlp = require('readline');
const cliFactory = require('./src/cli');

// blocktree layers
const secureBlocktreeLayerFactory = require('./src/layers/secure-blocktree');
const blocktreeLayerFactory = require('./src/layers/blocktree');
const blockchainLayerFactory = require('./src/layers/blockchain');
const systemLayerFactory = require('./src/layers/system');

// mocks
const timeFactory = require('./test/mocks/time');

// caches
const inMemoryCache = require('./src/cache/inMemoryCache');

// storage
const inMemoryStorage = require('./src/storage/inMemoryStorage');

if (require.main === module) {
    const cache = inMemoryCache();
    const time = timeFactory();
    const storage = inMemoryStorage();
    const system = systemLayerFactory({ cache, storage, time });
    const blockchain = blockchainLayerFactory({ system, cache, time });
    const blocktree = blocktreeLayerFactory({ blockchain });
    const secureCache = inMemoryCache();
    const secureBlocktree = secureBlocktreeLayerFactory({
        blocktree, secureCache, time,
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
