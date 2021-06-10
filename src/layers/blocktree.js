// Blocktree API Level 2 - Blocktree

const constants = require('../constants');
const convert = require('../convert');
const blockchain = require('./blockchain');

function serializeBlockData(btBlockData) {
    const { prev } = btBlockData;
    const data = Buffer.concat([
        // hash size (1 - 256 bytes)
        Buffer.from([Buffer.byteLength(btBlockData.parent) - 1]),
        // previous hash
        btBlockData.parent,
        // data
        btBlockData.data
    ]);
    return { prev, data };
}

function deserializeBlockData(bcBlockData) {
    const { timestamp, prev, nonce, data }= bcBlockData;
    let index = 0;
    const result = { timestamp, prev, nonce };
    const hashSize = data[index++] + 1;
    result.parent = data.slice(index, index + hashSize);
    index += hashSize;
    result.data = data.slice(index);
    return result;
}

module.exports = {
    serializeBlockData,
    deserializeBlockData
};
