const crypto = require('crypto');
const { promisify } = require('util');
const constants = require('../constants');

const generateKeyPairRSA = promisify(crypto.generateKeyPair);

async function generateKeyPair() {
    return generateKeyPairRSA('rsa', {
        modulusLength: constants.crypto.keysize,
        publicKeyEncoding: {
            type: 'pkcs1',
            format: 'pem',
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
    }, sig);
}

/**
 * Generates hashes for block data.
 * @param {string} value
 */
function generateHash(value) {
    return crypto.createHash(constants.block.hash).update(value).digest();
}

/**
 * Generates a cryptographically random 64 bit integer.
 * @returns {Buffer} A random 64 bit integer.
 */
function generateNonce() {
    return crypto.randomBytes(constants.size.int64);
}

module.exports = {
    generateKeyPair,
    encrypt,
    decrypt,
    sign,
    verify,
    generateHash,
    generateNonce,
};
