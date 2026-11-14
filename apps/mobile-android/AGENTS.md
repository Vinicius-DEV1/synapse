# Native Android Guidance

This app owns the fully native Kotlin and Jetpack Compose client. Follow the repository [engineering rules](../../AGENTS.md), [application boundaries](../AGENTS.md), and [cross-app module structure](../../docs/architecture/module-structure.md).

- Keep each screen in `app/src/main/java/com/synapse/features/<module>/ui/` using the canonical module ID.
- Add `viewmodel/`, `domain/`, and `data/` packages under that module only when the feature has those responsibilities.
- Keep shared theme, Rust bindings, and media primitives in their shared `com.synapse.ui.theme`, `com.synapse.core`, and `com.synapse.media` packages.
- **Zero Domain Duplication**: Put all platform-neutral business rules, database queries, migrations, habit streaks, balance calculations, quiz evaluations, and FSRS algorithms in `../../core/synapse-core/` and call them strictly through `../../bridges/bridge-uniffi/`. Kotlin ViewModels and Compose screens are thin presentation adapters and must NEVER create custom Room/SQLite schemas or reimplement domain logic in Kotlin.
- Group JVM and instrumentation tests under `app/src/test/` and `app/src/androidTest/` by module.
- Review Android parity independently; the Qt [native desktop parity matrix](../../docs/native-desktop-parity.md) does not certify Compose behavior. Keep current testing and security status linked from the [documentation status index](../../docs/documentation-status.md).

Preserve navigation contracts, accessibility labels, and feature behavior when reorganizing Compose screens.
