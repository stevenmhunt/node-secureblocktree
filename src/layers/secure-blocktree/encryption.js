const constants = require('../../constants');
const utils = require('../../utils');
const { serializeKey } = require('./serialization/serialize');
const { deserializeKey } = require('./serialization/deserialize');

module.exports = function secureBlocktreeEncryptionFactory({
    encryption,
}) {
    /**
     * Encrypts data using the specified key.
     * @param {PrivateKey} key The private key to encrypt data with.
     * @param {*} data The data to encrypt.
     * @returns {Promise<Buffer>} The encrypted data.
     */
    async function encryptData(key, data) {
        return encryption.encrypt(
            key,
            Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8'),
        );
    }

    /**
     * Decrypts data using the specified key.
     * @param {string} key The public key to decrypt data with.
     * @param {Buffer} data The data to decrypt.
     * @param {Object} options Additional decryption options.
     * @returns {Promise<Object>} The decrypted data.
     */
    async function decryptData(key, data, options = {}) {
        const result = await encryption.decrypt(
            Buffer.from(key, constants.format.key),
            Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8'),
        );
        if (options && options.encoding) {
            return result.toString(options.encoding);
        }
        return result;
    }

    /**
     * Digitally signs a block using the specified key.
     * @param {string} secret The private key to sign the block with (usually a write key).
     * @param {string} key The public key being signed with.
     * @param {string} parent The parent of the block to sign.
     * @param {string} prev The previous block of the block to sign.
     * @returns {Promise<Buffer>} The signed block data.
     */
    async function signBlock({
        secret, key, parent, prev,
    }) {
        const nonce = utils.generateNonce();
        const result = await encryption.sign(
            secret,
            Buffer.concat([
                nonce,
                parent ? Buffer.from(parent, constants.format.hash) : Buffer.alloc(0),
                prev ? Buffer.from(prev, constants.format.hash) : Buffer.alloc(0),
            ]),
        );
        const sig = Buffer.concat([
            serializeKey(key),
            nonce,
            result,
        ]);
        return sig.toString(constants.format.signature);
    }

    /**
     * Given a key, a signature, and a block,
     * determines if the signature is valid and matches the block.
     * @param {string} sig The signature generated when the block was signed.
     * @param {string} key The key to validate.
     * @param {string} parent The parent block to validate.
     * @param {string} prev The prev block to validate.
     * @returns {Promise<boolean>} Whether or not the signature and key are valid for the block.
     */
    async function verifySignedBlock({
        sig, key, parent, prev,
    }) {
        if (!sig) {
            return false;
        }
        const sigData = Buffer.from(sig, constants.format.signature);
        const keyData = deserializeKey(sigData, 0, null);
        const sigKey = keyData.result;
        const nonce = sigData.slice(keyData.index, keyData.index + constants.size.int64);
        const signature = sigData.slice(keyData.index + constants.size.int64);
        const message = Buffer.concat([
            nonce,
            Buffer.from(`${parent || ''}${prev || ''}`, constants.format.hash),
        ]);

        const result = await encryption.verify(
            sigKey,
            signature,
            message,
        ) && (!key || key === sigKey.toString(constants.format.key));
        return result;
    }

    return {
        encryptData,
        decryptData,
        signBlock,
        verifySignedBlock,
    };
};
