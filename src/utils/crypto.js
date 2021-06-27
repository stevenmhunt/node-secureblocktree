const crypto = require('crypto');
const { promisify } = require('util');
const constants = require('../constants');
const { fromInt16, toInt16 } = require('./convert');

const generateKeyPairRSA = promisify(crypto.generateKeyPair);

async function generateKeyPair() {
    return generateKeyPairRSA('rsa', {
        modulusLength: constants.crypto.rsaKeySize,
        publicKeyEncoding: {
            type: 'pkcs1',
            format: 'pem',
        },
    });
}

async function cipher(key, data) {
    const iv = crypto.randomBytes(constants.crypto.ivSize);
    const theCipher = crypto.createCipheriv(constants.crypto.aesType, key, iv);
    return Buffer.concat([
        iv,
        theCipher.update(data),
        theCipher.final(),
    ]);
}

async function decipher(key, encryptedData) {
    if (!encryptedData) {
        return null;
    }
    const iv = encryptedData.slice(0, constants.crypto.aesKeySize);
    const data = encryptedData.slice(constants.crypto.aesKeySize);
    const theDecipher = crypto.createDecipheriv(constants.crypto.aesType, key, iv);
    return Buffer.concat([
        theDecipher.update(data),
        theDecipher.final(),
    ]);
}

async function publicEncrypt(publicKey, data) {
    return crypto.publicEncrypt({
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
    }, data);
}

async function privateDecrypt(privateKey, encryptedData) {
    return crypto.privateDecrypt({
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
    }, encryptedData);
}

async function encrypt(publicKey, data) {
    const key = crypto.randomBytes(32);
    const encryptedKey = await publicEncrypt(publicKey, key);
    const encryptedData = await cipher(key, data);
    return Buffer.concat([
        fromInt16(Buffer.byteLength(encryptedKey)),
        encryptedKey,
        encryptedData,
    ]);
}

async function decrypt(privateKey, encrypted) {
    let index = 0;
    const keyLength = toInt16(encrypted, 0);
    index += constants.size.int16;

    const encryptedKey = encrypted.slice(index, index + keyLength);
    index += keyLength;

    const encryptedData = encrypted.slice(index);

    const key = await privateDecrypt(privateKey, encryptedKey);
    const data = await decipher(key, encryptedData);
    return data;
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
 * @param {Buffer} value
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
    cipher,
    decipher,
    encrypt,
    decrypt,
    sign,
    verify,
    generateHash,
    generateNonce,
};
