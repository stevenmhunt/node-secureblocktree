/* eslint-disable no-await-in-loop, no-continue */
const rlp = require('readline');

const rl = rlp.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function ask(level) {
    return new Promise((resolve) => {
        const levels = new Array(level + 1).join('...');
        rl.question(`${levels}${level === 0 ? '>' : ''} `, (input) => resolve(input));
    });
}

function parseCommand(cmd) {
    const [command, ...parameters] = cmd.split(' ');
    return {
        command, parameters,
    };
}

function initializeCliEnvironment() {
    const env = {
        level: 0,
        vars: {},
        async resolveBlock(value, listBlocksFn, successFn) {
            const block = await listBlocksFn(value);
            if (block.length === 0) {
                console.log(`Error: no matching block ${value} found.`);
            } else if (block.length === 1) {
                return successFn(block[0]);
            } else {
                console.log(`Multiple matches found:\n${block.join('\n')}\n\nTry your request again with a more specific block value.`);
            }
            return null;
        },
    };

    env.process = function process(data) {
        const items = Array.isArray(data) ? data : [data];
        return items.map((item) => {
            if (item.startsWith('$')) {
                return env.vars[item];
            }
            return item;
        });
    };

    env.handleCommand = function handleCliCommand(command, parameters) {
        switch (command) {
        case 'set': {
            const [name, val] = parameters;
            env.vars[name] = val;
            return true;
        }
        case 'print':
            console.log(parameters[0]);
            return true;
        case '{':
            env.level += 1;
            return true;
        case '}':
            if (env.level > 0) {
                env.level -= 1;
            }
            return true;
        default:
            return false;
        }
    };

    return env;
}

module.exports = async function cliFactory({
    system, blockchain, blocktree, secureBlocktree,
}) {
    const env = initializeCliEnvironment();
    for (;;) {
        const cmd = await ask(env.level);
        if (cmd === 'exit') {
            break;
        }
        const { command, parameters } = parseCommand(cmd);
        const processedParams = env.process(parameters);
        if (await env.handleCommand(command, processedParams)) { continue; }
        if (await system.handleCommand(env, command, processedParams)) { continue; }
        if (await blockchain.handleCommand(env, command, processedParams)) { continue; }
        if (await blocktree.handleCommand(env, command, processedParams)) { continue; }
        if (await secureBlocktree.handleCommand(env, command, processedParams)) { continue; }
        if (command && command.length > 0) {
            console.log(`${command}: command not found.`);
        }
    }
};
