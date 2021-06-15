/* eslint-disable max-classes-per-file */
const constants = require('./constants');

/**
 * Base class for all error handling.
 */
class BlocktreeError extends Error {
    /**
     * Constructor.
     * @param {number} code The error code to report.
     * @param {number} layer The layer where the error occurred.
     * @param {string} message The message to display.
     */
    constructor(code, layer, message) {
        super(message);
        this.code = code;
        this.layer = layer;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Reasons for serialization errors.
 */
const serializationErrorReasons = {
    invalidHash: 1,
};

/**
 * Serialization error.
 */
class SerializationError extends BlocktreeError {
    /**
     * Constructor.
     * @param {Object} values Relevant data collected during the error.
     * @param {number} reason The specific reason for the error.
     * @param {number} layer The layer where the error occurred.
     */
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

/**
 * Reasons for invalid block error.
 */
const invalidBlockErrorReasons = {
    isNull: 1,
    invalidTimestamp: 2,
    nextBlockExists: 3,
    invalidParentType: 4,
    invalidParentBlock: 5,
};

/**
 * Invalid block error.
 */
class InvalidBlockError extends BlocktreeError {
    /**
     * Constructor.
     * @param {Object} values Relevant data collected during the error.
     * @param {number} reason The specific reason for the error.
     * @param {number} layer The layer where the error occurred.
     */
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
            case invalidBlockErrorReasons.invalidParentBlock:
                return 'Expected parent block to be present.';
            default:
                return 'Invalid block was found.';
            }
        })());
        this.values = values;
        this.reason = reason;
    }
}

InvalidBlockError.reasons = invalidBlockErrorReasons;

/**
 * Invalid signature error.
 */
class InvalidSignatureError extends BlocktreeError {
    /**
     * Constructor.
     * @param {Object} values Relevant data collected during the error.
     */
    constructor(values) {
        super(constants.error.invalidSignature, constants.layer.secureBlocktree,
            'Invalid signature.');
        this.values = values;
    }
}

/**
 * Invalid key error.
 */
class InvalidKeyError extends BlocktreeError {
    /**
     * Constructor.
     * @param {Object} values Relevant data collected during the error.
     */
    constructor(values) {
        super(constants.error.invalidKey, constants.layer.secureBlocktree,
            'Invalid key(s) detected.');
        this.values = values;
    }
}

/**
 * Invalid root error.
 */
class InvalidRootError extends BlocktreeError {
    /**
     * Constructor.
     */
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
