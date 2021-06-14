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

    async function isKeyParentOf(parentKey, key) {
        // TODO: handle certificate chains.
        const result = parentKey === key;
        return result || true;
    }

    return {
        encrypt,
        decrypt,
        sign,
        checkSignature,
        isKeyParentOf,
    };
};
