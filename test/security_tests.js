/* eslint-disable no-await-in-loop */
const assert = require('assert');
const constants = require('../src/constants');
const { initSecurity, initializeSecureRoot } = require('./utils');

describe('blocktree API layer 3 - [security]', () => {
    describe('read secure block', () => {
        it('should return null if no value is found.', async () => {
            // arrange
            const security = initSecurity();
            await initializeSecureRoot(security);

            // act
            const result = await security.readSecureBlock(constants.block.zero);

            // assert
            assert.strictEqual(null, result);
        });
        it('should retrieve block data if found from the root block.', async () => {
            // arrange
            const security = initSecurity();
            const { rootBlock } = await initializeSecureRoot(security);

            // act
            const result = await security.readSecureBlock(rootBlock);

            // assert
            assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
            assert.strictEqual(result.prev, null);
            assert.strictEqual(result.parent, null);
            assert.strictEqual(result.type, constants.blockType.keys);
            assert.ok(result.nonce, 'Expected valid nonce value.');
        });
        it('should retrieve block data if found from the root zone.', async () => {
            // arrange
            const security = initSecurity();
            const { rootBlock, rootZone } = await initializeSecureRoot(security);

            // act
            const result = await security.readSecureBlock(rootZone);

            // assert
            assert.ok(result.timestamp > 0, 'Expected timestamp to be valid.');
            assert.strictEqual(result.prev, null);
            assert.strictEqual(result.parent, rootBlock);
            assert.strictEqual(result.type, constants.blockType.zone);
            assert.ok(result.nonce, 'Expected valid nonce value.');
        });
    });
});
