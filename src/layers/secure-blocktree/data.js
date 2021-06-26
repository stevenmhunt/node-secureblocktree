const constants = require('../../constants');
const { InvalidKeyError, InvalidSignatureError } = require('../../errors');
const { serializeSecureBlockData, deserializeSecureBlockData } = require('./serialization');
const { verify } = require('../../utils/crypto');

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

    async function decryptBlockData({
        encryptedData, type, privateKey,
    }) {
        if (!privateKey) {
            return deserializeSecureBlockData(type, encryptedData);
        }
        const data = await context.decryptData(privateKey, encryptedData);
        return deserializeSecureBlockData(type, data);
    }

    /**
     * Given an encrypted block, uses privilege elevation to re-encrypt data to a trusted key.
     * @param {Buffer} block The block id.
     * @param {Buffer} key The trusted key to use.
     * @param {Buffer} token The token from the secrets broker.
     * @param {Buffer} sig The token, signed by the trusted key.
     * @param {Object} broker The secrets broker.
     * @returns {Promise<Buffer>} The encrypted data, encrypted with the trusted key.
     */
    async function performTrustedRead({
        block, key, token, sig, broker,
    }) {
        // collect key information.
        const action = constants.action.read;
        const blockData = await context.readSecureBlock(block);
        if (!blockData.data || !blockData.data.isEncrypted) {
            return blockData.data;
        }

        const authorizedKey = !Buffer.isBuffer(blockData.data.key)
            ? Buffer.from(blockData.data.key, constants.format.key)
            : blockData.data.key;
        const trustedKey = !Buffer.isBuffer(key) ? Buffer.from(key, constants.format.key) : key;

        // if we already have the required key or there's no data,
        // then we don't need to do anything.
        if (Buffer.compare(authorizedKey, trustedKey) === 0
            || !blockData.data.data
            || Buffer.byteLength(blockData.data.data) === 0) {
            return blockData.data.data;
        }

        // check the signature.
        if (!sig || !token) {
            throw new InvalidSignatureError({ sig },
                InvalidSignatureError.reasons.notFound);
        }
        if (!(await verify(trustedKey, sig, token))) {
            throw new InvalidSignatureError({ sig },
                InvalidSignatureError.reasons.doesNotMatch);
        }

        // verify the trusted key is trusted.
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
        const secrets = [blockData.data.data];

        // use a broker to construct a secret which can be decoded by the trusted key.
        const [result] = await broker.buildTrustedSecrets({
            token, sig, secrets, authorizedKey, trustedKey,
        });
        return result;
    }

    return {
        encryptBlockData,
        decryptBlockData,
        performTrustedRead,
    };
};
