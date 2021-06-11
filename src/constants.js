module.exports = {
    cache: {
        headBlock: 'head block',
        rootBlock: 'root block',
        next: 'next'
    },
    secureCache: {
        rootBlock: 'root block',
        rootZone: 'root zone'
    },
    size: {
        int32: 4,
        int64: 8,
        hash: 32
    },
    min: {
        timestamp: 0n
    },
    max: {
        timestamp: 2n ** 64n - 1n
    },
    validation: {
        missingBlock: 'missing block',
        missingParentBlock: 'missing parent block'
    },
    format: {
        hash: 'hex'
    },
    block: {
        zero: Buffer.alloc(32),
        hash: 'sha256'
    },
    blockType: {
        zone: 1,
        keys: 2,
    },
    action: {
        read: 'read',
        write: 'write',
        exportKey: 'exportKey'
    }
};
