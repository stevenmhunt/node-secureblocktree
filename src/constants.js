module.exports = {
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
        zone: 1,
        keys: 2,
    },
    action: {
        read: 1,
        write: 2,
    },
};
