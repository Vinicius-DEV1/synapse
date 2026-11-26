# Application Workspace Guidance

The repository has four separately owned application targets anchored by a unified Rust core. Keep application code, assets, manifests, and app-specific build output inside the owning directory. Shared domain logic, data models, repository queries, and persistence belong in `../core/synapse-core/`; platform-specific bindings belong in `../bridges/`.

| App | Stack | Owns |
| --- | --- | --- |
| `web-react/` | React, TypeScript, Vite, Tauri | The original web app and its hybrid Tauri shell; delegates persistence/domain to `synapse-core` |
| `desktop-qt/` | Qt 6, QML, C++17, Rust FFI | The fully native desktop app; delegates persistence/domain to `bridge-qt` -> `synapse-core` |
| `mobile-android/` | Kotlin, Jetpack Compose, UniFFI | The fully native Android app; delegates persistence/domain to `bridge-uniffi` -> `synapse-core` |
| `mobile-webview/` | Expo, React Native, WebView | The Android shell that hosts the React web app |

Applications own only UI presentation, local view state, and thin orchestration. Applications must not assemble raw SQL strings or reimplement cross-client domain logic (balances, streaks, quiz stats, review scheduling) locally.

Use the nearest app manifest and build system. The root `package.json` is an npm workspace command facade for `web-react`; the Expo shell has an independent `package.json` and lockfile. The root `Cargo.toml` owns the shared Rust workspace.

See [the app directory guide](../docs/architecture/repository-layout.md) for commands, dependency ownership, and output paths.
Use [documentation status](../docs/documentation-status.md) to find current parity, security, and build sources of truth. Historical plans and report checkboxes are not completion evidence.

Use the same canonical module IDs, feature vocabulary, typed action names, and payload meanings across app targets. Keep equivalent files and module-local subdirectories paired by responsibility, and keep each file atomic. Retain framework-correct roots: React `web-react/src/components/<module>` and established hook/service/API layers, Qt `desktop-qt/qml/<module>` plus `src/controllers/<module>`, and Compose `mobile-android/.../features/<module>/ui` with state/data packages only when needed. Do not create empty mirror folders or wrappers solely to copy another framework's tree. The WebView shell hosts React and must not grow duplicate product modules. Update the counterpart map in [the module structure guide](../docs/architecture/module-structure.md) when shared paths, actions, contracts, or intentional differences change.
