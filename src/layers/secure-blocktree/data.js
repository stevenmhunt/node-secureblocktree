/*
const constants = require('../../constants');
const {
    InvalidSignatureError, InvalidBlockError, InvalidRootError,
} = require('../../errors');
*/

/**
 * Secure Blocktree Data API.
 */
module.exports = function secureBlocktreeDataFactory(/* { context } */) {
    async function performTrustedRead(/* {
        block, nonce, sig,
    } */) {
        return null;
    }

    return {
        performTrustedRead,
    };
};
