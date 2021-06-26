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
     * Given an encrypted block, uses privilege elevation to re-encrypt data to a trusted key.
     * @param {Buffer} block The block id.
     * @param {Buffer} key The trusted key to use.
     * @param {Buffer} signedToken a signed token from a secrets broker.
     * @param {Object} broker The secrets broker.
     * @returns {Promise<Buffer>} The encrypted data, encrypted with the trusted key.
     */
    async function performTrustedRead({
        block, key, signedToken, broker,
    }) {
        // collect key information.
        const action = constants.action.read;
        const blockData = await context.readSecureBlock(block);
        if (!blockData.data || !blockData.data.isEncrypted) {
            return blockData.data;
        }

        const authorizedKey = deserializeKeyFromSignature(blockData.sig);
        const trustedKey = !Buffer.isBuffer(key) ? Buffer.from(key, constants.format.key) : key;

        // if we already have the required key or there's no data,
        // then we don't need to do anything.
        if (Buffer.compare(authorizedKey, trustedKey) === 0
            || !blockData.data.data
            || Buffer.byteLength(blockData.data.data) === 0) {
            return blockData.data.data;
        }

        // verify the trusted key
        const trustSeek = await context.performKeySeek({
            block, action, key: trustedKey, allowTrustedKeys: true,
        });
        if (!trustSeek) {
            throw new InvalidKeyError({ key: trustedKey });
        }

        // perform a key seek to locate the required block.
        const seek = await context.performKeySeek({ block, action, key: authorizedKey });
        if (!seek) {
            throw new InvalidKeyError({ key: authorizedKey });
        }

        // attempt to locate a secret for the authorized key.
        const secretData = await context.performSecretSeek({
            block: seek.block, ref: authorizedKey,
        });
        if (!secretData) {
            throw new InvalidKeyError({ key: authorizedKey });
        }
        const { secret } = secretData;
        const secrets = [blockData.data.data];

        // use a broker to construct a secret which can be decoded by the trusted key.
        const [result] = await broker.buildTrustedSecrets({
            signedToken, secrets, authorizedKey, trustedKey, encryptedKeyData: [secret],
        });
        return result;
    }

    return {
        encryptBlockData,
        performTrustedRead,
    };
};
