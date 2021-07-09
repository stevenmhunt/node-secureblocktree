# Blocktree
A hierarchical blockchain database for secure storage and auditing of business data.

## Features
- A blockchain implementation utilizing SHA-256 hashes.
- A blocktree, containing an additional parent hash reference per block, which allows for a hierarchy of blockchains.
- A fully auditable and configurable security layer, built using asymmetric RSA key pairs.

## Goals of the Project
- Create a database for business applications with a strong security focus, for the purpose of storing critical data which requires auditing and must not change once written.
- Leverage the data trust and verification capabilities of public blockchains, while simultaneously securing sensitive information.
- Implement a viable *Proof of Stake* model geared towards business applications as opposed to the CPU-intensive *Proof of Work* model employed for crypto-currencies.

## Layers
In order to allow developers to utilize different feature sets within the system, facilitate a clearer separation of concerns within the architecture, and allow for straightforward integration into existing blockchain systems, the design of the database system is in layers:

- [Layer 1 - Blockchain](./docs/blockchain.md)
- [Layer 2 - Blocktree](./docs/blocktree.md)
- [Layer 3 - Secure Blocktree](./docs/secure-blocktree.md)

## Future Plans
- Implement a CLI and server daemon.
- Implement clients in multiple langauges.
- Consider re-writing core engine in C++ or some other high-performance langauge.
