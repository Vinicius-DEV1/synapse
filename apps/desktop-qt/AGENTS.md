# Native Qt Desktop Guidance

This app owns the fully native Qt 6 / QML desktop client. Follow the repository [engineering rules](../../AGENTS.md), [application boundaries](../AGENTS.md), and [cross-app module structure](../../docs/architecture/module-structure.md).

- Keep QML presentation in `qml/<module>/` and feature controllers in `src/controllers/<module>/` using the same canonical module ID.
- Keep `SynapseDataController`, app startup, and shared media/platform primitives at the `src/` app level when they compose multiple modules.
- Keep native controller tests in `tests/<module>/`; update CMake source lists whenever files move.
- Keep database access and native platform calls out of QML views where controller methods can own that boundary.
- For UI smoke checks, set `SYNAPSE_DATABASE_PATH` to a disposable temporary SQLite file. The app prefers an existing canonical user database, so `XDG_DATA_HOME` alone does not isolate it.
- Keep shared, platform-neutral domain behavior in `../../core/synapse-core/`; expose Qt-specific bindings through `../../bridges/bridge-qt/`.
- Update the [native desktop parity matrix](../../docs/native-desktop-parity.md) when a Qt feature gap is closed, and update the [native encryption audit](../../docs/security/native-encryption-audit.md) whenever vault coverage or recovery behavior changes. Do not use the Android or React matrix as Qt completion evidence.

Use the `build/` directory ignored by Git for generated files. The source of truth remains the CMake manifest and the `qml/` tree.
