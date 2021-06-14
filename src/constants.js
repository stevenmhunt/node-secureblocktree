const constants = {
    cache: {
        headBlock: 'head block',
        rootBlock: 'root block',
        next: 'next',
    },
    secureCache: {
        rootBlock: 'root block',
        rootZone: 'root zone',
    },
    size: {
        int32: 4,
        int64: 8,
        hash: 32,
        signature: 32,
    },
    timestamp: {
        min: -(2n ** 63n),
        zero: 0n,
        max: 2n ** 63n - 1n,
    },
    validation: {
        missingBlock: 'missing block',
        missingParentBlock: 'missing parent block',
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
        record: 0,
        zone: 1,
        identity: 2,
        keys: 3,
        ledger: 4,
        log: 5,
        option: 6,
    },
    action: {
        read: 1,
        write: 2,
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
};

module.exports = constants;
