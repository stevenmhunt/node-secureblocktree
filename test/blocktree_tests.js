/* eslint-disable global-require */
const { initBlocktree, loadTests } = require('./test-helper');

function loadBlocktreeTests(context) {
    describe('readBlock()', loadTests(require('./blocktree/readBlock'), context));
    describe('writeBlock()', loadTests(require('./blocktree/writeBlock'), context));
    describe('performParentScan()', loadTests(require('./blocktree/performParentScan'), context));
    describe('performChildScan()', loadTests(require('./blocktree/performChildScan'), context));
    describe('getParentBlock()', loadTests(require('./blocktree/getParentBlock'), context));
    describe('validateBlocktree()',
        loadTests(require('./blocktree/validateBlocktree'), context));
}

describe('Blocktree Layer 2 - Blocktree', () => {
    describe('without cache', () => {
        const context = {};

        beforeEach(async () => {
            context.blocktree = initBlocktree(false);
        });

        loadBlocktreeTests(context);
    });
    describe('with cache', () => {
        const context = {};

        beforeEach(async () => {
            context.blocktree = initBlocktree(true);
        });

        loadBlocktreeTests(context);
    });
});
