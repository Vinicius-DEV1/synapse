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

Use the same canonical module IDs across app targets. React keeps module UI under `web-react/src/components/<module>` and domain/platform code in its established layer roots. Qt pairs `desktop-qt/qml/<module>` with `desktop-qt/src/controllers/<module>`. Compose screens live under `mobile-android/.../features/<module>/ui`. The WebView shell hosts the React client and must not grow duplicate product modules. See [the module structure guide](../docs/architecture/module-structure.md) before moving module code.
