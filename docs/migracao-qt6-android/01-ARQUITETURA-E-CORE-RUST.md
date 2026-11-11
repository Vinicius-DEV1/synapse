# Shared Rust Core and Platform Boundaries

**Status:** Current code map. Shared Rust logic is not yet the sole owner of all product business logic or persistence.

## Current Crate Scope

The shared crate is `core/synapse-core/`. Its source currently includes:

- `src/db/`: SQLite connection and schema migration helpers.
- `src/crypto/`: password-derived keys, AES-GCM helpers, and ENC1 chunked file operations.
- `src/fsrs/`: spaced-repetition calculations.
- `src/video/`: encrypted video reading support.

Check the directory contents before relying on a module inventory. Qt, Tauri, React, and Android still own platform-specific orchestration and parts of module persistence.

## App and Bridge Boundaries

| Consumer | Binding | Current responsibility |
| --- | --- | --- |
| Qt Desktop | `bridges/bridge-qt/` | C ABI for Qt/C++ to call selected Rust database, crypto, media, and FSRS functions |
| Android | `bridges/bridge-uniffi/` | UniFFI bindings for selected Rust APIs |
| Web | `bridges/bridge-wasm/` | WebAssembly adapter for selected pure Rust functions |
| Tauri | `apps/web-react/src-tauri/` | Rust commands and app-specific platform integration |

A Rust function existing in the core does not imply that every client uses it. Verify each call site and its error handling.

## Cryptographic Constraints

The current local vault uses PBKDF2-HMAC-SHA256 with 600,000 iterations and an existing fixed compatibility salt. Module keys use AES-GCM envelopes. The ENC1 media format uses a 16-byte header and 1 MiB chunks with fresh nonces and authentication tags. The header itself is not authenticated.

The [native encryption audit](../security/native-encryption-audit.md) is the source of truth for coverage, recovery behavior, and open risks. Do not treat this architecture note as evidence of complete E2EE or complete memory zeroization.

## Verification

For focused crate checks, use the commands in [the testing guide](../TESTES.md). Avoid undocumented target support or performance claims unless a build and benchmark have been run for that target.
