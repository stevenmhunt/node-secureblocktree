/* eslint-disable global-require */
const constants = require('../../../../constants');

/**
 * A mapping between block types and their respective serialize/deserialize functions.
 */
module.exports = {
    [constants.blockType.keys]: require('./keys'),
    [constants.blockType.options]: require('./options'),
};
