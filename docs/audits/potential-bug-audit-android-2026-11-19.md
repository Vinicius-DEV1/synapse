# Potential Bug Audit — Native Android — Updated 2026-11-20

## Scope

This review compared the Android bridge declarations, Kotlin call sites, Rust bridge exports, Gradle configuration, native library packaging, encrypted-video reader ownership, default personal data, and in-memory mutation lifetimes across Android routes. The 2026-11-20 follow-up built and exercised the generated UniFFI bridge on an emulator.

## Findings

### ANDROID-01 — The configured native bridge cannot be loaded through the declared ABI

- **Severity:** Critical
- **Category:** Platform integration, ABI safety
- **Locations:** `apps/mobile-android/app/build.gradle.kts`, `tools/scripts/build-android.sh`, `bridges/bridge-uniffi/src/lib.rs`, and the former manual declarations in `apps/mobile-android/app/src/main/java/com/synapse/core/SynapseCoreBindings.kt`
- **Root cause:** The app declared raw JNA symbols that the UniFFI library did not export. The Qt bridge used another incompatible C ABI. The Android build helper only created empty `jniLibs` folders and still let the universal pipeline claim success.
- **Resolution:** Removed the manual ABI declarations and generic raw-SQL Android wrapper. Gradle now invokes a pinned NDK/cargo-ndk build for all packaged ABIs, generates Kotlin from the same UniFFI library version, and packages only the required bridge library from ignored build output. Missing tools or ABI outputs now fail the build. A device-side FSRS test confirms generated Kotlin can call the Rust library.
- **Status:** Resolved for bridge generation, packaging, and runtime loading. Finance now has a typed repository; other module repositories, account authentication, key migration, and real Anki/video data flows remain separate open items.

### ANDROID-02 — Encrypted video reader leaked when `open()` failed after native allocation

- **Severity:** High
- **Category:** Resource lifecycle, key material lifetime
- **Location:** `apps/mobile-android/app/src/main/java/com/synapse/media/EncryptedChunkDataSource.kt`
- **Root cause:** The native reader was stored before validating its size and requested range, while `close()` freed it only after the data source reached its opened state. An invalid range or size failure could leave the native reader allocated and retain its key past the failed open.
- **Resolution:** The data source closes any reader allocated during a failed open, resets its state, pairs transfer lifecycle callbacks, closes an existing reader before reopening, validates reader size and request bounds, checks destination-buffer ranges, and always releases the UniFFI reader on close. UniFFI's unsigned offset/length contract prevents negative native ranges.
- **Status:** Android compilation and FSRS bridge runtime tests passed. A real encrypted-video fixture has not yet been opened and read through the Android media pipeline, so playback and video-specific release behavior remain unverified.

### ANDROID-03 — Video keys leaked through media URIs and player state became stale

- **Severity:** High
- **Category:** Secret exposure, lifecycle state
- **Locations:** `apps/mobile-android/app/src/main/java/com/synapse/features/video/ui/VideoPlayerScreen.kt`, `apps/mobile-android/app/src/main/java/com/synapse/media/EncryptedChunkDataSource.kt`
- **Root cause:** The player constructed a `MediaItem` URI with the decryption key in its query string, where player diagnostics or analytics could retain it. The composable also kept one player instance for its entire lifetime, so changing the path or key could continue using the previous media and key.
- **Resolution:** Video paths now use a file URI and the key stays in the data-source factory. Placeholder path/key defaults were removed, key format is checked before native allocation, player errors use the existing notification surface, and player/effect/gesture lifetimes follow the current path, key, and player instance.
- **Status:** Android Kotlin compilation passed and the generated bridge loads in the emulator. The empty video state ran, but encrypted playback with a real file/key remains unverified. The key remains in the data-source factory and does not enter the media URI.

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
- **Mitigation gate:** Use typed `bridge-uniffi`/`synapse-core` repositories and verify local transactions before enabling real Android edits. Track Firebase synchronization and encryption as separate acceptance gates.
- **Status:** Partially resolved. Finance now persists through a typed core-backed SQLite API and is covered by Rust and Android instrumentation checks. Other Android module mutations remain in-memory, and Finance does not sync to Firebase.

### ANDROID-08 — Quiz completion state was never presented

- **Severity:** Medium
- **Category:** User flow, state handling
- **Location:** `apps/mobile-android/app/src/main/java/com/synapse/features/questions/ui/ZenQuizScreen.kt`
- **Root cause:** The final answer set `isFinished = true`, but the composable never read that state. A completed quiz remained on the last question and offered no result or restart flow.
- **Resolution:** Added a completion screen with score and percentage, a restart action that resets all session state, and a scroll reset when advancing to a new question. Extracted the curated question bank and answer option component into feature-owned files.
- **Status:** Resolved. On the final debug APK, all three correct answers rendered a 3/3 result; restarting returned to question 1 with a clean selection state.

### ANDROID-09 — Focus showed fabricated completion totals

- **Severity:** Medium
- **Category:** Data integrity, incorrect aggregation
- **Location:** `apps/mobile-android/app/src/main/java/com/synapse/features/focus/ui/FocusScreen.kt`
- **Root cause:** The session counter started at three despite no completed sessions, and the displayed focus time multiplied every cycle by 25 minutes regardless of the selected timer preset.
- **Resolution:** The counter now starts at zero and completed focus minutes accumulate the actual selected preset duration.
- **Status:** Resolved. `:app:assembleDebug` passed, and the `Medium_Phone_API_37.0` emulator showed `0 ciclos concluídos hoje (0 min)` on a fresh launch.

### ANDROID-10 — Finance edits were not persisted and the screen displayed sample state

- **Severity:** High
- **Category:** Data integrity, persistence, domain integration
- **Locations:** `apps/mobile-android/app/src/main/java/com/synapse/features/finance/`, `bridges/bridge-uniffi/src/finance/`, and `core/synapse-core/src/domain/finance/`
- **Root cause:** Finance UI state was local to Compose and demo models/components did not call a real repository. The typed UniFFI surface did not expose the complete account, transaction, loan, wishlist, and summary operations required by the screen.
- **Resolution:** Replaced the Android Finance demo with native Compose views backed by a lifecycle ViewModel and an IO-dispatched repository. Added typed UniFFI operations for Finance CRUD and core atomic operations for pending confirmation, loan payments/reopening, and wishlist acquisition. Added SQLite migrations for transaction update timestamps and loan person fields, and protected linked loan totals and the invariant that one active account remains.
- **Status:** Resolved for local Android Finance persistence. Rust domain/migration tests, generated-binding Android instrumentation, debug build, and emulator screen launch passed. Firebase synchronization, account/key migration, and field encryption remain open; see the [Android Finance guide](../mobile-android-finance.md).

## Verification and Limits

- `git diff --check` — passed.
- [x] `cargo test -p synapse-bridge-uniffi --lib` — 3 bridge tests passed, including Finance operations through UniFFI.
- [x] `cargo test -p synapse-core domain::finance::tests --lib` — 12 Finance domain tests passed.
- [x] `cargo test -p synapse-core db::migrations::tests --lib` — 5 migration tests passed.
- `apps/mobile-android/gradlew -p apps/mobile-android :app:assembleDebug` — passed with Gradle 8.9, JDK 17, NDK `30.0.16248370`, and `cargo-ndk` 4.1.2. The build task compiles the bridge and generates version-matched Kotlin bindings.
- `apps/mobile-android/gradlew -p apps/mobile-android :app:connectedDebugAndroidTest :app:assembleDebug` — passed on `Medium_Phone_API_37.0`; both instrumentation tests passed, covering Finance CRUD, linked operations, SQLite reopen, and the FSRS binding.
- `tools/scripts/build-all.sh` — passed for native Rust bridges, WebAssembly, Qt desktop, and Android NDK bridge/bindings.
- Final debug APK: `apps/mobile-android/app/build/outputs/apk/debug/app-debug.apk`, SHA-256 `10c3ea007b5bdb52dbcb9259f081598627b9417b9777a7cf27ef9662e6454d3a`, package `com.synapse.app`, version `2.0.0` (version code `200`). The APK contains `libsynapse_bridge_uniffi.so` for `arm64-v8a`, `x86_64`, and `armeabi-v7a`; no unused `libsynapse_core.so` is packaged.
- The current APK was installed and launched on the `Medium_Phone_API_37.0` emulator; Finance route navigation and a UI-created expense followed by archive were exercised, and the summary returned to zero without an app crash. Earlier route smoke checks for Calendar, Habits, Library, Culture, Diagrams, Video, and Quiz remain recorded above. Firebase sync and encrypted video playback were not exercised; see the [Android Finance guide](../mobile-android-finance.md).
- Home, Notes, Anki, Trash, and Vault empty states were checked on the earlier debug APK after fabricated personal defaults were removed; those screens were not modified by the later UI extractions.
- Native libraries and generated Kotlin sources live under ignored `apps/mobile-android/app/build/generated/`; no generated binary is committed under `app/src/main/jniLibs/`.
- [x] Generate and consume UniFFI Kotlin bindings that match `bridges/bridge-uniffi`.
- [x] Add reproducible Android native-library builds for `arm64-v8a`, `x86_64`, and `armeabi-v7a`.
- [ ] Run Android instrumentation tests for encrypted-video open-failure cleanup, repeated close, and use-after-close behavior.
- [x] Build and launch the Android package with the real native libraries.
- [ ] Compile and exercise encrypted video URI/key isolation and playback using a real encrypted fixture.
- [x] Verify empty Anki, video, and vault states on an installed Android debug build.
- [ ] Wire Anki and video modules to real persisted records through typed core repositories and Firebase sync.
- [ ] Wire credentials through typed, encrypted core APIs before accepting Android vault data.
- [x] Review and remove the Android module sample datasets that were rendered as personal data.
- [x] Fix the quiz completion flow and modularize the video and quiz screens; see the [UI modularization record](./android-ui-modularization-plan-2026-11-20.md).
- [ ] Replace Compose-only module mutations with typed persisted core repositories and verify navigation/process-restart recovery.
- [x] Rebuild and verify that Focus starts at zero completed sessions and accumulates the selected preset duration.

This review does not certify the Android app, account sign-in, keychain migration, or encrypted video at runtime. The cloud-account migration remains an independent open gate in the [migration audit](../security/cloud-account-encryption-migration.md).
