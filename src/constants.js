module.exports = {
    cache: {
        headBlock: 'head block',
        rootBlock: 'root block',
        next: 'next'
    },
    size: {
        int32: 4,
        int64: 8,
        hash: 32
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
    }
};
