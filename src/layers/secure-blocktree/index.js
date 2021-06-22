const serialization = require('./serialization');

const sbtEncryptionFactory = require('./encryption');
const sbtBlocksFactory = require('./blocks');
const sbtKeysFactory = require('./keys');
const sbtSecretsFactory = require('./secrets');
const sbtSignaturesFactory = require('./signatures');
const sbtDataFactory = require('./data');
const sbtBlockTypesFactory = require('./blockTypes');
const sbtCommandsFactory = require('./commands');

/**
 * Blocktree Layer 3 - Secure Blocktree
 */
module.exports = function secureBlocktreeLayerFactory({
    blocktree, secureCache, time,
}) {
    let context = sbtEncryptionFactory();
    context = { ...context, ...sbtBlocksFactory({ blocktree, serialization }) };
    context = { ...context, ...sbtKeysFactory({ time, context, blocktree }) };
    context = { ...context, ...sbtSecretsFactory({ time, context, blocktree }) };
    context = { ...context, ...sbtSignaturesFactory({ context }) };
    context = { ...context, ...sbtDataFactory({ context }) };
    context = { ...context, ...sbtBlockTypesFactory({ context, blocktree, secureCache }) };
    context = { ...context, ...sbtCommandsFactory({ context, blocktree }) };

    return context;
};
