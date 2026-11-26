---
name: cross-platform-module-parity
description: Align feature structure, names, typed actions, and behavior across React/Tauri, native Qt, and Android Compose while preserving each framework's architecture. Use for cross-client parity, shared-feature refactors, or counterpart mapping; React is immutable when it is the reference target.
---

# Cross-Platform Module Parity

Use this skill when a feature is being compared, added, renamed, refactored, or verified across React/Tauri, Desktop Qt, and native Android. The Android WebView shell hosts React and does not own duplicate product features.

## Required Decisions

1. **Choose the reference and targets.** Follow the user's requested scope. When React is the reference, inspect it first and implement parity in the requested native target. A coordination-only React rename or move is allowed when the user authorizes naming/organization alignment; preserve the web layout, behavior, styles and features and update imports/tests atomically. Distinguish observed behavior from source-only assumptions.
2. **Use canonical module IDs.** Follow [`docs/architecture/module-structure.md`](../../../docs/architecture/module-structure.md). Keep route keys, database IDs, serialized identifiers, and existing IPC contracts stable unless the task includes a reviewed migration.
3. **Build a counterpart map before moving code.** Map the feature's components/screens, orchestration, typed actions/payloads, shared Core calls, and tests across clients. Record missing counterparts and intentional platform differences instead of assuming a name proves parity.
4. **Align logical structure and names.** Use the same feature vocabulary, semantic file/type names, public action names, payload field names, and test scenario names for one-to-one counterparts. Preserve each language's file suffix and necessary type suffix, such as `.tsx`, `.qml`, and `Screen.kt`. Keep the same module-local subdirectory when equivalent responsibilities exist.
5. **Keep physical layout framework-native.** React retains its `components/`, `hooks/`, `services/`, `store/`, and `api/` layers; Qt retains `qml/<module>/`, `src/controllers/<module>/`, and `tests/<module>/`; Compose retains `features/<module>/ui/` and adds ViewModel/data packages only when needed. Do not create empty mirror folders, artificial files, or wrappers solely to make directory trees look identical.
6. **Share domain behavior through Core.** Keep canonical entities, business rules, and persistence in `core/synapse-core/`. Tauri, `bridge-qt`, UniFFI, and WASM are typed adapters. Do not duplicate a Core-owned implementation in matching client files; keep presentation-specific state and rendering in each client.
7. **Keep files atomic.** Each file should have one cohesive reason to change and a clear counterpart when one exists. Split oversized files along real presentation, orchestration, or domain boundaries. Avoid trivial fragments and retain the repository's <300-line target where practical.
8. **Document unavoidable naming differences.** If a language convention or framework API requires a different symbol, add the direct mapping and reason to the module counterpart map. Do not allow action meaning, validation, defaults, or error behavior to drift.
9. **Verify behavior, not filenames.** Run focused tests/build checks for changed clients. Compare success, empty, error, cancellation, keyboard/accessibility, persistence, performance, and visual states appropriate to the feature. Mark parity partial or unverified where runtime evidence is missing.

## Canonical Sources

- Module roots and counterpart map: [`docs/architecture/module-structure.md`](../../../docs/architecture/module-structure.md)
- Project constraints and Core SSOT: [`AGENTS.md`](../../../AGENTS.md)
- Qt-specific implementation and visual workflow: [`desktop-qt-parity`](../desktop-qt-parity/SKILL.md)
- Native Android Compose/UniFFI workflow: [`android-native-parity`](../android-native-parity/SKILL.md)
- Atomic refactoring workflow: [`code-quality-refactoring`](../code-quality-refactoring/SKILL.md)

When a shared path, public action, or intentional client difference changes, update the module structure guide and the owning app guidance in the same logical stage. Keep detailed active findings in `audits/`; move only accepted, durable architecture facts into `docs/`.
