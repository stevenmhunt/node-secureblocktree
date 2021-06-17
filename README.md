# Blocktree
A hierarchical blockchain database for secure storage and auditing.

## Features
- A blockchain implementation utilizing SHA-256 hashes.
- A blocktree, containing an additional parent hash reference per block, allows for a hierarchy of blockchains.
- A fully auditable security layer, built using asymmetric RSA key pairs.

## Goals of the Project
- Create a database for business applications with a strong built-in security design, with a focus on permanent and auditable data storage.
- Leverage the data trust and verification capabilities of public blockchains, while simultaneously securing sensitive information.
- Implement a viable *Proof of Stake* model geared towards business applications as opposed to the CPU-intensive *Proof of Work* model employed for crypto-currencies.

## Layers
In order to allow developers to utilize different feature sets within the database, facilitate a clearer separation of concerns within the architecture, and allow for straightforward integration into existing blockchain systems, the design of the database system is in layers much like the OSI networking model, with the first layer consisting of a conventional blockchain.

### Layer 1 - Blockchain
Provides a implementation for chained blocks using SHA-256 hashes.

#### Key Concepts
- *blockchain* - A series of blocks, which are linked together by the SHA-256 hash values of their respective data. Since changing the data in the block means changing the hash too, this data structure prevents direct tampering of the information contained within the blocks.
- *block* - A single "link" in the blockchain, contains data and points to the previous block in the chain using a SHA-256 hash.
- *prev* - A reference to the previous block in the chain.
- *head* - The block at the "front" of the blockchain; this is the block where a new block where be added to.
- *root* - The first block in the blockchain.

#### Block Format
- [64 bits] Sequence Number (1 - n)
- [256 bits] Previous Hash (block chain referencce)
- [64 bits] Crytographically random nonce
- [64 bits] Timestamp (UTC millisecond epoch time)
- [.........] Data (Layer 2 and above)

#### Supported Operations

##### readBlock (block)
Given a block hash, reads from storage and returns a *blockchain object*.

##### readRawBlock (block)
Given a block hash, returns the raw bytes for that block.

##### readBlockBytes (bytes)
Given a raw block, deserializes it into a *blockchain object*.

##### writeBlock (bcBlockData)
Given a *blockchain object*, writes it to the blockchain if it passes validation. The *sequence*, *timestamp*, and *nonce* values are generated automatically.

##### listBlocks (partial)
Retrieves all blocks, or only those which "start with" the partial hash if provided.

##### countBlocks
Retrieves a count of the total number of blocks in the system.

##### findInBlocks (predicate)
Searches through all blocks in the system until a block matching the predicate is located.

##### findAllInBlocks (predicate)
Searches through all blocks in the system and returns a set of *blockchain objects* which match the predicate.

##### mapInBlocks (selector)
Iterates through all blocks in the system and applies the selector function in order to generate an array of transformed data.

##### getHeadBlock (block)
Given a block, locates the "head" block in the blockchain.

##### getRootBlock (block)
Given a block, locates the "root" block in the blockchain.

##### getNextBlock (block)
Given a block, locates the next block in the blockchain, if it exists.

##### validateBlockchain (block)
Starting from the provided block, scans through the blockchain to ensure that all blocks are valid.

**Note:** In order to support an entire blocktree, the blockchain implementation must allow for more than one block where *prev* is null.

### Layer 2 - Blocktree
Adds an additional reference to a "parent" block to every block, which allows for additional tree-based functionality. Also, any blocks generated within this layer or higher will have a "layer" value set to them, so that each layer can make appropriate validation decisions when reading and writing blocks.

#### Key Concepts
- *blocktree* - A tree-like structure, where each node in the tree is a blockchain. In order to maintain data integrity, all blocks in a given blocktree have a reference to the parent block.
- *parent* - A reference to the parent block in the blocktree.
- *parent scan* - A procedure which reads the specified block as well as all parent blocks until the root of the blocktree is reached.
- *child scan* - A procedure which identifies the root block of all child blockchains belonging the specified block.

#### Block Format
- [.........] Layer 1 Data
- [256 bits] Parent Hash (block tree reference)
- [8 bits] Layer number of the contained data
- [.........] Data (Layer 3 and above)

#### Supported Operations

##### readBlock (block)
Given a block hash, reads from storage and returns a *blocktree object*.

        writeBlock,
        readBlockBytes,
        readRawBlock,
        listBlocks,
        countBlocks,
        findInBlocks,
        mapInBlocks,
        performParentScan,
        performChildScan,
        getHeadBlock,
        getRootBlock,
        getParentBlock,
        getNextBlock,
        validateBlocktree,

### Layer 3 - Secure Blockchain

#### Key Concepts
- *actor* - A user or computer performing actions against the system.
- *action* - An activity performed by an actor within the system, typically *read* or *write*.
- *key* - Refers to either a public key (encrypting, verifying signatures) or private key (decrypting, signing data).
- *read key* - A key which is used to encrypt stored data, so that the key is required in order to read it. If any actors other than the creator of the data require access, then the private key must be encrypted using the parent's public key and written to a keystore.
- *write key* - A key which is used to digitally sign a block in order to verify the authenticity of it.
- *signature* - A digital signature, generated using a private key. Typically, signatures are created using a *write key*.
- *zone* - Represents a container of permissions in the blocktree, and controls the scope of a key's ability to perform actions. It is also a block type.
- *identity* - Represents a specific actor (user, computer, etc.) who has some sort of interaction with the system. It is also a block type.
- *ledger* - Represents a traditional blockchain which exists in the context of the permission model. Ledgers are intended to be used for storing application records data.
- *keys (block)* - A block type designed to store public keys and certificates, as well as encrypted keystores. It also records which actions a key can perform and controls the timeframe that a key is valid for use.
- *trust* - Allows an identity or zone to perform an action on an object that it would not normally have permission to do so on.
- *trusted read* - A procedure where, if allowed by a trust, encrypted block data is temporarily decrypted using the relevant private key from a keystore, and recrypted using the public key of the trusted object's key before being transmitted. This allows for trusted identities and zones to read encrypted blocks without having direct access to a private key.
- *key scan* - A procedure which reads the specified blockchain as well as all parents, looking for all available public keys.
- *key seek* - A procedure which reads the specified blobkchain and all parents until the specified key is found.
- *root block* - The only block in the blocktree without a parent; sets the root key for the system.
- *root zone* - The top-level zone where all other blocks exist in a secure blocktree. This block is the only child block of the root block.
- *root key* - The private key from which all other keys and permissions derive. This key is required for initializing the system, and afterward should be secured in an offline location. After installation, the only reason to use the key would be to revoke and re-key the root zone in the event of an emergency.