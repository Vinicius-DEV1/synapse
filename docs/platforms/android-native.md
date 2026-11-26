# Native Android

`apps/mobile-android/` is the fully native Android client, implemented in Kotlin and Jetpack Compose. It owns Android navigation, lifecycle, system UI, permissions, document-picker integration and Compose presentation. Shared domain operations are exposed from Rust through `bridges/bridge-uniffi/` and persisted through `core/synapse-core/` where the feature has been migrated.

## Source boundaries

| Layer | Location | Responsibility |
| --- | --- | --- |
| Compose UI | `apps/mobile-android/app/src/main/java/com/synapse/features/<module>/ui/` | Screens, dialogs and feature-specific interaction |
| Feature orchestration | Feature ViewModels/stores in the Android source tree | Compose state, lifecycle and typed Core coordination |
| UniFFI bridge | `bridges/bridge-uniffi/` | Generated and handwritten Kotlin-facing Core contracts |
| Shared domain and storage | `core/synapse-core/` | Canonical models, calculations, SQLite schema and repositories |
| Platform APIs | Android app | Permissions, alarms, Media3, SAF grants, preferences and lifecycle |

Use Android preferences only for platform-specific state such as local presentation preferences. Do not create parallel Room schemas or reimplement domain algorithms in Kotlin. Platform APIs such as the Storage Access Framework may retain provider URIs and grants; those are platform adapters, not a second file catalog.

## Feature availability and limits

Android currently has native routes for the canonical module set, but route presence is not feature parity. Some routes have only local Core-backed flows, some external integrations or sync are incomplete, and some React capabilities have no Android implementation. Verify behavior against the current code before describing availability. Keep sync, encryption, account, media, and cross-device limitations explicit by data entity and operation.

## Localization, accessibility and lifecycle

New Android UI text belongs in Android string resources with English defaults and matching Brazilian Portuguese strings. Preserve Compose semantics and content descriptions, handle configuration changes, cancel lifecycle-bound work, and test hardware back, system bars, safe areas, process recreation and permission denial.

## Build and verification

Use JDK 17 and the Gradle wrapper as described in [Setup and build](../guides/setup-and-build.md). Run focused Kotlin compilation and instrumentation for changed flows. A successful compile does not prove behavior on a device, permission state, alarm delivery or cross-client parity.
