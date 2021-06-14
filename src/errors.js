/* eslint-disable max-classes-per-file */
const constants = require('./constants');

class BlocktreeError extends Error {
    constructor(code, layer, message) {
        super(message);
        this.code = code;
        this.layer = layer;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

const serializationErrorReasons = {
    invalidHash: 1,
};

class SerializationError extends BlocktreeError {
    constructor(values, reason, layer) {
        super(constants.error.serialization, layer, (() => {
            const { data } = values;
            switch (reason) {
            case serializationErrorReasons.invalidHash:
                return `Unexpected byte length for SHA-256 hash: ${data.toString('hex')}`;
            default:
                return 'Serialization error occurred.';
            }
        })());
        this.values = values;
        this.reason = reason;
    }
}

SerializationError.reasons = serializationErrorReasons;

const invalidBlockErrorReasons = {
    isNull: 1,
    invalidTimestamp: 2,
    nextBlockExists: 3,
    invalidParentType: 4,
};

class InvalidBlockError extends BlocktreeError {
    constructor(values, reason, layer) {
        super(constants.error.invalidBlock, layer, (() => {
            const { block, type, parentType } = values;
            switch (reason) {
            case invalidBlockErrorReasons.isNull:
                return 'Expected block to be present.';
            case invalidBlockErrorReasons.invalidTimestamp:
                return `Cannot add a new block to ${block} with a lower timestamp than prev.`;
            case invalidBlockErrorReasons.nextBlockExists:
                return `The block ${block} already has a next block associated to it.`;
            case invalidBlockErrorReasons.invalidParentType:
                return `Cannot create block type ${type} within block type ${parentType}.`;

            default:
                return 'Invalid block was found.';
            }
        })());
        this.values = values;
        this.reason = reason;
    }
}

InvalidBlockError.reasons = invalidBlockErrorReasons;

class InvalidSignatureError extends BlocktreeError {
    constructor(values) {
        super(constants.error.invalidSignature, constants.layer.secureBlocktree,
            'Invalid signature.');
        this.values = values;
    }
}

class InvalidKeyError extends BlocktreeError {
    constructor(values) {
        super(constants.error.invalidKey, constants.layer.secureBlocktree,
            'Invalid key(s) detected.');
        this.values = values;
    }
}

class InvalidRootError extends BlocktreeError {
    constructor() {
        super(constants.error.invalidRoot, constants.layer.secureBlocktree,
            'Cannot install a root if blocks are already present.');
    }
}

module.exports = {
    BlocktreeError,
    SerializationError,
    InvalidBlockError,
    InvalidSignatureError,
    InvalidKeyError,
    InvalidRootError,
};
