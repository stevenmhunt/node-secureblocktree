const { decrypt, encrypt } = require('../utils/crypto');
const { InvalidKeyError } = require('../errors');

/**
 * Creates an in-memory encrypted trusted secrets broker.
 */
module.export = function inMemoryBrokerFactory() {
    /**
     * The authorized keys being managed by the broker.
     * Note: this is a simple implementation which places private keys directly into
     * unencrypted memory. This is not the most secure implementation of this pattern.
     */
    const authorizedKeys = {};

    /**
     * Adds an authorized key to the broker.
     * @param {Buffer} publicKey The public key.
     * @param {Buffer} privateKey The private key.
     * @returns {Promise}
     */
    async function addAuthorizedKey(publicKey, privateKey) {
        authorizedKeys[publicKey.toString('base64')] = privateKey;
    }

    /**
     * Revokes an authorized key from the broker.
     * @param {Buffer} publicKey The public key to revoke.
     * @returns {Promise}
     */
    async function revokeAuthorizedKey(publicKey) {
        delete authorizedKeys[publicKey.toString('base64')];
    }

    /**
     * Given a secret, uses the authorized key to decrypt it and then re-encrypts the
     * data using the trusted key. This brokering process is used for performing trusted reads.
     * @param {Buffer} secret The secret to convert into a trusted secret.
     * @param {Buffer} authorizedKey The public key of the pair used to encrypt.
     * @param {Buffer} trustedKey The public key to re-encrypt the data with.
     * @returns {Promise<Buffer>} The re-encrypted data.
     */
    async function buildTrustedSecret({ secret, authorizedKey, trustedKey }) {
        // check if the broker is managing the authorized key.
        const privateKey = authorizedKeys[authorizedKey];
        if (!privateKey) {
            throw new InvalidKeyError({ key: authorizedKey });
        }
        // decrypt the secret using the authorized private key.
        const decrypted = await decrypt(privateKey, secret);
        // re-encrypt the data using the trusted public key.
        return encrypt(trustedKey, decrypted);
    }

    module.exports = {
        buildTrustedSecret,
        addAuthorizedKey,
        revokeAuthorizedKey,
    };
};
