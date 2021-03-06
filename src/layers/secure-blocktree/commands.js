/**
 * Secure Blocktree Commands API.
 */
module.exports = function secureBlockTreeCommandsFactory({
    context, blocktree,
}) {
    /**
     * Handles CLI requests.
     * @param {object} env The CLI environment context.
     * @param {string} command The command to execute.
     * @param {Array} parameters The command parameters.
     * @returns {Promise<boolean>} Whether or not the command was handled.
     */
    async function handleCommand(env, command, parameters) {
        switch (command) {
        case 'install-root': {
            /* const rootWriteKey = 'bbbb';
            const rootKey = {
                [constants.action.read]: ['aaaa'],
                [constants.action.write]: ['bbbb'],
            };
            const rootZoneKey = {
                [constants.action.read]: ['cccc'],
                [constants.action.write]: ['dddd'],
            };
            const signAsRoot = ({ parent, prev }) => context.signBlock({
                key: rootWriteKey,
                parent,
                prev,
            });
            await env.println(await context.installRoot({ rootKey, rootZoneKey, signAsRoot })); */
            return true;
        }
        case 'read-secure-block': {
            await env.resolveBlock(parameters[0], blocktree.listBlocks, async (block) => {
                await env.println(await context.readSecureBlock(block));
            });
            return true;
        }
        case 'key-scan': {
            await env.resolveBlock(parameters[0], blocktree.listBlocks, async (block) => {
                await env.println(await context.performKeyScan({ block, isRecursive: true }));
            });
            return true;
        }
        default:
            return false;
        }
    }

    return {
        handleCommand,
    };
};
