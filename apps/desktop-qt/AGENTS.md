# Native Qt Desktop Guidance

This app owns the fully native Qt 6 / QML desktop client. Follow the repository [engineering rules](../../AGENTS.md), [application boundaries](../AGENTS.md), and [cross-app module structure](../../docs/architecture/module-structure.md). Use [desktop-qt-parity](../../.agents/skills/desktop-qt-parity/SKILL.md) for React-to-Qt implementation and acceptance, and [cross-platform-module-parity](../../.agents/skills/cross-platform-module-parity/SKILL.md) for shared contracts.

- Keep QML presentation in `qml/<module>/` and feature controllers in `src/controllers/<module>/` using the same canonical module ID as React and Compose. Pair equivalent Qt QML types, controller actions and test cases with their cross-client counterparts by stable semantic name and contract. Keep React-style module vocabulary and subdirectory groupings when the responsibility exists, while preserving Qt's QML/C++ layer split; do not create artificial mirror folders or wrappers.
- Common layout elements (sidebar, top tab bar, command palette, global shortcuts, and `GlobalModalsHost.qml`) belong in `qml/layout/` (mirroring `apps/web-react/src/components/layout/`).
- Common UI primitives (`Theme.qml`, `AppIcon.qml`, `AppConfirmDialog.qml`) belong in `qml/ui/` (mirroring `apps/web-react/src/components/ui/`).
- The root `qml/` folder is reserved exclusively for top-level entrypoints (`main.qml`, `AuthenticatedApplication.qml`, and `qmldir`).
- Feature controllers are thin presentation orchestrators exposing `Q_PROPERTY`, `Q_INVOKABLE`, and Qt signals (`emit ...Changed()`). They must NOT construct raw SQL query strings, manage manual SQLite queries, or calculate business domain metrics (e.g., account balance aggregations, habit streaks, quiz scoring, card review scheduling) in C++.
- Keep `SynapseDataController`, app startup, and shared media/platform primitives at the `src/` app level when they compose multiple modules.
- Keep native controller tests in `tests/<module>/`; update CMake source lists whenever files move.
- Keep database access and native platform calls out of QML views where controller methods own that presentation boundary.
- For UI smoke checks, set `SYNAPSE_DATABASE_PATH` to a disposable temporary SQLite file. The app prefers an existing canonical user database, so `XDG_DATA_HOME` alone does not isolate it.
- Centralize all domain entities, repository queries, and business calculations in `../../core/synapse-core/`; expose Qt-specific typed bindings through `../../bridges/bridge-qt/`. Avoid generic raw-SQL bridge calls in favor of high-level domain APIs.
- Update the [native desktop parity guide](../../docs/native-desktop-parity.md) with durable Qt status when a feature gap is closed, and update the [encryption coverage guide](../../docs/security/encryption-coverage.md) whenever vault coverage or recovery behavior changes. Detailed active acceptance evidence belongs in repository-root `audits/`. Do not use Android or React status as Qt completion evidence.

Use the `build/` directory ignored by Git for generated files. The source of truth remains the CMake manifest and the `qml/` tree.
