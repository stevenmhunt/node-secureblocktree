const assert = require('assert');
const constants = require('../src/constants');
const { initSecurity, initializeSecureRoot } = require('./utils');

describe('blocktree API layer 3 - [security]', function () {
    describe('read security block', function () {
        it('should return null if no value is found.', async function () {
            // arrange
            const security = initSecurity();
            await initializeSecureRoot(security);

            // act
            const result = await security.readSecureBlock(constants.block.zero);

            // assert
            assert.strictEqual(null, result);
        });
    });
});
