# Smart Contract Security Teaching Fixtures

> **DISCLAIMER:** These contracts are intentionally insecure teaching and regression fixtures modeled after the Smart Contract Weakness Classification (SWC Registry). They are strictly intended for automated local sandbox regression testing within AuditAgent. **DO NOT DEPLOY TO PRODUCTION OR PUBLIC BLOCKCHAINS.**

## Contracts Overview

| Contract | SWC ID | Vulnerability Category | Insecure Pattern | Remediated Pattern |
| :--- | :--- | :--- | :--- | :--- |
| `ReentrancyBank.sol` | SWC-107 | Reentrancy | State updated after low-level external call | Checks-Effects-Interactions (CEI) & `ReentrancyGuard` |
| `AccessControlVault.sol` | SWC-105 | Missing Access Control | Unprotected withdrawal function callable by anyone | `onlyOwner` modifier or OpenZeppelin `AccessControl` |
| `UncheckedCall.sol` | SWC-104 | Unchecked Call Return Value | Return status of `.call()` discarded without verification | `require(success, "Call failed")` or SafeTransfer |
