const crypto = require('crypto');
const { promisify } = require('util');

const generateKeyPairRSA = promisify(crypto.generateKeyPair);

module.exports = function encryptionFactory() {
    async function generateKeyPair() {
        return generateKeyPairRSA('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'pkcs1',
                format: 'der',
            },
        });
    }

    async function encrypt(publicKey, data) {
        return crypto.publicEncrypt({
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        }, data);
    }

    async function decrypt(privateKey, encryptedData) {
        return crypto.privateDecrypt({
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        }, encryptedData);
    }

    async function sign(privateKey, data) {
        return crypto.sign('sha256', data, {
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        });
    }

    async function verify(publicKey, sig, data) {
        return crypto.verify('sha256', data, {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
            type: 'pkcs1',
            format: 'der',
        }, sig);
    }

    return {
        generateKeyPair,
        encrypt,
        decrypt,
        sign,
        verify,
    };
};
