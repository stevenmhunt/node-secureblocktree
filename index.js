const rlp = require('readline');

const rl = rlp.createInterface({
        input: process.stdin,
        output: process.stdout

});

function ask() {
    return new Promise((resolve, reject) => {
        rl.question('> ', (input) => resolve(input));
    });
}

(async function main() {
    while (true) {
        const cmd = await ask();
    }
}());
