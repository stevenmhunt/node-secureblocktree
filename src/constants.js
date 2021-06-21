const constants = {
    crypto: {
        keysize: 512,
    },
    cache: {
        headBlock: 'head block',
        rootBlock: 'root block',
        next: 'next',
        childBlocks: 'child blocks',
    },
    secureCache: {
        rootBlock: 'root block',
        rootZone: 'root zone',
    },
    size: {
        byte: 1,
        int16: 2,
        int32: 4,
        int64: 8,
        hash: 32,
        signature: 32,
    },
    max: {
        byte: 2 ** 8 - 1,
        int16: 2 ** 16 - 1,
        int32: 2 ** 32 - 1,
        int64: 2n ** 64n - 1n,
    },
    timestamp: {
        zero: 0n,
        max: 2n ** 64n - 1n,
    },
    validation: {
        missingBlock: 'missing block',
        missingParentBlock: 'missing parent block',
        invalidTimestamp: 'invalid timestamp',
        invalidSequence: 'invalid sequence',
    },
    format: {
        hash: 'hex',
        signature: 'hex',
        key: 'utf-8',
    },
    block: {
        zero: Buffer.alloc(32),
        hash: 'sha256',
    },
    key: {
        zero: Buffer.alloc(0),
    },
    blockType: {
        root: 0,
        key: 1,
        trustedKey: 2,
        secret: 3,
        options: 4,
        record: 5,
        zone: 128,
        identity: 129,
        collection: 130,
    },
    keyType: {
        publicKey: 1,
        certificate: 2,
    },
    secureBlockData: {
        null: 0,
        unencrypted: 1,
        encrypted: 2,
    },
    action: {
        any: '*',
        read: 'r',
        write: 'w',
    },
    error: {
        serialization: 1,
        invalidBlock: 2,
        invalidSignature: 3,
        invalidKey: 4,
        invalidRoot: 5,
    },
    layer: {
        system: 0,
        blockchain: 1,
        blocktree: 2,
        secureBlocktree: 3,
    },
};

constants.parentBlockTypes = {
    [constants.blockType.key]: [
        constants.blockType.zone,
        constants.blockType.identity,
        constants.blockType.collection],
    [constants.blockType.secret]: [
        constants.blockType.zone,
        constants.blockType.identity,
        constants.blockType.collection],
    [constants.blockType.zone]: [constants.blockType.zone],
    [constants.blockType.identity]: [constants.blockType.zone],
    [constants.blockType.options]: Object.values(constants.blockType),
    [constants.blockType.collection]: [
        constants.blockType.zone,
        constants.blockType.identity],
    [constants.blockType.record]: [constants.blockType.collection],
};

module.exports = constants;
