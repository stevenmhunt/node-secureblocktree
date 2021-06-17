const constants = {
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
        key: 'hex',
    },
    block: {
        zero: Buffer.alloc(32),
        hash: 'sha256',
    },
    blockType: {
        zone: 1,
        keys: 2,
        options: 3,
        identity: 4,
        ledger: 5,
        log: 6,
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
    [constants.blockType.zone]: [constants.blockType.zone],
    [constants.blockType.keys]: [constants.blockType.zone],
    [constants.blockType.options]: [constants.blockType.zone],
};

module.exports = constants;
