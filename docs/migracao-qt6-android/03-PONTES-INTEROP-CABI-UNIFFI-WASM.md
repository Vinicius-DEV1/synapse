# Platform Bridges: C ABI, UniFFI, and WebAssembly

**Status:** This is a map of bridge ownership, not a claim that every Rust capability is integrated into every app.

## Bridge Ownership

| Bridge | Consumer | Source of truth |
| --- | --- | --- |
| Qt C ABI | Qt/C++ desktop | `bridges/bridge-qt/include/synapse_bridge.h` and `bridges/bridge-qt/src/` |
| UniFFI | Kotlin/Compose Android | `bridges/bridge-uniffi/` and generated Android bindings |
| WebAssembly | React Web where enabled | `bridges/bridge-wasm/` and the web adapter under `apps/web-react/src/services/` |

The Rust function signatures and ownership rules in the headers and bridge source are authoritative. Generated bindings are build artifacts and must be regenerated using the current build scripts after interface changes.

## Boundary Rules

- Validate all external strings, paths, sizes, and enum values at the bridge boundary.
- Keep ownership rules explicit: identify who allocates and frees each returned buffer.
- Use the bridge's secret-buffer cleanup functions for sensitive key and plaintext buffers where available.
- Convert panics and Rust errors into explicit result codes or error payloads; do not silently return plaintext after a crypto failure.
- Add focused round-trip, invalid-input, cancellation, and cleanup coverage when changing a bridge.

## Verification

Use the target-specific Cargo commands in [the testing guide](../TESTES.md). Do not infer Android, Qt, or browser support from a successful build of a different bridge.
