# Platform Architecture Guides

Synapse ships four clients with different presentation and lifecycle needs. Product behavior should stay consistent where the platform supports it, while native shells own only platform-specific integration. Shared domain rules and persistence belong in `core/synapse-core/` and are exposed through typed bridges.

## Client guides

| Guide | Client | Main source |
| --- | --- | --- |
| [React Web and Tauri](./react-web-tauri.md) | Browser application and Tauri desktop shell | `apps/web-react/` |
| [Native Qt Desktop](./desktop-qt.md) | Native desktop application | `apps/desktop-qt/` |
| [Native Android](./android-native.md) | Kotlin and Jetpack Compose application | `apps/mobile-android/` |
| [Android WebView Shell](./android-webview.md) | Expo host for the React application | `apps/mobile-webview/` |
| [Shared Core and bridges](./shared-core-and-bridges.md) | Domain, persistence and native API boundaries | `core/` and `bridges/` |

## Ownership rules

- Keep platform UI and lifecycle code in the client that owns it.
- Keep shared domain entities, calculations, SQLite schema, migrations and repository operations in `synapse-core`.
- Expose native capabilities through typed bridge APIs; keep controllers and Tauri commands as thin adapters.
- A route, screen, menu item or modal does not prove full parity. Validate interactions, data persistence, failure states, accessibility, visual behavior and supported cross-client round trips.
- Store stable architecture, current verified behavior and enduring decisions in `docs/`. Keep active comparison inventories, unresolved findings, evidence logs and implementation checklists in the repository-root `audits/` directory. After an audit is completed, consolidate its durable findings into the appropriate `docs/` source and remove the completed working artifact.

## Related documentation

- [Architecture overview](../architecture/overview.md)
- [Repository layout](../architecture/repository-layout.md)
- [Cross-application module structure](../architecture/module-structure.md)
- [Build and setup](../guides/setup-and-build.md)
- [Documentation ownership and current status](../documentation-status.md)
