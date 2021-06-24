const constants = require('../../constants');
const { InvalidKeyError } = require('../../errors');
const { serializeSecureBlockData, deserializeKeyFromSignature } = require('./serialization');

/**
 * Secure Blocktree Data API.
 */
module.exports = function secureBlocktreeDataFactory({ context }) {
    /**
     * Creates encrypted block data.
     * @param {Buffer} key The public key to use for encrypting the block.
     * @param {number} type The block type.
     * @param {Object} data The data to encrypt.
     * @returns {Promise<Object>} The encrypted block object.
     */
    async function encryptBlockData({
        key, type, data,
    }) {
        const serializedData = serializeSecureBlockData(type, data);
        return {
            isEncrypted: true,
            key,
            encryptedData: await context.encryptData(key, serializedData),
        };
    }

    /**
     *
     * @param {*} param0
     */
    async function performTrustedRead({
        block, sig, broker,
    }) {
        // collect key information.
        const action = constants.action.read;
        const blockData = await context.readSecureBlock(block);
        const requiredKey = deserializeKeyFromSignature(blockData.sig);
        const currentKey = deserializeKeyFromSignature(sig);

        // if we already have the required key, then we don't need to do anything.
        if (Buffer.compare(requiredKey, currentKey) === 0) {
            return blockData.data;
        }

        // perform a key seek to locate the required block.
        const seek = await context.performKeySeek({ block, action, key: requiredKey });
        if (!seek) {
            throw new InvalidKeyError({ key: requiredKey });
        }

        // attempt to locate a secret for the current key.
        const secretData = await context.performSecretSeek({ block: seek.block, ref: currentKey });
        if (!secretData) {
            throw new InvalidKeyError({ key: currentKey });
        }
        const { secret } = secretData;

        // use a broker to construct a secret which can be decoded by the trusted key.
        return broker.buildTrustedSecret({
            secret, authorizedKey: requiredKey, trustedKey: currentKey,
        });
    }

    return {
        encryptBlockData,
        performTrustedRead,
    };
};
