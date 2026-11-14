# Shared Rust Core and Platform Boundaries

**Status:** Architecture specification and migration map. `core/synapse-core/` is the Single Source of Truth (SSOT) for domain models, business logic calculations, and SQLite persistence.

## Crate Scope & Unified Architecture

The shared crate is `core/synapse-core/`. Its architecture encompasses:

- `src/db/`: SQLite connection, WAL configuration, schema migrations, and type-safe repository queries (centralizing all SQL queries to eliminate duplicate raw SQL in C++ and Tauri).
- `src/domain/` (or domain submodules): Canonical domain entities, business calculations, and algorithmic rules (finance balance deltas, habit streaks, quiz validation & scoring, flashcard queues, and soft-delete cascades).
- `src/crypto/`: Password-derived keys (PBKDF2-HMAC-SHA256), AES-GCM envelopes, and ENC1 chunked file operations.
- `src/fsrs/`: Spaced-repetition FSRS engine and review scheduling.
- `src/video/`: Encrypted video reading support for libmpv callbacks.

Check the directory contents before relying on a module inventory. As part of the unified core consolidation, legacy raw-SQL queries in C++ controllers and Tauri commands are systematically migrated into `synapse-core`.

## App and Bridge Boundaries

| Consumer | Binding | Unified responsibility |
| --- | --- | --- |
| Qt Desktop | `bridges/bridge-qt/` | High-level typed domain C ABI for Qt/C++ controllers; eliminates raw SQL execution in C++ |
| Android | `bridges/bridge-uniffi/` | UniFFI bindings exposing typed domain models and repositories to Kotlin ViewModels |
| Web | `bridges/bridge-wasm/` | WebAssembly adapter for pure Rust domain algorithms and cryptographic operations |
| Tauri | `apps/web-react/src-tauri/` | Direct Rust dependency; commands act as thin pass-through wrappers calling `synapse-core` |

A Rust function existing in the core does not imply that every client uses it. Verify each call site and its error handling.

## Cryptographic Constraints

The current local vault uses PBKDF2-HMAC-SHA256 with 600,000 iterations and an existing fixed compatibility salt. Module keys use AES-GCM envelopes. The ENC1 media format uses a 16-byte header and 1 MiB chunks with fresh nonces and authentication tags. The header itself is not authenticated.

The [native encryption audit](../security/native-encryption-audit.md) is the source of truth for coverage, recovery behavior, and open risks. Do not treat this architecture note as evidence of complete E2EE or complete memory zeroization.

## Verification

For focused crate checks, use the commands in [the testing guide](../TESTES.md). Avoid undocumented target support or performance claims unless a build and benchmark have been run for that target.
