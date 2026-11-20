# Potential Bug Audit — Native Android — Updated 2026-11-20

## Scope

This review compared the Android JNA declarations, Kotlin call sites, Rust bridge exports, Gradle configuration, and native library packaging. It also reviewed encrypted-video reader ownership on open, read, and close paths, plus default personal data and in-memory mutation lifetimes across the Android routes.

## Findings

### ANDROID-01 — The configured native bridge cannot be loaded through the declared ABI

- **Severity:** Critical
- **Category:** Platform integration, ABI safety
- **Locations:** `apps/mobile-android/app/src/main/java/com/synapse/core/SynapseCoreBindings.kt`, `apps/mobile-android/app/build.gradle.kts`, `bridges/bridge-uniffi/src/lib.rs`, `bridges/bridge-qt/src/lib.rs`
- **Root cause:** The app declares a JNA interface for raw symbols such as `synapse_fsrs_new`, `synapse_video_reader_read_at`, and `synapse_video_reader_free`. The UniFFI crate exposes generated UniFFI entry points, not those raw C symbols. The fallback Qt bridge exports a different C ABI, with different names and signatures. The Gradle source set points at `jniLibs`, but that directory contains no `.so` libraries and no build task produces them. Real Anki cards and explicitly selected encrypted video still require this unavailable native bridge; their empty states do not.
- **Mitigation applied:** Removed the unsafe fallback to the Qt C ABI and made a missing Android bridge fail with a contextual error. This prevents JNA from invoking similarly named functions with incompatible argument layouts.
- **Status:** Open. Complete the Android bridge by generating and using the version-matched UniFFI Kotlin bindings, wiring native library builds for every packaged ABI, and verifying each library's exports and runtime calls. Do not remove the Android crypto compatibility API until this replacement exists.

### ANDROID-02 — Encrypted video reader leaked when `open()` failed after native allocation

- **Severity:** High
- **Category:** Resource lifecycle, key material lifetime
- **Location:** `apps/mobile-android/app/src/main/java/com/synapse/media/EncryptedChunkDataSource.kt`
- **Root cause:** The native reader was stored before validating its size and requested range, while `close()` freed it only after the data source reached its opened state. An invalid range or size failure could leave the native reader allocated and retain its key past the failed open.
- **Resolution:** The data source now closes any reader allocated during a failed open, resets its state, pairs transfer lifecycle callbacks, closes an existing reader before reopening, validates reader size and request bounds, and always releases the reader on close. `SynapseVideoReader` now rejects negative offsets and lengths and makes native close idempotent. Database, FSRS, and video native handles in the Kotlin wrappers also reject use after close and free at most once.
- **Status:** Android Kotlin compilation and empty-state route smoke checks passed. Native open-failure cleanup and runtime bridge behavior remain unverified because no Android native library is packaged.

### ANDROID-03 — Video keys leaked through media URIs and player state became stale

- **Severity:** High
- **Category:** Secret exposure, lifecycle state
- **Locations:** `apps/mobile-android/app/src/main/java/com/synapse/features/video/ui/VideoPlayerScreen.kt`, `apps/mobile-android/app/src/main/java/com/synapse/media/EncryptedChunkDataSource.kt`
- **Root cause:** The player constructed a `MediaItem` URI with the decryption key in its query string, where player diagnostics or analytics could retain it. The composable also kept one player instance for its entire lifetime, so changing the path or key could continue using the previous media and key.
- **Resolution:** Video paths now use a file URI and the key stays in the data-source factory. Placeholder path/key defaults were removed, key format is checked before native allocation, player errors use the existing notification surface, and player/effect/gesture lifetimes follow the current path, key, and player instance.
- **Status:** Android Kotlin compilation passed. The empty video state ran in the emulator; encrypted playback, key isolation, and native reader lifecycle remain unverified because no Android native library is packaged.

### BRIDGE-01 — Invalid FSRS values silently changed review semantics

- **Severity:** Medium
- **Category:** Domain input validation
- **Location:** `bridges/bridge-uniffi/src/lib.rs`
- **Root cause:** Unknown state values were treated as new cards, unknown rating values were treated as `Good`, and negative elapsed days or non-finite stability/difficulty values reached the scheduler.
- **Resolution:** The bridge now rejects unknown state/rating values, negative elapsed days, and non-finite inputs. Its crypto round-trip fixture now uses a valid 32-byte module key; the previous fixture caused the bridge test suite to fail before.
- **Status:** Resolved and covered by the focused bridge test suite.

### ANDROID-04 — Demo cards, subtitles, and a fabricated video key were presented as real module data

- **Severity:** Medium
- **Category:** Data integrity, unsafe defaults, startup lifecycle
- **Locations:** `apps/mobile-android/app/src/main/java/com/synapse/MainActivity.kt`, `apps/mobile-android/app/src/main/java/com/synapse/features/anki/ui/AnkiStudyScreen.kt`, `apps/mobile-android/app/src/main/java/com/synapse/features/video/ui/VideoPlayerScreen.kt`
- **Root cause:** The Anki route showed three hardcoded sample cards as if they belonged to the user's deck. The video route instantiated a player with a fabricated local path and an all-zero decryption key, and it overlaid invented subtitle words on every video. The Anki screen also created its native FSRS bridge before checking for an empty card list.
- **Resolution:** The Anki route now starts with the existing empty state and does not allocate the native scheduler without cards. The video screen requires a real path and key to create a player, shows an empty state when either is absent, and no longer renders synthetic subtitle content. The synthetic sample records and fake key defaults were removed.
- **Status:** Android compilation passed and the installed empty Anki route rendered in the emulator. Supplying real Anki data still requires the unresolved typed bridge and persistence integration.

### ANDROID-05 — The native vault displayed fabricated password-like values by default

- **Severity:** High
- **Category:** Secret handling, data integrity
- **Location:** `apps/mobile-android/app/src/main/java/com/synapse/features/vault/ui/VaultScreen.kt`
- **Root cause:** The default screen state included hardcoded, secret-looking values such as a token-like string and service passwords. The vault route rendered these as saved credentials despite having no storage integration.
- **Resolution:** The default credential list is empty. The screen now distinguishes an empty vault from a search with no matches. No credentials are copied or persisted by this change.
- **Status:** Android compilation passed and the installed empty vault route rendered in the emulator. Credential persistence remains unimplemented.

### ANDROID-06 — Static sample records were presented as the user's personal data

- **Severity:** High
- **Category:** Data integrity, misleading state
- **Locations:** `apps/mobile-android/app/src/main/java/com/synapse/features/home/ui/HomeScreen.kt`, `calendar/ui/CalendarScreen.kt`, `notes/ui/NotesScreen.kt`, `finance/ui/FinanceScreen.kt`, `habits/ui/HabitsScreen.kt`, `library/ui/LibraryScreen.kt`, `culture/ui/CultureScreen.kt`, `diagrams/ui/DiagramsScreen.kt`, and `trash/ui/TrashScreen.kt`
- **Root cause:** These screens initialized personal record lists with hardcoded events, notes, transaction amounts, habit streaks, reading progress, media ratings, diagrams, and trash entries. The home screen also assumed the account name and showed fabricated agenda, pinned notes, and financial totals.
- **Resolution:** Replaced all personal record defaults with empty lists, added explicit empty states where the lists had rendered blank, changed the home greeting to be account-neutral, and hid financial averages/totals when there is no transaction data. No local or cloud records were deleted or changed.
- **Status:** Resolved for default presentation. The Android client still does not load persisted records; that is tracked separately in ANDROID-07.

### ANDROID-07 — Android module edits are only held in composable memory

- **Severity:** High
- **Category:** Data loss, persistence integration
- **Locations:** Android calendar, finance, habits, library, culture, diagrams, and trash screens; `apps/mobile-android/app/src/main/java/com/synapse/MainActivity.kt`
- **Root cause:** Several screens mutate lists stored with Compose `remember` but do not call a repository or storage API. `MainActivity` replaces the active route, so navigating away disposes that state; process recreation also discards it. There is no typed Android module persistence or Firebase sync path to restore those changes.
- **Risk scenario:** A user creates or edits an item and then changes routes or restarts the app; the screen returns empty and the edit is lost.
- **Mitigation gate:** Implement module operations through typed `bridge-uniffi`/`synapse-core` repositories and verify local transactions before enabling real Android edits. Do not claim Android module persistence or sync until that path exists.
- **Status:** Open. The missing UniFFI ABI and native-library packaging in ANDROID-01 currently block the required core integration.

### ANDROID-08 — Quiz completion state was never presented

- **Severity:** Medium
- **Category:** User flow, state handling
- **Location:** `apps/mobile-android/app/src/main/java/com/synapse/features/questions/ui/ZenQuizScreen.kt`
- **Root cause:** The final answer set `isFinished = true`, but the composable never read that state. A completed quiz remained on the last question and offered no result or restart flow.
- **Resolution:** Added a completion screen with score and percentage, a restart action that resets all session state, and a scroll reset when advancing to a new question. Extracted the curated question bank and answer option component into feature-owned files.
- **Status:** Resolved. On the final debug APK, all three correct answers rendered a 3/3 result; restarting returned to question 1 with a clean selection state.

## Verification and Limits

- `git diff --check` — passed.
- [x] `cargo test --manifest-path bridges/bridge-uniffi/Cargo.toml --lib` — 2 bridge tests passed after FSRS input validation and crypto fixture correction.
- `apps/mobile-android/gradlew -p apps/mobile-android :app:assembleDebug` — passed with Gradle 8.9 and JDK 17. The wrapper pins the distribution SHA-256 and AndroidX is enabled in the checked-in Gradle properties.
- Final debug APK: `apps/mobile-android/app/build/outputs/apk/debug/app-debug.apk`, SHA-256 `c4b1b749e52a55cf6603dd72f653cd4c8389c14dd1f12ea80131d22e9ac46edc`, package `com.synapse.app`, version `2.0.0` (version code `200`).
- The final APK was installed and launched on the `Medium_Phone_API_37.0` emulator. Calendar, Finance, Habits, Library, Culture, and Diagrams displayed their empty states. Quiz interaction showed the 3/3 completion result and reset to question 1. Video displayed its empty state. No fatal application exception appeared. These checks do not exercise native-backed data or encrypted playback.
- Home, Notes, Anki, Trash, and Vault empty states were checked on the earlier debug APK after fabricated personal defaults were removed; those screens were not modified by the later UI extractions.
- The installed SDK has no Android NDK directory, and `rustup target list --installed` contains only `wasm32-unknown-unknown` and `x86_64-unknown-linux-gnu`.
- No `.so` files are present under `apps/mobile-android/app/src/main/jniLibs/`.
- [ ] Generate and consume UniFFI Kotlin bindings that match `bridges/bridge-uniffi`.
- [ ] Add reproducible Android native-library builds for `arm64-v8a`, `x86_64`, and `armeabi-v7a` (or explicitly revise supported ABIs with evidence).
- [ ] Run Android unit/instrumentation tests for open-failure cleanup, repeated close, and use-after-close behavior.
- [ ] Build and launch the Android package with the real native libraries.
- [ ] Compile and exercise the video URI/key isolation and player lifecycle changes on Android with the real native library.
- [x] Verify empty Anki, video, and vault states on an installed Android debug build.
- [ ] Wire Anki and video modules to real persisted records through the typed native bridge.
- [ ] Wire credentials through typed, encrypted core APIs before accepting Android vault data.
- [x] Review and remove the Android module sample datasets that were rendered as personal data.
- [x] Fix the quiz completion flow and modularize the video and quiz screens; see the [UI modularization record](./android-ui-modularization-plan-2026-11-20.md).
- [ ] Replace Compose-only module mutations with typed persisted core repositories and verify navigation/process-restart recovery.

This review does not certify the Android app, account sign-in, keychain migration, or encrypted video at runtime. The cloud-account migration remains an independent open gate in the [migration audit](../security/cloud-account-encryption-migration.md).
