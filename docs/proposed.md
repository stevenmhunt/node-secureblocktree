
# PROPOSED FUNCTIONALITY:

## Getting Started

```bash
# Step 1: install the package.
npm install -g blocktree-server

# Step 2: initialize a server
blocktree-server init

# Step 3: start the server with your config file.
blocktree-server run mybtserver.yaml
```

## Available Commands

### `blocktree-server init`
Asks a series of questions in order to generate a configuration file used to initialize the database.

### `blocktree-server run <file> [--it]`
Begins running the blocktree based on the settings in the configuration file. Optionally, the server can be run in interactive terminal mode using the `--it` flag to allow for direct access to the command-line interface.

## Command-line Interface

### `pwd`
Outputs the current working directory of the terminal session, usually `/` (which refers to the root zone) by default.

### `cd <path>`
Navigates to the specified path.

### `ls [-l]`
Outputs a listing of all child objects with the current working directory.

### `cat <path>`
Outputs data about a specific block.

### `set <name> = <value>`
Sets a variable within the terminal session.

### `set read_key = <path to key>`
Sets the private key to use for reading blocks.

### `set write_key = <path to key>`
Sets the private key to use for writing blocks.

### `create-root <root key>`
Creates the root block with the specified root key.
Note: this operation is only allowed to occur once, immediately after the database is initialized.

### `create-zone <block> <name>`
Creates a new zone within the specified block. Note: if no other zones exist, then this operation will establish the "root zone".

### `create-identity <block> <name>`
Creates a new identity within the specified block.

### `create-collection <block> name>`
Creates a new collection for storing data on the specified block.

### `add-key <block> <key>`
Adds a key to the specified block.

### `add-secret <block> <secret>`
Adds a secret to the specified block.

### `add-record <block> <data>`
Adds a record to the specified collection.