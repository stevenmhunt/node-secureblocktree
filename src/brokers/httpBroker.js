const axios = require('axios');
const { encrypt, sign, generateNonce } = require('../utils/crypto');
const { fromInt16 } = require('../utils/convert');

/**
 * Creates a connection to an HTTP-based trusted secrets broker.
 * @param url {string} The base URL to use when connecting to the broker (HTTPS recommended)
 * @param clientSecret {string} The key to use for authentication to the broker.
 * @param clientPrivateKey {Buffer} (Optional) The client's private key for signing requests.
 * @param serverPublicKey {Buffer} (Optional) The server's public key for encrypting data.
 * @param httpClientOptions {Object} (Optional) Custom settings for the HTTP client.
 */
module.export = function httpBrokerFactory({
    url, clientSecret, clientPrivateKey, serverPublicKey, httpClientOptions,
}) {
    /**
     * The Axios instance used for all HTTP-based communications with the broker.
     */
    const instance = axios.create({
        ...(httpClientOptions || {}),
        ...{
            baseURL: url,
            headers: {
                ...((httpClientOptions || {}).headers || {}),
                ...{ 'X-API-Key': clientSecret },
            },
        },
    });

    /**
     * @private
     * Constructs the request data to send to the broker.
     * @param {*} data
     */
    async function buildSecureRequest(data) {
        const nonce = generateNonce();
        const dataToSend = Buffer.from(JSON.stringify(data), 'utf-8');

        // Using pre-negotiated public and private keys to comunicate with the broker
        // as additional security above TLS is highly recommended.
        const sig = clientPrivateKey ? await sign(clientPrivateKey, Buffer.concat([
            nonce,
            Buffer.from(clientSecret, 'base64'),
        ])) : Buffer.alloc(0);

        const unencryptedResult = Buffer.concat([
            nonce,
            fromInt16(Buffer.byteLength(sig)),
            sig,
            dataToSend,
        ]);

        if (serverPublicKey) {
            return (await encrypt(serverPublicKey, unencryptedResult)).toString('base64');
        }
        return unencryptedResult.toString('base64');
    }

    /**
     * Adds an authorized key to the broker.
     * @param {Buffer} publicKey The public key.
     * @param {Buffer} privateKey The private key.
     * @returns {Promise}
     */
    async function addAuthorizedKey(publicKey, privateKey) {
        const req = await buildSecureRequest({
            publicKey, privateKey,
        });
        await instance.post('authorizedKeys', req);
    }

    /**
     * Revokes an authorized key from the broker.
     * @param {Buffer} publicKey The public key to revoke.
     * @returns {Promise}
     */
    async function revokeAuthorizedKey(publicKey) {
        const req = await buildSecureRequest({ publicKey });
        await instance.post('revokedKeys', req);
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
        const req = await buildSecureRequest({ secret, authorizedKey, trustedKey });
        const { data } = await instance.post('trustedSecrets', req);
        return Buffer.from(data, 'base64');
    }

    module.exports = {
        buildTrustedSecret,
        addAuthorizedKey,
        revokeAuthorizedKey,
    };
};
