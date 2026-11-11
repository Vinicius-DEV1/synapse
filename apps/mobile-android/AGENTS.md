# Native Android Guidance

This app owns the fully native Kotlin and Jetpack Compose client. Follow the repository [engineering rules](../../AGENTS.md), [application boundaries](../AGENTS.md), and [cross-app module structure](../../docs/architecture/module-structure.md).

- Keep each screen in `app/src/main/java/com/synapse/features/<module>/ui/` using the canonical module ID.
- Add `viewmodel/`, `domain/`, and `data/` packages under that module only when the feature has those responsibilities.
- Keep shared theme, Rust bindings, and media primitives in their shared `com.synapse.ui.theme`, `com.synapse.core`, and `com.synapse.media` packages.
- Keep Android-specific APIs in the Android app. Put platform-neutral business rules in `../../core/synapse-core/` and call them through `../../bridges/bridge-uniffi/`.
- Group JVM and instrumentation tests under `app/src/test/` and `app/src/androidTest/` by module.
- Review Android parity independently; the Qt [native desktop parity matrix](../../docs/native-desktop-parity.md) does not certify Compose behavior. Keep current testing and security status linked from the [documentation status index](../../docs/documentation-status.md).

Preserve navigation contracts, accessibility labels, and feature behavior when reorganizing Compose screens.
