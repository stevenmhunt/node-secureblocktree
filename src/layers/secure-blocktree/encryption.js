const constants = require('../../constants');
const { fromVarBinary, toVarBinary } = require('../../utils/convert');
const {
    generateNonce, encrypt, decrypt, sign, verify,
} = require('../../utils/crypto');

/**
 * Secure Blocktree Encryption API.
 */
module.exports = function secureBlocktreeEncryptionFactory(/* { blocktree } */) {
    /**
     * Encrypts data using the specified key.
     * @param {PrivateKey} key The private key to encrypt data with.
     * @param {*} data The data to encrypt.
     * @returns {Promise<Buffer>} The encrypted data.
     */
    async function encryptData(key, data) {
        return encrypt(
            key,
            Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8'),
        );
    }

    /**
     * Decrypts data using the specified key.
     * @param {Buffer} privateKey The private key to decrypt data with.
     * @param {Buffer} data The data to decrypt.
     * @param {Object} options Additional decryption options.
     * @returns {Promise<Object>} The decrypted data.
     */
    async function decryptData(privateKey, data, options = {}) {
        let key = privateKey;
        if (typeof key === 'string') {
            key = Buffer.from(privateKey, constants.format.key);
        }
        const result = await decrypt(key,
            Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8'));
        if (options && options.encoding) {
            return result.toString(options.encoding);
        }
        return result;
    }

    /**
     * Digitally signs a block using the specified key.
     * @param {string} secret The private key to sign the block with (usually a write key).
     * @param {Buffer} key The public key being signed with.
     * @param {Buffer} parent The parent of the block to sign.
     * @param {Buffer} prev The previous block of the block to sign.
     * @returns {Promise<Buffer>} The signed block data.
     */
    async function signBlock({
        secret, key, parent, prev,
    }) {
        const nonce = generateNonce();
        const result = await sign(
            secret,
            Buffer.concat([
                nonce, parent || Buffer.alloc(0), prev || Buffer.alloc(0),
            ]),
        );
        return Buffer.concat([
            nonce,
            fromVarBinary(key),
            result,
        ]);
    }

    /**
     * Given a key, a signature, and a block,
     * determines if the signature is valid and matches the block.
     * @param {Buffer} sig The signature generated when the block was signed.
     * @param {Buffer} key The key to validate.
     * @param {Buffer} parent The parent block to validate.
     * @param {Buffer} prev The prev block to validate.
     * @returns {Promise<boolean>} Whether or not the signature and key are valid for the block.
     */
    async function verifySignedBlock({
        sig, key, parent, prev,
    }) {
        if (!sig) {
            return false;
        }
        const sigData = Buffer.from(sig, constants.format.signature);
        const nonce = sigData.slice(0, constants.size.int64);
        const keyData = toVarBinary(sigData, constants.size.int64);
        const sigKey = keyData.result;
        const signature = sigData.slice(keyData.index);
        const message = Buffer.concat([
            nonce, parent || Buffer.alloc(0), prev || Buffer.alloc(0),
        ]);

        const result = await verify(
            sigKey,
            signature,
            message,
        ) && (!key || Buffer.compare(key, sigKey) === 0);
        return result;
    }

    return {
        encryptData,
        decryptData,
        signBlock,
        verifySignedBlock,
    };
};
