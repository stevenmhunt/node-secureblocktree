/* eslint-disable global-require */
const { initBlockchain, loadTests } = require('./test-helper');

function loadBlockchainTests(context) {
    describe('readBlock()', loadTests(require('./blockchain/readBlock'), context));
    describe('writeBlock()', loadTests(require('./blockchain/writeBlock'), context));
    describe('listBlocks()', loadTests(require('./blockchain/listBlocks'), context));
    describe('countBlocks()', loadTests(require('./blockchain/countBlocks'), context));
    describe('getNextBlock()', loadTests(require('./blockchain/getNextBlock'), context));
    describe('getHeadBlock()', loadTests(require('./blockchain/getHeadBlock'), context));
    describe('getRootBlock()', loadTests(require('./blockchain/getRootBlock'), context));
    describe('validateBlockchain()',
        loadTests(require('./blockchain/validateBlockchain'), context));
}

describe('Blocktree Layer 1 - Blockchain', () => {
    describe('without cache', () => {
        const context = {};

        beforeEach(async () => {
            context.blockchain = initBlockchain(false);
        });

        loadBlockchainTests(context);
    });
    describe('with cache', () => {
        const context = {};

        beforeEach(async () => {
            context.blockchain = initBlockchain(true);
        });

        loadBlockchainTests(context);
    });
});
