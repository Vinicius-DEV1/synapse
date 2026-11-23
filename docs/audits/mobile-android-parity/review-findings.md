# Review Findings

These findings are retained as the detailed evidence and remediation record for this parity inventory. Revalidate current source before treating a finding as unresolved or resolved.

## Current Review Findings

### ANDROID-PARITY-01 — Native persistence and feature depth remain uneven

- **Severity:** High
- **Dimension:** Correctness, persistence, architecture
- **Evidence:** Finance, Files, Calendar, Culture, the Diagrams catalog, Video metadata/folders/progress, Focus records, Habits, Trash, Notifications, Practice, Anki, Questions, Library, and supported Notes operations use typed Core/UniFFI stores. Focus timer lifecycle uses Android preferences. Incomplete workflows are listed in the feature table; account scoping and cloud persistence are not implemented.
- **Impact:** Unsupported or platform-local flows do not yet provide React-equivalent durability, cross-device recovery, or behavior across account changes.
- **Action:** Implement remaining operations in focused Core domains, expose typed UniFFI contracts, and validate local lifecycle behavior before adding sync.
- **Status:** The listed local flows are persisted; rich Notes, transient diagram drawing, empty Vault, several incomplete feature paths, and Firebase/account synchronization remain open.

### ANDROID-PARITY-02 — Native route coverage is incomplete

- **Severity:** High
- **Dimension:** Feature parity
- **Evidence:** `MainActivity.kt` now routes all 18 canonical module IDs, including Settings. The Settings screen currently exposes only locally persisted editor and Anki preferences. Workspace, Sharing, AI, and auth/sync are cross-cutting React capabilities with no native flow.
- **Impact:** React capabilities are inaccessible in the native Compose app.
- **Action:** Implement the missing routes and overlays after defining their shared contracts and platform boundaries.
- **Status:** Canonical route coverage is addressed; Settings feature depth and Workspace, Sharing, AI, and auth/sync remain open.

### ANDROID-PARITY-03 — Video catalog and secure playback are partial

- **Severity:** High
- **Dimension:** Correctness, functionality
- **Evidence:** Android now has a Core-backed SAF catalog, folder filtering/CRUD/move actions, and can play content URIs with persisted grants; Core stores duration and progress. Android still cannot resolve desktop paths, Drive assets, encrypted ENC1 media, subtitles/audio tracks, or vocabulary and has no native account-key lifecycle.
- **Impact:** Only Android-provider video files can be selected and played; React-managed encrypted media and remote catalog records are not portable into this player yet.
- **Action:** Implement the reviewed Android key/account lifecycle, typed media handoff, Core-backed folder/subtitle/vocabulary flows, and remote sources before claiming cross-client Video parity.
- **Status:** Partially addressed for local SAF video selection/playback and folder CRUD/moves; secure/remote playback and restore remain open.

### ANDROID-PARITY-09 — Browser Anki scheduling still uses a duplicate FSRS implementation

- **Severity:** High
- **Dimension:** Cross-client scheduling correctness
- **Evidence:** `ts-fsrs` 5.4.1 implements FSRS-6 and accepts 17-, 19-, and 21-value configurations. `core/synapse-core/src/fsrs/` now implements the FSRS-6 parameter migration, decay curve, short-term updates, learning/relearning steps, and interval ordering. SQLite migration 8 persists each card's learning-step index. Android UniFFI and the Tauri review command both call `AnkiRepository::record_card_review_conn`; the browser IndexedDB adapter still imports `processReview` and `previewIntervals` from `apps/web-react/src/services/fsrs.ts`.
- **Impact:** Android and Tauri now share Core scheduling behavior. Browser and native schedule equivalence has not been compared numerically, and browser review results still use the TypeScript scheduler.
- **Action:** Expose the parameterized Core scheduler through the browser WASM bridge, route browser review and interval previews through it, then compare all supported weight-vector lengths and learning-step transitions with `ts-fsrs` before deleting the duplicate scheduler.
- **Status:** Partially resolved; Android and Tauri use Core, browser migration and cross-client numerical verification remain open.

### ANDROID-PARITY-04 — Vault has no Android key ownership or encrypted store

- **Severity:** Critical before accepting credentials
- **Dimension:** Security, correctness
- **Evidence:** Android has no auth/keychain lifecycle or Vault UniFFI store. The Vault screen starts empty and has no repository. Core Vault CRUD stores supplied field values directly in the existing columns. The canonical crypto skill confirms Android has no account keychain flow, and the native encryption audit confirms no native key migration flow.
- **Impact:** Persisting credentials before Android key management and encrypted persistence exist could expose secrets or imply protection that is not present.
- **Action:** Define Android key ownership and compatibility with the shared keychain; migrate every existing Vault field transactionally; add typed encrypted Core/UniFFI operations plus lock-time memory cleanup; then build and verify the native CRUD flows before enabling writes.
- **Status:** Open; keep empty state until the secure path is complete.

### ANDROID-PARITY-05 — Local Finance database filename is feature-specific

- **Severity:** Low
- **Dimension:** Organization, migration
- **Evidence:** The typed Finance store opens `synapse-finance.sqlite`, while the canonical database schema includes multiple shared domains. Calendar now uses the same path through `SynapseDatabase` so existing Finance data is not stranded.
- **Impact:** The name no longer describes all contents, but renaming without migration could strand existing app data.
- **Action:** Retain the current file for compatibility; add an explicit, verified database migration before any future rename.
- **Status:** Documented; migration not required for current feature work.

### WEB-CORE-01 — React Calendar commands still own SQLite writes

- **Severity:** High
- **Dimension:** Architecture, domain duplication
- **Evidence:** `apps/web-react/src-tauri/src/cmd_calendar.rs` assembles Calendar `INSERT ... ON CONFLICT` and partial `UPDATE` SQL even though `core/synapse-core/src/domain/calendar/` owns a repository. The Core event file is also above the repository's 300-line target.
- **Impact:** React/Tauri and Android can apply different defaults and update semantics for the same Calendar entities. New Android operations use Core, while the current React write path still bypasses it.
- **Action:** Move full event upsert and patch semantics into a decomposed Core Calendar domain, then make Tauri commands typed delegators and keep UniFFI on the same canonical operations.
- **Status:** Open; record as a React/Core remediation gate before claiming shared Calendar behavior.

### WEB-CORE-02 — Multiple React/Tauri domain commands bypass existing Core repositories

- **Severity:** High
- **Dimension:** Architecture, business logic duplication
- **Evidence:** The source scan found direct SQLite statements in `cmd_anki.rs`, `cmd_focus.rs`, `cmd_files.rs`, `cmd_notes.rs`, and `cmd_culture.rs`, while corresponding `synapse-core` domains exist. Habit commands were converted to Core repository delegators in this review. `cmd_calendar.rs` is tracked separately because its create/update operations were inspected in detail.
- **Impact:** Platform clients can drift in persistence semantics and business calculations; extending Android through Core alone would not establish one canonical implementation while React/Tauri retains parallel writes.
- **Action:** Trace each command contract and move canonical queries/calculations into focused Core repository files; keep Tauri commands as typed async delegators and expose the same contracts through UniFFI.
- **Status:** Partially addressed for Habits; open for remaining command files and the detailed migration inventory in Phase 0/1.

### WEB-CORE-03 — React Video catalog and folder mutations bypass the shared Video repository

- **Severity:** High
- **Dimension:** Architecture, cross-client data consistency
- **Evidence:** `VideoView` loads and updates catalog rows through `window.api.sync.getTable` and `upsertRow`, while Android now uses typed `SynapseVideoStore` operations backed by `synapse-core`. The web upload, subtitle, progress, folder, and deletion services also write Video metadata through generic sync operations instead of the Video domain repository.
- **Impact:** React and Android can apply different validation, defaults, deletion, and folder semantics to the same Video records.
- **Action:** Move canonical Video catalog metadata and folder mutations into focused `synapse-core` repository operations, then make React/Tauri and UniFFI clients delegate to those contracts while retaining platform-specific media transport.
- **Status:** Open; Android consumes Core for its current local flows, but React Video remains on generic sync-table writes.

### ANDROID-PARITY-06 — Culture ratings defaulted to a fabricated value

- **Severity:** Medium
- **Dimension:** Data integrity, correctness
- **Evidence:** `CultureMediaItem.score` defaulted every entry to `8.5`, and the screen averaged that value despite there being no rating field in the native creation flow or the shared `CultureItem` model.
- **Impact:** The catalog displayed a false personal rating and average.
- **Action:** Make the rating optional and render it only when a real rating is supplied by a supported source.
- **Status:** Resolved in this review; the shared Culture model still needs a rating contract before native rating edits are added.

### ANDROID-PARITY-07 — Core Trash mutations could fail silently or target the wrong Vault entity

- **Severity:** High
- **Dimension:** Data integrity, destructive operations
- **Evidence:** Trash row iteration flattened database errors, restore/delete cascades ignored SQL failures, and emptying ignored every per-table deletion result. The `vault` type also resolved to individual `vault_items` although React identifies deleted groups as `vault_groups`; the bulk-delete list included `focus_sessions` without a `deleted_at` column.
- **Impact:** Android and Tauri could report success after partial cleanup, restore the wrong Vault record, or leave a partially emptied trash.
- **Action:** Propagate row and SQL errors, execute multi-table operations in one Core transaction, align Vault and quiz-battery entities with React's trash contract, and omit unsupported tables.
- **Status:** Core operations corrected and Android now consumes them through typed UniFFI; Lofi physical-file cleanup and cross-client sync tombstones remain open.

### ANDROID-PARITY-08 — Native and React diagram document formats differ

- **Severity:** High
- **Dimension:** Data integrity, cross-client compatibility
- **Evidence:** React persists Tldraw snapshots and restores them with `loadSnapshot`; Android currently keeps Compose `Path` objects only in memory. Writing an unrelated native JSON payload into the shared `diagrams.content` field would make React restore fail and could replace the Android drawing on the next web edit.
- **Impact:** A platform-specific persistence patch would risk corrupting shared diagram data instead of establishing parity.
- **Action:** Define a versioned shared document contract or a Tldraw-compatible native adapter before connecting Android drawing writes to the canonical content field.
- **Status:** Partially addressed; Core-backed catalog CRUD, confirmation, error states, and guards for non-empty/encrypted content are implemented. Canvas persistence and interoperability remain open.
