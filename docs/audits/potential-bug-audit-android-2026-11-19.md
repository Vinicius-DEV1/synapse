# Potential Bug Audit — Native Android — 2026-11-19

## Scope

This review compared the Android JNA declarations, Kotlin call sites, Rust bridge exports, Gradle configuration, and native library packaging. It also reviewed encrypted-video reader ownership on open, read, and close paths.

## Findings

### ANDROID-01 — The configured native bridge cannot be loaded through the declared ABI

- **Severity:** Critical
- **Category:** Platform integration, ABI safety
- **Locations:** `apps/mobile-android/app/src/main/java/com/synapse/core/SynapseCoreBindings.kt`, `apps/mobile-android/app/build.gradle.kts`, `bridges/bridge-uniffi/src/lib.rs`, `bridges/bridge-qt/src/lib.rs`
- **Root cause:** The app declares a JNA interface for raw symbols such as `synapse_fsrs_new`, `synapse_video_reader_read_at`, and `synapse_video_reader_free`. The UniFFI crate exposes generated UniFFI entry points, not those raw C symbols. The fallback Qt bridge exports a different C ABI, with different names and signatures. The Gradle source set points at `jniLibs`, but that directory contains no `.so` libraries and no build task produces them. Compose creates `SynapseFsrs` when the Anki screen opens, and encrypted video also calls the bridge, so the native path cannot be treated as operational.
- **Mitigation applied:** Removed the unsafe fallback to the Qt C ABI and made a missing Android bridge fail with a contextual error. This prevents JNA from invoking similarly named functions with incompatible argument layouts.
- **Status:** Open. Complete the Android bridge by generating and using the version-matched UniFFI Kotlin bindings, wiring native library builds for every packaged ABI, and verifying each library's exports and runtime calls. Do not remove the Android crypto compatibility API until this replacement exists.

### ANDROID-02 — Encrypted video reader leaked when `open()` failed after native allocation

- **Severity:** High
- **Category:** Resource lifecycle, key material lifetime
- **Location:** `apps/mobile-android/app/src/main/java/com/synapse/media/EncryptedChunkDataSource.kt`
- **Root cause:** The native reader was stored before validating its size and requested range, while `close()` freed it only after the data source reached its opened state. An invalid range or size failure could leave the native reader allocated and retain its key past the failed open.
- **Resolution:** The data source now closes any reader allocated during a failed open, resets its state, pairs transfer lifecycle callbacks, closes an existing reader before reopening, validates reader size and request bounds, and always releases the reader on close. `SynapseVideoReader` now rejects negative offsets and lengths and makes native close idempotent. Database, FSRS, and video native handles in the Kotlin wrappers also reject use after close and free at most once.
- **Status:** Source change applied; Android compile and runtime regression remain unverified because the required build toolchain is absent in this checkout.

### ANDROID-03 — Video keys leaked through media URIs and player state became stale

- **Severity:** High
- **Category:** Secret exposure, lifecycle state
- **Locations:** `apps/mobile-android/app/src/main/java/com/synapse/features/video/ui/VideoPlayerScreen.kt`, `apps/mobile-android/app/src/main/java/com/synapse/media/EncryptedChunkDataSource.kt`
- **Root cause:** The player constructed a `MediaItem` URI with the decryption key in its query string, where player diagnostics or analytics could retain it. The composable also kept one player instance for its entire lifetime, so changing the path or key could continue using the previous media and key.
- **Resolution:** Video paths now use a file URI and the key stays in the data-source factory. Placeholder path/key defaults were removed, key format is checked before native allocation, player errors use the existing notification surface, and player/effect/gesture lifetimes follow the current path, key, and player instance.
- **Status:** Source change applied; Android compile and playback acceptance remain unverified because the required build toolchain is absent in this checkout.

### BRIDGE-01 — Invalid FSRS values silently changed review semantics

- **Severity:** Medium
- **Category:** Domain input validation
- **Location:** `bridges/bridge-uniffi/src/lib.rs`
- **Root cause:** Unknown state values were treated as new cards, unknown rating values were treated as `Good`, and negative elapsed days or non-finite stability/difficulty values reached the scheduler.
- **Resolution:** The bridge now rejects unknown state/rating values, negative elapsed days, and non-finite inputs. Its crypto round-trip fixture now uses a valid 32-byte module key; the previous fixture caused the bridge test suite to fail before.
- **Status:** Resolved and covered by the focused bridge test suite.

## Verification and Limits

- `git diff --check` — passed.
- [x] `cargo test --manifest-path bridges/bridge-uniffi/Cargo.toml --lib` — 2 bridge tests passed after FSRS input validation and crypto fixture correction.
- Android build was not available: this checkout has no Gradle wrapper or `gradle` executable, the installed Android SDK has no NDK directory, and `rustup target list --installed` contains only `wasm32-unknown-unknown` and `x86_64-unknown-linux-gnu`.
- No `.so` files are present under `apps/mobile-android/app/src/main/jniLibs/`.
- [ ] Generate and consume UniFFI Kotlin bindings that match `bridges/bridge-uniffi`.
- [ ] Add reproducible Android native-library builds for `arm64-v8a`, `x86_64`, and `armeabi-v7a` (or explicitly revise supported ABIs with evidence).
- [ ] Run Android unit/instrumentation tests for open-failure cleanup, repeated close, and use-after-close behavior.
- [ ] Build and launch the Android package with the real native libraries.
- [ ] Compile and exercise the video URI/key isolation and player lifecycle changes on Android.

This review does not certify the Android app, account sign-in, keychain migration, or encrypted video at runtime. The cloud-account migration remains an independent open gate in the [migration audit](../security/cloud-account-encryption-migration.md).
