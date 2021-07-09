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

#### writeBlock (block)
Given a *blocktree object*, writes it to the blocktree if it passes validation.

#### readBlockBytes (bytes)
Given a raw block, deserializes it into a *blocktree object*.

#### readRawBlock (block)
Given a block hash, returns the raw bytes for that block.

#### listBlocks

#### countBlocks

#### findInBlocks

#### mapInBlocks

#### performParentScan (block)
Retrieves a list of all parents until the root is reached.

#### performChildScan (block)
Retrieves a list of all child blocks (non-recursive).

#### getHeadBlock

#### getRootBlock

#### getParentBlock

#### getNextBlock

#### validateBlocktree