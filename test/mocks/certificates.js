const xor = require('buffer-xor');

module.exports = function certificatesFactory() {
    async function encrypt(key, data) {
        return xor(data, key);
    }

    async function decrypt(key, encryptedData) {
        return xor(encryptedData, key);
    }

    async function sign(key, data) {
        return encrypt(key, data);
    }

    async function checkSignature(key, sig) {
        return decrypt(key, sig);
    }

    return {
        encrypt,
        decrypt,
        sign,
        checkSignature,
    };
};
