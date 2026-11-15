# Native Qt Desktop Guidance

This app owns the fully native Qt 6 / QML desktop client. Follow the repository [engineering rules](../../AGENTS.md), [application boundaries](../AGENTS.md), and [cross-app module structure](../../docs/architecture/module-structure.md).

- Keep QML presentation in `qml/<module>/` and feature controllers in `src/controllers/<module>/` using the same canonical module ID, strictly mirroring `apps/web-react/src/components/<module>/`.
- Common layout elements (sidebar, top tab bar, command palette, global shortcuts, and `GlobalModalsHost.qml`) belong in `qml/layout/` (mirroring `apps/web-react/src/components/layout/`).
- Common UI primitives (`Theme.qml`, `AppIcon.qml`, `AppConfirmDialog.qml`) belong in `qml/ui/` (mirroring `apps/web-react/src/components/ui/`).
- The root `qml/` folder is reserved exclusively for top-level entrypoints (`main.qml`, `AuthenticatedApplication.qml`, and `qmldir`).
- Feature controllers are thin presentation orchestrators exposing `Q_PROPERTY`, `Q_INVOKABLE`, and Qt signals (`emit ...Changed()`). They must NOT construct raw SQL query strings, manage manual SQLite queries, or calculate business domain metrics (e.g., account balance aggregations, habit streaks, quiz scoring, card review scheduling) in C++.
- Keep `SynapseDataController`, app startup, and shared media/platform primitives at the `src/` app level when they compose multiple modules.
- Keep native controller tests in `tests/<module>/`; update CMake source lists whenever files move.
- Keep database access and native platform calls out of QML views where controller methods own that presentation boundary.
- For UI smoke checks, set `SYNAPSE_DATABASE_PATH` to a disposable temporary SQLite file. The app prefers an existing canonical user database, so `XDG_DATA_HOME` alone does not isolate it.
- Centralize all domain entities, repository queries, and business calculations in `../../core/synapse-core/`; expose Qt-specific typed bindings through `../../bridges/bridge-qt/`. Avoid generic raw-SQL bridge calls in favor of high-level domain APIs.
- Update the [native desktop parity matrix](../../docs/native-desktop-parity.md) when a Qt feature gap is closed, and update the [native encryption audit](../../docs/security/native-encryption-audit.md) whenever vault coverage or recovery behavior changes. Do not use the Android or React matrix as Qt completion evidence.

Use the `build/` directory ignored by Git for generated files. The source of truth remains the CMake manifest and the `qml/` tree.
