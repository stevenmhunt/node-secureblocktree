const serialization = require('./serialization');

const sbtEncryptionFactory = require('./encryption');
const sbtBlocksFactory = require('./blocks');
const sbtKeysFactory = require('./keys');
const sbtSignaturesFactory = require('./signatures');
const sbtBlockTypesFactory = require('./blockTypes');
const sbtInstallFactory = require('./install');
const sbtCommandsFactory = require('./commands');

/**
 * Blocktree Layer 3 - Secure Blocktree
 */
module.exports = function secureBlocktreeLayerFactory({
    blocktree, secureCache, os, encryption,
}) {
    let context = sbtEncryptionFactory({ encryption });
    context = { ...context, ...sbtBlocksFactory({ blocktree, serialization }) };
    context = {
        ...context,
        ...sbtKeysFactory({ os, context, blocktree }),
    };
    context = { ...context, ...sbtSignaturesFactory({ context }) };
    context = { ...context, ...sbtBlockTypesFactory({ context, blocktree }) };
    context = { ...context, ...sbtInstallFactory({ context, blocktree, secureCache }) };
    context = { ...context, ...sbtCommandsFactory({ context, blocktree }) };

    return context;
};
