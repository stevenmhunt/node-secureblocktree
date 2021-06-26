const {
    decrypt, encrypt, generateNonce, verify,
} = require('../utils/crypto');
const { InvalidKeyError, InvalidSignatureError } = require('../errors');

/**
 * Creates an in-memory encrypted trusted secrets broker.
 */
module.exports = function inMemoryBrokerFactory() {
    /**
     * The authorized keys being managed by the broker.
     * Note: this is a simple implementation which places private keys directly into
     * unencrypted memory. This is not the most secure implementation of this pattern.
     */
    const authorizedKeys = {};

    /**
     * The request tokens which are ready to be used.
     * Note: this is a simple implementation which places private keys directly into
     * unencrypted memory. This is not the most secure implementation of this pattern.
     */
    const tokens = {};

    /**
     * Generates a broker request token.
     * @param {Buffer} trustedKey The public key of the key pair that will be trusted.
     * @returns {Promise<Buffer>} The request token.
     */
    async function generateRequestToken({ trustedKey }) {
        const token = generateNonce();
        tokens[token.toString('base64')] = trustedKey;
        return token;
    }

    /**
     * Adds an authorized key to the broker.
     * @param {Buffer} publicKey The public key.
     * @param {Buffer} privateKey The private key.
     * @returns {Promise}
     */
    async function addAuthorizedKey({ publicKey, privateKey }) {
        authorizedKeys[publicKey.toString('base64')] = privateKey;
    }

    /**
     * Revokes an authorized key from the broker.
     * @param {Buffer} publicKey The public key to revoke.
     * @returns {Promise}
     */
    async function revokeAuthorizedKey({ publicKey }) {
        delete authorizedKeys[publicKey.toString('base64')];
    }

    /**
     * Given a secret, uses the authorized key to decrypt it and then re-encrypts the
     * data using the trusted key. This brokering process is used for performing trusted reads.
     * @param {Buffer} token The request token.
     * @param {Buffer} sig The request token, signed by the trusted key.
     * @param {Array<Buffer>} secrets The secrets to convert into trusted secrets.
     * @param {Buffer} authorizedKey The public key of the pair used to encrypt.
     * @param {Buffer} trustedKey The public key to re-encrypt the data with.
     * @returns {Promise<Buffer>} The re-encrypted data.
     */
    async function buildTrustedSecrets({
        token, sig, secrets, authorizedKey, trustedKey,
    }) {
        // check if the broker is managing the authorized key.
        const privateKey = authorizedKeys[authorizedKey.toString('base64')];
        if (!privateKey) {
            throw new InvalidKeyError({ key: authorizedKey });
        }

        // check the signature and request token.
        if (!sig || !token) {
            throw new InvalidSignatureError({ sig },
                InvalidSignatureError.reasons.notFound);
        }
        if (!(await verify(trustedKey, sig, token))
            || !tokens[token.toString('base64')]
            || Buffer.compare(tokens[token.toString('base64')], trustedKey) !== 0) {
            throw new InvalidSignatureError({ sig },
                InvalidSignatureError.reasons.doesNotMatch);
        }

        return Promise.all(secrets.map(async (secret) => {
            // decrypt the secret using the authorized private key.
            const decrypted = await decrypt(privateKey, secret);
            // re-encrypt the data using the trusted public key.
            return encrypt(trustedKey, decrypted);
        }));
    }

    return {
        generateRequestToken,
        buildTrustedSecrets,
        addAuthorizedKey,
        revokeAuthorizedKey,
    };
};
