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
        keys: 1,
        options: 2,
        zone: 3,
        identity: 4,
        collection: 5,
        record: 6,
    },
    secureBlockData: {
        null: 0,
        unencrypted: 1,
        encrypted: 2,
    },
    action: {
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
    [constants.blockType.keys]: [
        constants.blockType.zone,
        constants.blockType.identity,
        constants.blockType.collection],
    [constants.blockType.zone]: [constants.blockType.zone],
    [constants.blockType.options]: Object.values(constants.blockType),
    [constants.blockType.collection]: [
        constants.blockType.zone,
        constants.blockType.identity],
    [constants.blockType.record]: [constants.blockType.collection],
};

module.exports = constants;
