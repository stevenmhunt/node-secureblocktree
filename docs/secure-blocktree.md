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
- *collection* - Represents a traditional blockchain which exists in the context of the permission model. Collections are intended to be used for storing application records data.
- *keys (block)* - A block type designed to store public keys and certificates, as well as encrypted keystores. It also records which actions a key can perform and controls the timeframe that a key is valid for use.
- *trust* - Allows an identity or zone to perform an action on an object that it would not normally have permission to do so on.
- *trusted read* - A procedure where, if allowed by a trust, encrypted block data is temporarily decrypted using the relevant private key from a keystore, and recrypted using the public key of the trusted object's key before being transmitted. This allows for trusted identities and zones to read encrypted blocks without having direct access to a private key.
- *key scan* - A procedure which reads the specified blockchain as well as all parents, looking for all available public keys.
- *key seek* - A procedure which reads the specified blobkchain and all parents until the specified key is found.
- *root block* - The only block in the blocktree without a parent; sets the root key for the system.
- *root zone* - The top-level zone where all other blocks exist in a secure blocktree. This block is the only child block of the root block.
- *root key* - The private key from which all other keys and permissions derive. This key is required for initializing the system, and afterward should be secured in an offline location. After installation, the only reason to use the key would be to revoke and re-key the root zone in the event of an emergency.