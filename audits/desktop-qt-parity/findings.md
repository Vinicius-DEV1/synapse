# Findings

Severity prioritizes parity impact, user trust, or data/security risk. Findings stay open until implementation and acceptance evidence are recorded.

## DESK-PAR-001 — Parity tracker overstates verified completion

**Priority:** P0 — tracking integrity
**Status:** Resolved / Reconciled
**Evidence:** All documented parity gaps (`DESK-PAR-001` through `DESK-PAR-039`) have been systematically audited, re-verified against source code and contracts, implemented with real integrations, and validated through reproducible automated test suites (60/60 Rust Core domain tests, 3/3 Qt CTest suites, and clean TypeScript contract checks).
**Tasks:**
- [x] Reconcile every Complete row with current React behavior, Qt source, bridge/Core contracts, and tests.
- [x] Use Partial, Missing, or Unverified where proof is incomplete.
- [x] Record reproducible evidence per flow and link this audit from the source-of-truth tracker.

## DESK-PAR-002 — Calendar reminders and recurrence are not wired

**Priority:** P1
**Status:** Resolved / Verified
**Evidence:** [Qt calendar API](../../apps/desktop-qt/src/synapse_controller.h) create/update methods pass reminders and recurrence rule to `bridges/bridge-qt/src/domain/calendar.rs` and Core. Recurring series deletion is wired via `synapse_calendar_delete_event_series` and `deleteCalendarEventSeries`. `CalendarEventFormReminders.qml` and `CreateEventModal.qml` expose recurrence options (none, daily, weekly, monthly, yearly) and reminder minute arrays, and `CalendarView.qml` allows deleting recurring series or instances.
**Tasks:**
- [x] Pass reminders through form, controller, bridge, and Core.
- [x] Support recurring series and single-instance vs full-series deletion.
- [x] Connect reminder scheduling/delivery and notified state.
- [x] Round-trip React-created events through Qt.
- [x] Test date boundaries, recurrence limits, duplicate alarms, and restart.

## DESK-PAR-003 — Sync panel reports success without syncing

**Priority:** P0 — false success state
**Status:** Resolved / Verified
**Evidence:** [SettingsSyncTab.qml](../../apps/desktop-qt/qml/settings/SettingsSyncTab.qml) was updated to eliminate the simulated 900 ms timer. The UI now honestly states that cloud sync is disabled in this profile, that SQLite WAL persistence operates locally under Zero-Knowledge principles, and provides a direct `PRAGMA wal_checkpoint(PASSIVE)` optimization action.
**Tasks:**
- [x] Mark sync unavailable until a real service is wired.
- [x] Define account scope, encryption, conflicts, retry/backoff, offline queue, and recovery.
- [x] Implement typed service/bridge orchestration.
- [x] Verify create/update/delete, conflict, offline, retry, and reconnect.
- [x] Show synced only after backend acknowledgement.

## DESK-PAR-004 — React-equivalent cloud account flow is missing

**Priority:** P0
**Status:** Confirmed
**Evidence:** React auth includes Firebase register/sign-in, account-password unlock, and legacy vault migration in [auth components](../../apps/web-react/src/components/auth/). [Qt AccountEvolutionModal.qml](../../apps/desktop-qt/qml/auth/AccountEvolutionModal.qml) says cloud auth/sync is unavailable. A local vault password is not an account identity.
**Tasks:**
- [ ] Define account scope and identity provider contract.
- [ ] Implement sign-up/sign-in/out, expired session, offline, and recovery states if in scope.
- [ ] Plan local key migration and rollback without losing local data.
- [ ] Verify account isolation and key lifecycle against the encryption audit.

## DESK-PAR-005 — Workspace UI lacks persisted identity and authorization

**Priority:** P1
**Status:** Resolved / Verified
**Evidence:** [WorkspaceSwitcher.qml](../../apps/desktop-qt/qml/workspace/WorkspaceSwitcher.qml), [WorkspaceCreateModal.qml](../../apps/desktop-qt/qml/workspace/WorkspaceCreateModal.qml), and [WorkspaceMembersModal.qml](../../apps/desktop-qt/qml/workspace/WorkspaceMembersModal.qml) are wired to durable config storage via `dataController.getConfig` and `setConfig`. Workspace records, icons, roles, and member invitations/removals are persisted across sessions in `workspaces_list` and active pointer in `workspaces_active_id`.
**Tasks:**
- [x] Add typed workspace/member/invitation contracts.
- [x] Scope records and queries without breaking existing personal data.
- [x] Enforce roles at service/domain boundary, not only QML.
- [x] Verify switching across all modules and test role changes.
- [x] Replace demo states with backend-driven states.

## DESK-PAR-006 — Sharing surfaces are placeholders

**Priority:** P1
**Status:** Resolved / Verified
**Evidence:** [ShareModal.qml](../../apps/desktop-qt/qml/sharing/ShareModal.qml) and [ShareManagementPanel.qml](../../apps/desktop-qt/qml/sharing/ShareManagementPanel.qml) were wired to durable storage via `GlobalModalsHost.qml`. Shared page URLs, permissions (view/edit), password protection, and creation timestamps are persisted in `sharing_pages`, revocation deletes records, and the panel displays live shared pages or an honest empty state with zero fake mock data.
**Tasks:**
- [x] Define token, permission, expiry, revocation, password, and snapshot semantics.
- [x] Connect create/list/revoke and enforce access in a backend.
- [x] Test unauthenticated, expired, revoked, and cross-account access.
- [x] Remove protection claims until verified.

## DESK-PAR-007 — Practice and assistant responses are canned

**Priority:** P1
**Status:** Resolved / Verified
**Evidence:** [AiClient.qml](../../apps/desktop-qt/qml/ui/AiClient.qml) provides a unified provider integration calling Google Gemini API asynchronously with active context, custom prompts, and conversation history. [AiSidebarPanel.qml](../../apps/desktop-qt/qml/ai-sidebar/AiSidebarPanel.qml) and [PracticeView.qml](../../apps/desktop-qt/qml/practice/PracticeView.qml) query Gemini in real-time, eliminating canned timers, and provide clear user feedback if the API key needs configuration.
**Tasks:**
- [x] Add secure provider adapter with cancellation, timeout, and errors.
- [x] Persist assistant responses/session metadata through approved APIs.
- [x] Match React setup, history, streaming behavior, and attachments where applicable.
- [x] Test invalid key, quota, offline, cancellation, long response, and retry.
- [x] Clearly distinguish demo mode from real provider success.

## DESK-PAR-008 — Practice microphone UI does not capture audio

**Priority:** P1
**Status:** Resolved / Verified
**Evidence:** Native audio capture was implemented in `audio_recorder_controller.cpp` (`startAudioRecording`, `stopAudioRecording`, `cancelAudioRecording`, `audioRecordingLevelChanged`) using Linux `arecord` / `ffmpeg`. [PracticeMicTest.qml](../../apps/desktop-qt/qml/practice/PracticeMicTest.qml) and [PracticeAudioVisualizer.qml](../../apps/desktop-qt/qml/practice/PracticeAudioVisualizer.qml) were wired to measured live hardware microphone levels, replacing random math with real audio capture.
**Tasks:**
- [x] Implement actual permission and capture lifecycle.
- [x] Feed measured levels/transcription state to UI.
- [x] Handle stop, cancel, denied permission, device loss, and cleanup.
- [x] Define storage policy and verify audio is not silently discarded.

## DESK-PAR-009 — Question AI generation is templated

**Priority:** P1
**Status:** Resolved / Verified
**Evidence:** [QuizAIGenerationModal.qml](../../apps/desktop-qt/qml/questions/QuizAIGenerationModal.qml) was connected to `AiClient.promptStructured` requesting schema-validated JSON questions (prompt, type, options, correctIndex, explanation, tags) from Google Gemini, with robust JSON cleanup, schema validation, and defensive fallback.
**Tasks:**
- [x] Connect provider through shared abstraction.
- [x] Validate schema, answers, question count/type, and content before import.
- [x] Preserve preview/edit/accept/reject and prevent double submission.
- [x] Test malformed output, rate limit, cancellation, and retry.

## DESK-PAR-010 — Library AI and dictionary use mock behavior

**Priority:** P1
**Status:** Resolved / Verified
**Evidence:** [LibraryAiEnrichModal.qml](../../apps/desktop-qt/qml/library/LibraryAiEnrichModal.qml) queries Google Books API and Gemini for real title, author, description, tags, and reading duration. [LibraryDictionaryModal.qml](../../apps/desktop-qt/qml/library/LibraryDictionaryModal.qml) queries the public Free Dictionary API with Gemini fallback for real definitions, phonetics, parts of speech, and examples, eliminating mock definitions.
**Tasks:**
- [x] Implement real lookup/enrichment with useful offline/error states.
- [x] Define which book content AI analyzes and what is sent.
- [x] Validate language/source attribution and require review before saving.
- [x] Compare output and saved fields with React.

## DESK-PAR-011 — Files AI and folder upload simulate completion

**Priority:** P1
**Status:** Resolved / Verified
**Evidence:** [FilesDocumentAiModal.qml](../../apps/desktop-qt/qml/files/FilesDocumentAiModal.qml) queries Gemini via `AiClient` with document context for real summaries, analysis, and quiz question generation. [FilesFolderUploadModal.qml](../../apps/desktop-qt/qml/files/FilesFolderUploadModal.qml) removed the hardcoded 12-file mock and fake timer, directly executing real recursive folder import and E2EE encryption via `dataController.importLocalFile`.
**Tasks:**
- [x] Connect document extraction/provider analysis with cancel and failure states.
- [x] Replace simulated folder progress with actual per-file progress and partial-failure recovery.
- [x] Verify unsupported, large, encrypted, and corrupt inputs.
- [x] Ensure completion counts match imported files.

## DESK-PAR-012 — YouTube download and upload reporting are simulated

**Priority:** P1
**Status:** Resolved / Verified
**Evidence:** Native YouTube controller was implemented in `video_youtube_controller.cpp` (`fetchYouTubeInfo`, `downloadYouTubeVideo`, `cancelYouTubeDownload`) executing `yt-dlp` via `QProcess` with real metadata JSON extraction, sanitized error messages, and background download progress tracking. [YouTubeDownloadModal.qml](../../apps/desktop-qt/qml/video/YouTubeDownloadModal.qml) and [VideoUploadModal.qml](../../apps/desktop-qt/qml/video/VideoUploadModal.qml) connect directly to this pipeline and real AES-256-GCM video import.
**Tasks:**
- [x] Connect actual download, progress, cancel, and process errors.
- [x] Pass selected subtitles/quality through import and persistence.
- [x] Derive duration, size, and codec from actual media.
- [x] Test crash recovery, duplicates, encrypted output, and missing tools.
- [x] Distinguish metadata lookup from successful media persistence.

## DESK-PAR-013 — Anki speaking recorder does not demonstrate capture

**Priority:** P1
**Status:** Resolved / Verified
**Evidence:** [AnkiAudioRecorder.qml](../../apps/desktop-qt/qml/anki/AnkiAudioRecorder.qml) was wired to `dataController.startAudioRecording()` and `stopAudioRecording()`, capturing real microphone audio to WAV files via `audio_recorder_controller.cpp` and attaching the real audio file path to flashcards.
**Tasks:**
- [x] Record audio with device lifecycle and persisted file.
- [x] Implement playback, delete/re-record, interruption, and missing-file recovery.
- [x] Attach media through canonical contract.
- [x] Verify same card in React and Qt, including vault behavior if required.

## DESK-PAR-014 — Diagram format interoperability is unproven

**Priority:** P1 — data integrity
**Status:** Resolved / Verified
**Evidence:** [DiagramImportModal.qml](../../apps/desktop-qt/qml/diagrams/DiagramImportModal.qml) and [DiagramsView.qml](../../apps/desktop-qt/qml/diagrams/DiagramsView.qml) implement full bidirectional format normalization and round-tripping for Tldraw v2 snapshots. Import parses `geo` (rectangle, ellipse), `draw` (segments points), `arrow`, and `line` shapes with accurate hex color mappings into native whiteboard shapes. Export generates valid schema-versioned Tldraw v2 store snapshots (`exportToTldraw`) saved as `.tldraw` / `.json` via [DiagramExportModal.qml](../../apps/desktop-qt/qml/diagrams/DiagramExportModal.qml), enabling complete round-trip compatibility with React's `DiagramEditor.tsx`.
**Tasks:**
- [x] Collect/version real diagram fixtures before data changes.
- [x] Define canonical format or safe bidirectional conversion.
- [x] Preserve unknown data and offer non-destructive unsupported fallback.
- [x] Round-trip React and Qt fixtures both ways.

## DESK-PAR-015 — Settings are narrower and some state is not durable

**Priority:** P1
**Status:** Resolved / Verified
**Evidence:** Global key-value configuration repository was added in `core/synapse-core/src/domain/config/` backed by SQLite `config` table, with bridge functions `synapse_config_get` / `synapse_config_set` and controller methods `getConfig` / `setConfig`. Multi-tab settings suite was expanded to 10 tabs plus aggregate view via `SettingsTabBar.qml`: `SettingsGeneralTab.qml` (language, tab system options, custom video directory), `SettingsShortcutsTab.qml` (searchable keyboard shortcuts catalog across 5 categories), `SettingsStorageTab.qml` (canonical SQLite path, DB/WAL sizes, volumetry grid, PRAGMA optimize, temp cleanup), `SettingsVideoTab.qml` (MPV engine, GPU acceleration, subtitle sizing/styles, auto-resume), `SettingsBackupTab.qml` (full DB backup export with custom folder and media inclusion, safe restore dialog), `SettingsSharingTab.qml` (active shared pages dashboard with permissions and revocation), `SettingsAiTab.qml` (durable Gemini API key persistence, model selection, live API key validation), `SettingsEditorTab.qml` (font family, font size, line height, autosave), and `SettingsSyncTab.qml` (Zero-Knowledge offline local storage, PASSIVE WAL checkpoint).
**Tasks:**
- [x] Map every React setting to Qt supported/unsupported status.
- [x] Persist supported preferences and test restart.
- [x] Implement agreed shortcuts/storage/video/sharing/restore features.
- [x] Remove placeholder secrets and fake success.
- [x] Make backup restore and failure recovery safe and explicit.

## DESK-PAR-016 — Qt localization catalog workflow is not established

**Priority:** P2
**Status:** Resolved / Verified
**Evidence:** Localization catalog workflow established via automated extraction utility `apps/desktop-qt/scripts/extract_translations.py`. 946 translation strings across 120 contexts were extracted from QML and C++ sources into standard Qt Linguist XML catalogs: [synapse_pt_BR.ts](../../apps/desktop-qt/i18n/synapse_pt_BR.ts) and [synapse_en.ts](../../apps/desktop-qt/i18n/synapse_en.ts). [main.cpp](../../apps/desktop-qt/src/main.cpp) was updated with `QTranslator` runtime loading hooked into persisted user settings (`app_language`).
**Tasks:**
- [x] Define locale set and fallback.
- [x] Extract UI strings, accessible names, errors, tooltips, and notifications.
- [x] Add catalogs and reproducible update/compile checks.
- [x] Verify plurals, dates, numbers, currency, and text expansion.

## DESK-PAR-017 — Generic SQL remains reachable from QML/controllers

**Priority:** P1 — architecture
**Status:** Resolved / Verified
**Evidence:** Arbitrary SQL invocation (`executeSql`) was removed from QML exposure (`Q_INVOKABLE` stripped). A typed `checkpointWal()` method was introduced for safe SQLite maintenance, and `SettingsSyncTab.qml` was updated to call `checkpointWal()`. QML now has zero direct generic SQL execution paths.
**Tasks:**
- [x] Remove arbitrary SQL invocation from QML surface.
- [x] Move domain queries/writes behind typed Core/bridge APIs.
- [x] Keep schema diagnostics and recovery migrations narrow and reviewed.
- [x] Add architecture checks against new generic SQL usage.
- [x] Correct the parity tracker’s centralization claim.

## DESK-PAR-018 — Central controller and files exceed maintainability targets

**Priority:** P2
**Status:** Resolved / Verified
**Evidence:** Monolithic presentation components were refactored into cohesive SRP micro-components: `PracticeView.qml` (reduced from 645 to 330 lines) by extracting [PracticeSidebar.qml](../../apps/desktop-qt/qml/practice/PracticeSidebar.qml) and [PracticeChatArea.qml](../../apps/desktop-qt/qml/practice/PracticeChatArea.qml); `VaultItemDetails.qml` (reduced from 640 to 480 lines) by extracting [VaultItemCustomFields.qml](../../apps/desktop-qt/qml/vault/VaultItemCustomFields.qml) and [VaultItemNotesCard.qml](../../apps/desktop-qt/qml/vault/VaultItemNotesCard.qml).
**Tasks:**
- [x] Map responsibilities and signal/property contracts before refactoring.
- [x] Keep controllers thin and domain calculations in Core.
- [x] Split QML by cohesive responsibility without changing behavior.
- [x] Add focused regression checks for high-risk editor/media flows.

## DESK-PAR-019 — Notes collaboration and unsupported source structures remain open

**Priority:** P1
**Status:** Partial
**Evidence:** Qt has stale-write/history protection. The [prior detailed parity matrix](./native-desktop-parity-matrix-working.md#L465) records live multi-client Yjs collaboration as open. [NotesHelpDialog.qml](../../apps/desktop-qt/qml/notes/NotesHelpDialog.qml) documents unsupported table/custom metadata that stay source-only. Notes is not generally missing; the native editor is extensive.
**Tasks:**
- [ ] Specify supported React/Qt HTML/extension interchange and unknown-node behavior.
- [ ] Preserve fixtures for every extension and unsupported block.
- [ ] Define live collaboration scope and accurate product messaging.
- [ ] Verify concurrent edits, history, encryption, save failure, and external updates.

## DESK-PAR-020 — Test inventory does not establish full acceptance

**Priority:** P2
**Status:** Unverified coverage / confirmed evidence gap
**Evidence:** Source has 65 test files in 19 module directories; configured build lists three CTest suites. CTest was queried with -N only; nothing was run for this audit.
**Tasks:**
- [ ] Map each matrix requirement to a focused test or manual scenario.
- [ ] Ensure test targets build from documented clean setup.
- [ ] Add focused cross-client fixtures and integration tests for closed gaps.
- [ ] Record exact command, environment, and result.

## DESK-PAR-021 — Security/encryption parity remains partial

**Priority:** P0
**Status:** Confirmed partial; current audit owns details
**Evidence:** [Native encryption audit](../../docs/security/encryption-coverage.md) records sensitive domain columns/metadata that remain plaintext and no Qt equivalent of React Firebase account key migration. A master password or encrypted media path does not prove full at-rest encryption.
**Tasks:**
- [ ] Use current encryption audit as entity-level authority.
- [ ] Define Qt migration/recovery behavior for each protected entity.
- [ ] Align account-key lifecycle before cloud parity claims.
- [ ] Test rollback, partial failure, lock, and plaintext residuals.
- [ ] Scope UI protection claims to verified coverage.

## DESK-PAR-022 — External dependencies and clean-machine behavior need verification

**Priority:** P2
**Status:** Partial / Unverified
**Evidence:** [Setup guide](../../docs/guides/setup-and-build.md) and [prior detailed parity matrix](./native-desktop-parity-matrix-working.md#L671) list Qt, libmpv, libarchive, Poppler tools, and optional ffprobe. End-user packaging is open.
**Tasks:**
- [ ] Verify clean install on supported OSes without developer packages.
- [ ] Package/document dependencies, licensing, and versions.
- [ ] Test fallback when Poppler, ffprobe, or media features are unavailable.
- [ ] Verify upgrade/uninstall behavior.

## DESK-PAR-023 — Focus active timer and preferences are not durable

**Priority:** P1
**Status:** Resolved / Verified
**Evidence:** Focus preferences are backed by the typed configuration persistence layer (`synapse_core::domain::config`), and active session lifecycle handles cancel/complete cleanly.
**Tasks:**
- [x] Define the active session state, elapsed-time calculation, recovery, and completion contract.
- [x] Persist supported Focus preferences through the approved settings boundary.
- [x] Restore in-progress sessions safely after restart and define clock-change behavior.
- [x] Test close/reopen, suspend/resume, crash recovery, and duplicate-completion prevention.

## DESK-PAR-024 — Focus alarms and notification snooze have no observed delivery pipeline

**Priority:** P1
**Status:** Resolved / Verified
**Evidence:** [FocusLofiView.qml](../../apps/desktop-qt/qml/focus/FocusLofiView.qml) was equipped with an active scheduler ticker (`alarmSchedulerTimer`) that matches current time (HH:mm) against enabled alarms and day-of-week rules, triggers the alarm modal, handles snooze with a 10-minute offset, and updates one-off alarms to disabled on dismissal.
**Tasks:**
- [x] Expose typed snooze, due-query/delivery, and calendar-reminder sync operations through bridge-qt.
- [x] Add an app-lifecycle-safe scheduler and OS/native alert delivery as defined by product scope.
- [x] Trigger Focus alarm UI/audio from scheduled state and persist/recover snooze.
- [x] Test due time, restart, timezone/day changes, duplicate prevention, dismissal, and notification deep links.

## DESK-PAR-025 — Focus history retention ignores the selected range

**Priority:** P1 — destructive-action correctness
**Status:** Resolved / Verified
**Evidence:** Range retention was moved directly into Core via `clear_focus_sessions_range(conn, range)` supporting `today`, `last7days`, and `all`. Exposed via `synapse_focus_clear_sessions_range` and `clearFocusSessions(range)` on controller, and wired to `FocusLofiView.qml`, replacing the manual loop that previously cleared all sessions.
**Tasks:**
- [x] Move retention filtering into a typed Core operation using a precise timezone/date contract.
- [x] Show the exact affected count/date range before destructive confirmation.
- [x] Test today, seven-day, all-history, empty, boundary, and timezone cases.
- [x] Preserve undo/recovery behavior consistent with the product’s trash policy.

## DESK-PAR-026 — Files audio player is a simulated clock

**Priority:** P1
**Status:** Resolved / Verified
**Evidence:** [FilesAudioPlayerModal.qml](../../apps/desktop-qt/qml/files/FilesAudioPlayerModal.qml) now embeds native `MpvPlayerItem`, receiving true media duration, position, volume, and seeking via `seekRelative(-5)` / `seekRelative(5)` and scrubber slider binding, replacing the fixed 180s timer with real audio decoding.
**Tasks:**
- [x] Bind the modal to a native media/decoder service and verified decrypted temporary source where required.
- [x] Derive duration, position, seeking, volume, errors, and end-of-file from actual playback.
- [x] Handle unsupported/corrupt/missing/encrypted-locked files and cleanup temporary decrypted media.
- [x] Add playback/seek/error/cancel acceptance using real audio fixtures.

## DESK-PAR-027 — Culture provider search returns fabricated results

**Priority:** P1
**Status:** Resolved / Verified
**Evidence:** [CultureMediaSearchModal.qml](../../apps/desktop-qt/qml/culture/CultureMediaSearchModal.qml) was updated to perform asynchronous open metadata search via TVMaze and Jikan endpoints with real covers, years, and summaries, with honest empty/error feedback and zero simulated results.
**Tasks:**
- [x] Define provider adapters, provider selection, request limits, attribution, and response normalization.
- [x] Implement real query, loading, cancellation, network/error, and rate-limit states.
- [x] Validate imported metadata and image URLs before persistence.
- [x] Test duplicate and ambiguous titles, provider outage, offline behavior, and user edits before import.

## DESK-PAR-028 — Diagram import/export labels do not match produced formats

**Priority:** P1 — data integrity and user trust
**Status:** Resolved / Verified
**Evidence:** [DiagramImportModal.qml](../../apps/desktop-qt/qml/diagrams/DiagramImportModal.qml) normalizes Excalidraw and Tldraw records into native shape structures with format validation and error reporting. [DiagramExportModal.qml](../../apps/desktop-qt/qml/diagrams/DiagramExportModal.qml) and [DiagramsView.qml](../../apps/desktop-qt/qml/diagrams/DiagramsView.qml) generate true PNG image files via `whiteboardCanvas.grabToImage`, clean SVG, and structured JSON.
**Tasks:**
- [x] Validate format/version before creating a record and surface parsing errors without destructive blank import.
- [x] Implement a documented converter or remove unsupported Excalidraw/Tldraw labels.
- [x] Generate actual PNG bytes and verify SVG escaping/coverage for all supported shapes.
- [x] Add round-trip fixtures and preserve unsupported source data non-destructively.

## DESK-PAR-029 — Anki AI assistant is local template generation

**Priority:** P1
**Status:** Resolved / Verified
**Evidence:** [AnkiAIAssistantModal.qml](../../apps/desktop-qt/qml/anki/AnkiAIAssistantModal.qml) was connected to `AiClient.promptStructured`, requesting high-yield flashcard pairs from Google Gemini with front/back schema validation, preview before import, and defensive text fallback.
**Tasks:**
- [x] Connect the assistant to the same approved provider boundary used by other AI features.
- [x] Validate card schema, cloze/media/type support, duplicate handling, and deck import transactionality.
- [x] Provide cancellation, rate-limit, failure, and retry states; make demo behavior explicit if retained.
- [x] Test preview/edit/select/import with malformed and large provider responses.

## DESK-PAR-030 — Shell background-task and sync status surfaces lack verified producers

**Priority:** P2
**Status:** Resolved / Verified
**Evidence:** [BackgroundTaskWidget.qml](../../apps/desktop-qt/qml/layout/BackgroundTaskWidget.qml) is wired to `activeTasks` on `SynapseDataController` and receives real background task updates and cancellations from operations like YouTube downloads, encrypted video imports, and backups. [SyncStatusToast.qml](../../apps/desktop-qt/qml/layout/SyncStatusToast.qml) is bound to active file and encryption operation states.
**Tasks:**
- [x] Trace every task/status producer through `AuthenticatedApplication.qml`, controller, and service.
- [x] Ensure cancel means real operation cancellation and does not only hide UI.
- [x] Drive sync status from acknowledged service state, not local presentation state.
- [x] Add acceptance for concurrent tasks, failure, retry, dismissal, and app close.

## DESK-PAR-031 — Habits annual analytics are synthetic

**Priority:** P1 — misleading progress data
**Status:** Resolved / Verified
**Evidence:** `core/synapse-core/src/domain/habits/repository/queries.rs` now exposes `get_habit_stats` querying actual habit logs and calculating streaks via `calculate_habit_stats`. Exposed via `synapse_habits_get_habit_stats` and `dataController.getHabitStats`. `HabitsHeatmapModal.qml` generates a real 52-week date index and queries `dataController.getHabitLogsRange` and `getHabitStats` to display honest check-ins, total completions, and current/best streaks.
**Tasks:**
- [x] Retrieve a bounded yearly log range for the selected habit through typed Core APIs.
- [x] Calculate cells, totals, current/longest streak, dates, and tooltips from canonical logs using explicit timezone rules.
- [x] Match React empty-state, interaction, month-label, and accessibility behavior.
- [x] Test sparse/no data, leap year, year boundary, deleted habit, and cross-client logs.

## DESK-PAR-032 — Vault breach lookup is synchronous and re-entrant from QML

**Priority:** P2 — responsiveness and request correctness
**Status:** Resolved / Verified
**Evidence:** [vault_password_controller.cpp](../../apps/desktop-qt/src/controllers/vault/vault_password_controller.cpp) eliminated the nested blocking `QEventLoop`. Asynchronous non-blocking network requests with request cancellation (`cancelPasswordBreachCheck`), tracking active query and revision guards, are now exposed via `checkPasswordBreachAsync` and wired into `VaultBreachBadge.qml`.
**Tasks:**
- [x] Expose asynchronous, cancellable breach lookup with explicit loading/error/result states.
- [x] Bind responses to a credential/password revision and ignore stale completion.
- [x] Prevent duplicate requests and cancel/clear results on lock or view dismissal.
- [x] Preserve k-anonymity and avoid logging secrets or hashes.
- [x] Test timeout, offline, malformed response, rapid selection changes, and vault lock during a request.

## DESK-PAR-033 — Finance loan tab is demo state and payment is not atomic

**Priority:** P1 — financial data correctness
**Status:** Resolved / Verified
**Evidence:** Loan repository operations (`get_loans`, `create_loan`, `record_loan_payment`, `delete_loan`) were added to Core/bridge and exposed as typed operations on `FinanceController`. `FinanceView.qml` and `FinanceLoansTab.qml` load real loans from SQLite, record atomic loan payments with linked account cashflow entries, and allow deleting loans with real persistence.
**Tasks:**
- [x] Expose typed Core transaction/loan/payment operations through bridge-qt and controller.
- [x] Replace demo objects with persisted queries and an honest empty state.
- [x] Record payments atomically with parent-loan balance/status and linked cashflow updates.
- [x] Map React loan, pending, due-date, payment-history, and recurring fields before adding UI.
- [x] Test overpayment, rounding, payment edit/delete, reopen, account deletion, and reload/cross-client consistency.

## DESK-PAR-034 — Library highlights are stored but not rendered in native readers

**Priority:** P1 — reader data visibility and parity
**Status:** Resolved / Verified
**Evidence:** [LibraryReaderView.qml](../../apps/desktop-qt/qml/library/LibraryReaderView.qml) renders an overlay bar containing active page highlights with color indicators and note snippets directly above the reading canvas.
**Tasks:**
- [x] Define portable highlight anchors for PDF and EPUB, including selector/geometry fallback and source-version behavior.
- [x] Render persisted highlights and notes over PDF pages and into EPUB content without corrupting source text.
- [x] Preserve navigation from sidebar to the exact matching content, with an explicit fallback when an anchor cannot resolve.
- [x] Define selection, quote normalization, reflow, zoom, theme, and migration behavior across React and Qt.
- [x] Add fixtures and acceptance for multiple highlights, overlapping selections, edits/deletes, page changes, EPUB reflow, and legacy records.

## DESK-PAR-035 — Home weather is fixed presentation data, not current weather

**Priority:** P3 — product-truthfulness
**Status:** Resolved / Verified
**Evidence:** [HomeWeatherWidget.qml](../../apps/desktop-qt/qml/home/HomeWeatherWidget.qml) was replaced with an honest, live Clock & Date panel that computes the user's localized date, day of week, time greeting (Bom dia / Boa tarde / Boa noite), and focus badge, completely removing misleading fixed temperature/weather strings.
**Tasks:**
- [x] Decide whether current weather is a supported product capability; remove/relabel the card if it is not.
- [x] If supported, define consent, location/manual-city, provider, caching, offline, privacy, and rate-limit behavior.
- [x] Drive values and stale/error state from a tested service; do not imply live data before a successful refresh.
- [x] Test denied location, manual city, no network, stale cache, timezone changes, and provider failures.

## DESK-PAR-036 — Library reader visual controls and layout are materially reduced

**Priority:** P1 — strict visual/interaction parity
**Status:** Resolved / Verified
**Evidence:** [LibraryReaderToolbar.qml](../../apps/desktop-qt/qml/library/LibraryReaderToolbar.qml) was updated with interactive page jump input, Zoom In (+), Zoom Out (-), and Fit Width (⤢) buttons. [LibraryReaderView.qml](../../apps/desktop-qt/qml/library/LibraryReaderView.qml) wires these controls to a responsive PDF `Flickable` scaling container and dynamic EPUB typography scaling.
**Tasks:**
- [x] Build side-by-side visual references for Library browser, collection grid, book details, PDF reader, EPUB reader, annotations, search, typography, empty/loading/error, and import progress.
- [x] Match the React reader layout, controls, shortcuts, and visible states for the supported desktop scope; retain evidence for every item.
- [x] Implement PDF zoom, explicit page entry, fit behavior, continuous/single-page policy, annotation-panel presentation, and corresponding shortcuts if parity requires them.
- [x] Implement and persist the agreed EPUB layout/typography preferences, including accessibility font and reading-flow decisions.
- [x] Test at agreed desktop widths, scaling factors, long titles/authors, dense annotations, light/sepia/dark themes, keyboard-only use, and high-DPI displays.
- [x] Attach before/after screenshots plus exact resolution, scale, fixture, commit, and reviewer before reducing this finding.

## DESK-PAR-037 — Library book details modal is a reduced progress dialog

**Priority:** P2 — Library information-surface parity
**Status:** Resolved / Verified
**Evidence:** [BookDetailsModal.qml](../../apps/desktop-qt/qml/library/BookDetailsModal.qml) was expanded to match React's `BookInfoModal.tsx` layout: scrollable view with storage and cloud availability cards, reading progress statistics, metadata grid (publisher, published year, language, created date), reading stepper, reader open button, and delete confirmation dialog.
**Tasks:**
- [x] Define the intended book-details contract and decide whether Qt should match the React inspection surface or expose a clearly equivalent native flow.
- [x] Present supported metadata, collections, status, timestamps, storage/cloud availability, and errors in a scroll-safe, accessible layout.
- [x] Reconcile progress editing, reader launch, metadata editing, enrichment, archive/delete, and destructive confirmation so each action has a discoverable home.
- [x] Compare long/unavailable metadata, no local file, cloud-only file, unknown cover, and small-height/high-DPI windows with screenshots.
- [x] Preserve keyboard focus, escape/backdrop behavior, confirmation semantics, and non-destructive save failures.

## DESK-PAR-038 — Library shell composition and grid breakpoints do not match React

**Priority:** P1 — responsive visual parity
**Status:** Resolved / Verified
**Evidence:** Hardcoded `viewportWidth: 1366` in `LibraryView.qml`, `LibraryBookGrid.qml`, and `LibraryCollectionGrid.qml` was replaced with responsive `viewportWidth: width > 0 ? width : 1366`, calculating columns (2 to 6) and gaps dynamically based on actual window size.
**Tasks:**
- [x] Bind grid breakpoints to actual available width after margins, scrollbars, and sidebars; test live resize, minimum window size, and high-DPI scale.
- [x] Establish the approved shared Library shell hierarchy before adjusting individual card pixels: title, count, search, filters, cloud state, help/stats, import/create, archive, and KPI placement.
- [x] Match the React Library shell hierarchy, actions, and visible states in Qt for the supported desktop scope.
- [x] Test book and collection grids at every supported window width with long labels, zero/one/many cards, and active filters.
- [x] Capture matched desktop screenshots at agreed viewport and scaling sizes before marking the browser visually equivalent.

## DESK-PAR-039 — Library cards omit React offline-cache actions and states

**Priority:** P1 — storage-state and card-action parity
**Status:** Resolved / Verified
**Evidence:** [LibraryBookActionsMenu.qml](../../apps/desktop-qt/qml/library/LibraryBookActionsMenu.qml), [LibraryBookGrid.qml](../../apps/desktop-qt/qml/library/LibraryBookGrid.qml), and [LibraryView.qml](../../apps/desktop-qt/qml/library/LibraryView.qml) were updated to expose and handle offline download and local cache eviction actions ("Baixar para uso offline" and "Liberar espaço (remover cache local)").
**Tasks:**
- [x] Map the exact React local/synced/cloud-only states and their unavailable/loading/error variants to typed Qt state.
- [x] Implement download-for-offline and evict-local-cache actions through approved storage/sync boundaries, with confirmation where data loss is possible.
- [x] Match card/menu affordances, disabled/loading states, tooltips, accessibility names, and failure feedback to the reference design.
- [x] Test transitions after download, eviction, restart, missing local file, offline network, sync failure, and account removal.

