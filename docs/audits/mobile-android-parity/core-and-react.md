# Core and React Remediation

See the [audit dashboard](./README.md) for priorities and handoff rules. This checklist covers shared persistence boundaries, evidence collection, and React/Tauri commands that still need to delegate to `synapse-core`.

## Phase 0 — Architecture and Evidence

- [x] Read repository, React, and Android `AGENTS.md` files, Android source routes, Core/UniFFI boundaries, and current security documentation.
- [x] Inventory React module directories, Android feature packages, native routes, core domains, and UniFFI exports.
- [x] Record route parity separately from data, security, and behavior parity.
- [x] Add this living checklist and link it from Android guidance and documentation status.
- [ ] Review each React module's user flows against its Android counterpart, including error, loading, empty, destructive, and offline behavior.
- [ ] Record reproducible acceptance evidence per completed module; historical audit checkboxes are not evidence for current source.

## Phase 1 — Shared Persistence Foundation

- [x] Reuse one Android SQLite path for feature stores while retaining the existing filename to avoid stranding existing Finance data.
- [x] Add Calendar UniFFI records and CRUD/status operations that delegate to `synapse-core`.
- [x] Move core error conversion into a shared bridge utility.
- [x] Replace Calendar's Compose-only state with a repository and lifecycle ViewModel.
- [x] Add typed UniFFI Culture item and episode operations through its existing Core repository.
- [x] Add typed UniFFI Habit item/check-in operations and shared streak statistics.
- [x] Add typed UniFFI Trash list/restore/permanent-delete/empty operations.
- [x] Migrate existing Lofi tables to include lifecycle timestamps used by Core listing and deletion.
- [x] Add typed UniFFI notification list/read/delete operations.
- [x] Add typed UniFFI Anki deck/card/review/settings/statistics operations and a Core-owned due queue.
- [x] Repair the Rust `Default` for Anki deck settings and migrate active rows created with the zero/empty defaults.
- [x] Replace the Android empty Anki route with a Core-backed deck/card/review flow.
- [x] Add typed UniFFI Focus completion and daily statistics operations.
- [x] Propagate Focus Lofi/alarm row mapping and alarm-toggle query failures instead of returning partial or default data.
- [x] Add typed UniFFI Practice session, transcript, and memory operations; keep ID, timestamp, and validation behavior in Core and reuse it from Tauri.
- [x] Migrate Focus session lifecycle timestamp columns expected by Core queries.
- [x] Add typed UniFFI APIs for Notes metadata, page creation, safe text editing, pinning, deletion, cycle-safe reparenting, page tree, and sibling reorder.
- [x] Expose recent Questions attempt history through a typed Core repository and UniFFI record.
- [x] Expose Core-owned Library bookmarks/highlights through typed UniFFI records and add native manual annotation management.
- [x] Expose Core Focus alarm list/create/toggle/delete through typed UniFFI operations for Android scheduling.
- [x] Expose atomic Core disable-on-delivery for Android Focus alarms to avoid a read/toggle race in the broadcast receiver.
- [x] Expose Core Focus Lofi list/import/delete APIs and typed track records for Android playback.
- [x] Expose Core Focus Lofi trashed-path/reference queries and delete Lofi rows when the shared Trash is emptied.
- [x] Add typed UniFFI APIs for Core-owned Files folder/item queries, bounded global search, type detection, metadata changes, moves, duplication, and soft deletion.
- [x] Add typed UniFFI APIs for the Core-owned Diagrams catalog and content operations; keep the Android editor from writing incompatible content.
- [x] Add typed UniFFI APIs for Video listing, SAF-backed local record creation, and Core-owned duration/progress updates.
- [x] Add typed UniFFI APIs for Video folder list/create/rename/delete/move operations.
- [ ] Add typed UniFFI APIs for Video subtitle, vocabulary, and restore operations.
- [x] Add typed UniFFI basic Library book creation/list/progress/statistics operations backed by Core.
- [x] Add typed UniFFI battery/question/attempt/statistics CRUD and filtered simulation operations for Questions.
- [x] Add typed UniFFI question-battery and multiple-choice question CRUD operations.
- [ ] Identify missing platform-neutral operations and add them to `synapse-core` before exposing them through UniFFI.
- [ ] Refactor React/Tauri domain commands that still assemble SQL to delegate to `synapse-core`, so React and Android consume the same canonical operations.
- [ ] Keep each bridge/store cohesive and below the repository's 250–300-line boundary.
- [ ] Add repository-level operation/error/loading state consistently without duplicating domain calculations in Kotlin.

## Current Architecture Scan — 2026-11-22

- [x] Static scan found no `RoomDatabase`, `SQLiteOpenHelper`, `SQLiteDatabase`, SQL statements, or Room entities/DAOs under `apps/mobile-android/app/src/main/java`; Android persistence remains behind the typed native bridge in the scanned source.
- [ ] Decompose `core/synapse-core/src/crypto/stream.rs`, currently 372 lines, into focused units where appropriate. It is the only Core source file above 300 lines in this length scan; no `bridge-uniffi` source file exceeded 300 lines. Preserve cryptographic behavior and follow the cryptography skill before changing it.
- [ ] Continue the Tauri SQL migration. Current source still contains direct domain SQL in `cmd_calendar.rs`, `cmd_anki.rs`, `cmd_focus.rs`, `cmd_files.rs`, and `cmd_notes.rs`; `cmd_culture.rs` also reads the episode row ID directly before delegating the mutation. `cmd_habits.rs` now uses the Core repository.
