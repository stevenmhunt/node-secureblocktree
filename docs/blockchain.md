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