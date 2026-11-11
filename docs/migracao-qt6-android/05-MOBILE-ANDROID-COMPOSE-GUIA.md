# Native Android Guide

**Status:** The Kotlin/Compose app is a separate native target. This guide does not certify feature parity or production readiness; verify each module against its current implementation.

## Source Ownership

- App module: `apps/mobile-android/app/`.
- Compose feature screens: `app/src/main/java/com/synapse/features/<module>/ui/`.
- Shared Rust crate: `core/synapse-core/`.
- UniFFI bridge: `bridges/bridge-uniffi/`.
- Android-specific lifecycle, media, and platform APIs remain in the Android app.

Use the actual Gradle configuration and generated bindings as the source of truth for SDK versions and available APIs. Do not copy API levels or feature claims from older migration drafts.

## Build

From the repository root:

```bash
cd apps/mobile-android
./gradlew testDebugUnitTest
./gradlew assembleDebug
```

Run instrumentation tests on a configured emulator or device. For cross-app module naming and ownership, see the [module structure guide](../architecture/module-structure.md). The Android app's parity must be reviewed independently from the Qt desktop matrix.
