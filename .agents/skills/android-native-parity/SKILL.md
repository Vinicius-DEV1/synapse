---
name: android-native-parity
description: Implement and review native Kotlin/Jetpack Compose feature parity through UniFFI and synapse-core, preserving Android conventions, capability limits, and shared behavior.
---

# Native Android Feature Parity

Use this skill when implementing, comparing, reorganizing, or validating a product feature in `apps/mobile-android/`. For cross-client naming and contract mapping, also use [`cross-platform-module-parity`](../cross-platform-module-parity/SKILL.md). The React/Tauri client and Desktop Qt remain separate native clients; the Expo WebView shell hosts React and does not own duplicate product features.

## Client Responsibilities

| Client | Presentation and orchestration | Platform boundary | Shared product rules |
| :--- | :--- | :--- | :--- |
| React Web/Tauri | React components, hooks, stores, services | Browser APIs or thin Tauri Rust commands | Rust Core; WASM where available |
| Desktop Qt | Native QML and thin C++ controllers | `bridge-qt` | Rust Core |
| Native Android | Kotlin/Jetpack Compose and focused ViewModels | Typed UniFFI stores in `bridge-uniffi` | Rust Core |
| Android WebView | Expo shell and native shell integration | WebView bridge and Android shell APIs | Reuse the React product implementation |

Shared behavior means the same domain outcomes, persisted meaning, validation, defaults, and supported user actions. It does not require pixel-identical desktop and mobile layouts. Adapt controls to Android ergonomics while retaining the established product design tokens and documenting intentional differences.

## Implementation Rules

1. Read repository `AGENTS.md`, `apps/mobile-android/AGENTS.md`, the module map in `docs/architecture/module-structure.md`, and the relevant React, Qt, Core, UniFFI, and Android counterparts before changing code. Treat actual implementation and active audit evidence as truth; do not assume roadmap checkboxes are complete.
2. Use canonical module IDs and shared semantic names for screens, operations, payload fields, and test scenarios. Keep Android's idiomatic package roots: `features/<module>/ui/`, plus `viewmodel/`, `data/`, or `model/` only when the responsibility exists. Do not create empty mirrors or wrappers to imitate React or Qt trees.
3. Keep Compose screens focused on rendering and event dispatch. Put screen state and lifecycle orchestration in ViewModels; put shared domain rules, queries, migrations, and persistence in `core/synapse-core/`, exposed by typed `bridges/bridge-uniffi/` APIs. Do not add Room schemas, raw SQLite, or Kotlin copies of Core algorithms.
4. Extend UniFFI contracts with cohesive typed operations and error results. Keep field meaning, validation, defaults, ordering, and failure semantics aligned with the other clients. Add a direct mapping to the module map when Kotlin naming or nullability requires a different symbol.
5. Preserve mobile platform behavior: lifecycle-aware collection and cancellation, configuration-change survival where needed, predictive/system Back handling, edge-to-edge and `WindowInsets` safe areas, IME/keyboard resizing, touch-sized targets, TalkBack semantics, Android document-picker URI permissions, and runtime permission prompts only at the user action that needs them.
6. Respect real Android capability and data-security gaps. Do not make nonfunctional flows appear enabled. In particular, follow `apps/mobile-android/AGENTS.md` and current security docs before adding Vault persistence, account-key migration, sync, encryption claims, diagram writes, video providers, or file ownership assumptions.
7. Keep files cohesive and near the repository's <300-line target. Keep user-visible strings in Android resources, including the supported English defaults and Portuguese translations. Preserve navigation contracts and accessibility labels.
8. Keep React Web/Tauri unchanged when it is the reference unless the user explicitly authorizes a coordination-only naming move. Never copy platform-specific implementation code across clients when a Core operation or native platform API is the correct boundary.

## Review and Verification

- Map each reference behavior to Android: loading, success, empty, validation, error, cancellation, offline, persistence, and navigation/back states. Mark unavailable capabilities as missing or intentionally platform-specific with evidence.
- Compare desktop and mobile at their intended viewport sizes. Check typography, tokens, density, touch targets, keyboard/IME, safe areas, focus, TalkBack, modal/back behavior, and state restoration.
- Add or update focused Kotlin unit, Compose UI, or instrumentation tests for meaningful behavior. Verify generated UniFFI bindings when bridge contracts change.
- Run the narrow Gradle task for changed code, then relevant Rust/UniFFI checks for bridge work. Do not run full global suites during iteration unless requested or required for a release gate.
- Update the module counterpart map when public structure, operations, or intentional differences change. Put active evidence in repository-root `audits/`; consolidate accepted architecture into `docs/` only after the audit is complete.
