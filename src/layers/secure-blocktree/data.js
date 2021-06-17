/*
const constants = require('../../constants');
const {
    InvalidSignatureError, InvalidBlockError, InvalidRootError,
} = require('../../errors');
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
