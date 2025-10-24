# Smart Device Sentinel

Decentralized smart device oversight powered by Stacks blockchain. Guardian Registry enables trusted device management with cryptographic proof of actions, building confidence in connected home automation through immutable ledger technology.

## Purpose

Smart Device Sentinel addresses the growing need for verifiable, trustworthy device behavior tracking in distributed home ecosystems. By leveraging Stacks blockchain, it provides:

- Cryptographically verifiable device event records
- Transparent governance hub management
- Tamper-resistant activity attestations
- Privacy-first design through hash-based proofs

Core capabilities:
- Governance hub enrollment and lifecycle management
- Sentinel device registration and metadata tracking
- Event attestation with cryptographic proof generation
- Immutable record verification and integrity checking

## System Design

Guardian Registry implements a decentralized authority model with core components:

1. **Governance Hubs**: Principal-controlled authorities for managing device ecosystems
2. **Sentinel Devices**: Smart devices registered and tracked within governance domains
3. **Event Attestations**: Time-stamped behavioral proofs stored cryptographically
4. **Verification Layer**: Query and validation mechanisms for proof integrity

```mermaid
graph LR
    A[Governance Hub] -->|Enrolls| B[Guardian Registry]
    B -->|Authorizes| C[Sentinel Devices]
    C -->|Records Events| D[Attestation Ledger]
    D -->|Verifiable via| E[Proof Validation]
```

## Smart Contract Overview

### guardian-registry

Core Clarity contract implementing device governance and event attestation.

#### Data Structures
- `hub-registry`: Principal-keyed enrollment records for governance authorities
- `sentinel-devices`: Multi-key device metadata with owner and identifier components
- `event-attestations`: Time-series event proofs indexed by owner, device, and timestamp
- `device-inventory`: Owner-maintained enumeration of managed devices

#### Authorization Model
- Hub enrollment gates all operations
- Device registration restricted to enrolled hubs
- Event recording requires both hub authority and device registration
- All records immutable upon creation

## Quick Start

### Prerequisites
- Clarinet development environment
- Stacks blockchain wallet
- Understanding of smart device registration concepts

### Installation & Setup

```bash
clarinet integrate
```

### Usage Examples

Enroll a governance hub:
```clarity
(contract-call? .guardian-registry enroll-governance-hub "hub-001-production")
```

Register a sentinel device:
```clarity
(contract-call? .guardian-registry onboard-sentinel-device "sensor-a7" "Living Room Temperature" "environmental-sensor")
```

Record an event attestation:
```clarity
(contract-call? .guardian-registry record-event-attestation "sensor-a7" u1704067200 0x... 0x...)
```

## API Reference

### Hub Management

```clarity
(enroll-governance-hub (hub-id (string-ascii 64))) -> (response bool uint)
```
Establishes a governance hub authority on the registry.

### Device Operations

```clarity
(onboard-sentinel-device (device-id (string-ascii 64)) (readable-name (string-ascii 64)) (device-class (string-ascii 32))) -> (response bool uint)
```
Registers a new device within the authority's governance domain.

### Event Recording

```clarity
(record-event-attestation (device-id (string-ascii 64)) (event-time uint) (behavior-hash (buff 32)) (proof-hash (buff 32))) -> (response bool uint)
```
Commits a cryptographically attested device event to the immutable ledger.

### Query Operations

```clarity
(query-hub-details (hub-owner principal)) -> (optional {hub-identifier, registered-at-block})
(fetch-device-metadata (hub-owner principal) (device-id (string-ascii 64))) -> (optional {human-readable-name, device-classification, registered-at-block})
(retrieve-device-collection (hub-owner principal)) -> (list 100 (string-ascii 64))
(query-event-record (hub-owner principal) (device-id (string-ascii 64)) (event-time uint)) -> (optional {behavior-hash, proof-hash})
```

### Verification & Integrity

```clarity
(validate-proof-integrity (hub-owner principal) (device-id (string-ascii 64)) (event-time uint) (candidate-proof (buff 32))) -> bool
(event-exists-at-coordinates (hub-owner principal) (device-id (string-ascii 64)) (event-time uint)) -> bool
```

## Development & Testing

### Run test suite:
```bash
clarinet test
```

### Interactive development:
```bash
clarinet console
```

## Operational Constraints

- Maximum 100 devices per governance hub principal
- Records are permanent and cannot be revoked or deleted
- Event timeline must maintain chronological integrity for business logic
- All state transitions require valid hub enrollment

## Security & Design Patterns

### On-Chain Privacy
- Device behavior stored only as cryptographic digests
- Activity details remain off-chain, under governance hub control
- Proof validation requires original data knowledge

### Integrity Guarantees
- All operations execute atomically within single block context
- No partial state modifications possible
- Immutable record creation prevents post-facto alterations

### Best Practices for Operators
- Generate deterministic, collision-resistant hashes for behavior proofs
- Maintain secure off-chain event detail repositories
- Implement regular verification cycles for integrity assurance
- Rotate hub credentials according to security policies
- Design hash schemas anticipating future audit requirements