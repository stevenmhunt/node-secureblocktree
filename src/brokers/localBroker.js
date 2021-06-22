const { decrypt, encrypt } = require('../utils/crypto');
const { InvalidKeyError } = require('../errors');

module.export = function localBrokerFactory({ authorizedKeys }) {
    async function buildTrustedSecret({ secret, authorizedKey, trustedKey }) {
        // check if the broker is managing the authorized key.
        const key = authorizedKeys[authorizedKey];
        if (!key) {
            throw new InvalidKeyError({ key: authorizedKey });
        }
        // decrypt the secret using the authorized private key.
        const decrypted = await decrypt(key, secret);
        // re-encrypt the data using the trusted public key.
        return encrypt(trustedKey, decrypted);
    }
    module.exports = {
        buildTrustedSecret,
    };
};
