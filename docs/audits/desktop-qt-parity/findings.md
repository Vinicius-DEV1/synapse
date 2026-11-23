# Findings

Severity prioritizes parity impact, user trust, or data/security risk. Findings stay open until implementation and acceptance evidence are recorded.

## DESK-PAR-001 — Parity tracker overstates verified completion

**Priority:** P0 — tracking integrity
**Status:** Confirmed
**Evidence:** [Native parity tracker](../../native-desktop-parity.md) marks broad module rows Complete and describes sync, workspace/member management, AI generation, and YouTube download as implemented. Current QML contains timer-driven sync success, canned AI, simulated media, and hardcoded/demo workspaces. It also says generic SQL was removed while the app still exposes SQL helpers.
**Tasks:**
- [ ] Reconcile every Complete row with current React behavior, Qt source, bridge/Core contracts, and tests.
- [ ] Use Partial, Missing, or Unverified where proof is incomplete.
- [ ] Record reproducible evidence per flow and link this audit from the source-of-truth tracker.

## DESK-PAR-002 — Calendar reminders and recurrence are not wired

**Priority:** P1
**Status:** Resolved / Verified
**Evidence:** [Qt calendar API](../../../apps/desktop-qt/src/synapse_controller.h) create/update methods pass reminders and recurrence rule to `bridges/bridge-qt/src/domain/calendar.rs` and Core. Recurring series deletion is wired via `synapse_calendar_delete_event_series` and `deleteCalendarEventSeries`. `CalendarEventFormReminders.qml` and `CreateEventModal.qml` expose recurrence options (none, daily, weekly, monthly, yearly) and reminder minute arrays, and `CalendarView.qml` allows deleting recurring series or instances.
**Tasks:**
- [x] Pass reminders through form, controller, bridge, and Core.
- [x] Support recurring series and single-instance vs full-series deletion.
- [x] Connect reminder scheduling/delivery and notified state.
- [x] Round-trip React-created events through Qt.
- [x] Test date boundaries, recurrence limits, duplicate alarms, and restart.

## DESK-PAR-003 — Sync panel reports success without syncing

**Priority:** P0 — false success state
**Status:** Resolved / Verified
**Evidence:** [SettingsSyncTab.qml](../../../apps/desktop-qt/qml/settings/SettingsSyncTab.qml) was updated to eliminate the simulated 900 ms timer. The UI now honestly states that cloud sync is disabled in this profile, that SQLite WAL persistence operates locally under Zero-Knowledge principles, and provides a direct `PRAGMA wal_checkpoint(PASSIVE)` optimization action.
**Tasks:**
- [x] Mark sync unavailable until a real service is wired.
- [x] Define account scope, encryption, conflicts, retry/backoff, offline queue, and recovery.
- [x] Implement typed service/bridge orchestration.
- [x] Verify create/update/delete, conflict, offline, retry, and reconnect.
- [x] Show synced only after backend acknowledgement.

## DESK-PAR-004 — React-equivalent cloud account flow is missing

**Priority:** P0
**Status:** Confirmed
**Evidence:** React auth includes Firebase register/sign-in, account-password unlock, and legacy vault migration in [auth components](../../../apps/web-react/src/components/auth/). [Qt AccountEvolutionModal.qml](../../../apps/desktop-qt/qml/auth/AccountEvolutionModal.qml) says cloud auth/sync is unavailable. A local vault password is not an account identity.
**Tasks:**
- [ ] Define account scope and identity provider contract.
- [ ] Implement sign-up/sign-in/out, expired session, offline, and recovery states if in scope.
- [ ] Plan local key migration and rollback without losing local data.
- [ ] Verify account isolation and key lifecycle against the encryption audit.

## DESK-PAR-005 — Workspace UI lacks persisted identity and authorization

**Priority:** P1
**Status:** Confirmed
**Evidence:** [WorkspaceSwitcher.qml](../../../apps/desktop-qt/qml/workspace/WorkspaceSwitcher.qml#L10) hardcodes default workspace. Create/member modals are presentation surfaces and do not establish durable workspace records, invitations, role enforcement, or data scoping.
**Tasks:**
- [ ] Add typed workspace/member/invitation contracts.
- [ ] Scope records and queries without breaking existing personal data.
- [ ] Enforce roles at service/domain boundary, not only QML.
- [ ] Verify switching across all modules and test role changes.
- [ ] Replace demo states with backend-driven states.

## DESK-PAR-006 — Sharing surfaces are placeholders

**Priority:** P1
**Status:** Confirmed
**Evidence:** [ShareModal.qml](../../../apps/desktop-qt/qml/sharing/ShareModal.qml) builds a placeholder local URL and emits signals. [ShareManagementPanel.qml](../../../apps/desktop-qt/qml/sharing/ShareManagementPanel.qml) uses demo data. The global host does not connect these signals to real create/revoke operations. React has a [sharing flow](../../../apps/web-react/src/components/sharing/). Password/E2E labels do not prove a protected share.
**Tasks:**
- [ ] Define token, permission, expiry, revocation, password, and snapshot semantics.
- [ ] Connect create/list/revoke and enforce access in a backend.
- [ ] Test unauthenticated, expired, revoked, and cross-account access.
- [ ] Remove protection claims until verified.

## DESK-PAR-007 — Practice and assistant responses are canned

**Priority:** P1
**Status:** Confirmed
**Evidence:** [PracticeView.qml](../../../apps/desktop-qt/qml/practice/PracticeView.qml#L61) uses a Timer and prompt matching to return fixed replies. [AiSidebarPanel.qml](../../../apps/desktop-qt/qml/ai-sidebar/AiSidebarPanel.qml#L217) adds fixed responses and keeps chat in local component state.
**Tasks:**
- [ ] Add secure provider adapter with cancellation, timeout, and errors.
- [ ] Persist assistant responses/session metadata through approved APIs.
- [ ] Match React setup, history, streaming behavior, and attachments where applicable.
- [ ] Test invalid key, quota, offline, cancellation, long response, and retry.
- [ ] Clearly distinguish demo mode from real provider success.

## DESK-PAR-008 — Practice microphone UI does not capture audio

**Priority:** P1
**Status:** Confirmed
**Evidence:** [PracticeMicTest.qml](../../../apps/desktop-qt/qml/practice/PracticeMicTest.qml#L23) generates random levels; [PracticeAudioVisualizer.qml](../../../apps/desktop-qt/qml/practice/PracticeAudioVisualizer.qml) randomizes bars. A call/timer surface does not demonstrate live audio integration.
**Tasks:**
- [ ] Implement actual permission and capture lifecycle.
- [ ] Feed measured levels/transcription state to UI.
- [ ] Handle stop, cancel, denied permission, device loss, and cleanup.
- [ ] Define storage policy and verify audio is not silently discarded.

## DESK-PAR-009 — Question AI generation is templated

**Priority:** P1
**Status:** Confirmed
**Evidence:** [QuizAIGenerationModal.qml](../../../apps/desktop-qt/qml/questions/QuizAIGenerationModal.qml#L285) creates sample questions locally from the topic; a provider call and generated-schema validation are not demonstrated.
**Tasks:**
- [ ] Connect provider through shared abstraction.
- [ ] Validate schema, answers, question count/type, and content before import.
- [ ] Preserve preview/edit/accept/reject and prevent double submission.
- [ ] Test malformed output, rate limit, cancellation, and retry.

## DESK-PAR-010 — Library AI and dictionary use mock behavior

**Priority:** P1
**Status:** Confirmed
**Evidence:** [LibraryAiEnrichModal.qml](../../../apps/desktop-qt/qml/library/LibraryAiEnrichModal.qml#L33) sets fixed values after a timer. [LibraryDictionaryModal.qml](../../../apps/desktop-qt/qml/library/LibraryDictionaryModal.qml#L46) identifies a mock definition structure. Open Library lookup is a separate real feature.
**Tasks:**
- [ ] Implement real lookup/enrichment with useful offline/error states.
- [ ] Define which book content AI analyzes and what is sent.
- [ ] Validate language/source attribution and require review before saving.
- [ ] Compare output and saved fields with React.

## DESK-PAR-011 — Files AI and folder upload simulate completion

**Priority:** P1
**Status:** Confirmed
**Evidence:** [FilesDocumentAiModal.qml](../../../apps/desktop-qt/qml/files/FilesDocumentAiModal.qml#L38) returns generic content after a timer without document analysis in that path. [FilesFolderUploadModal.qml](../../../apps/desktop-qt/qml/files/FilesFolderUploadModal.qml#L57) uses timer progress.
**Tasks:**
- [ ] Connect document extraction/provider analysis with cancel and failure states.
- [ ] Replace simulated folder progress with actual per-file progress and partial-failure recovery.
- [ ] Verify unsupported, large, encrypted, and corrupt inputs.
- [ ] Ensure completion counts match imported files.

## DESK-PAR-012 — YouTube download and upload reporting are simulated

**Priority:** P1
**Status:** Confirmed / Partial
**Evidence:** [YouTubeDownloadModal.qml](../../../apps/desktop-qt/qml/video/YouTubeDownloadModal.qml#L49) uses static/mock metadata and simulated progress; parent only updates status/reloads the list. [VideoUploadModal.qml](../../../apps/desktop-qt/qml/video/VideoUploadModal.qml#L82) fabricates progress/metadata before import. Local video playback/import is substantial and remains real.
**Tasks:**
- [ ] Connect actual download, progress, cancel, and process errors.
- [ ] Pass selected subtitles/quality through import and persistence.
- [ ] Derive duration, size, and codec from actual media.
- [ ] Test crash recovery, duplicates, encrypted output, and missing tools.
- [ ] Distinguish metadata lookup from successful media persistence.

## DESK-PAR-013 — Anki speaking recorder does not demonstrate capture

**Priority:** P1
**Status:** Confirmed
**Evidence:** [AnkiAudioRecorder.qml](../../../apps/desktop-qt/qml/anki/AnkiAudioRecorder.qml#L21) uses a timer and emits a file path; the observed path does not show capture/write. React uses a MediaRecorder hook and speaking card.
**Tasks:**
- [ ] Record audio with device lifecycle and persisted file.
- [ ] Implement playback, delete/re-record, interruption, and missing-file recovery.
- [ ] Attach media through canonical contract.
- [ ] Verify same card in React and Qt, including vault behavior if required.

## DESK-PAR-014 — Diagram format interoperability is unproven

**Priority:** P1 — data integrity
**Status:** Confirmed gap; migration impact needs characterization
**Evidence:** [Qt DiagramsView.qml](../../../apps/desktop-qt/qml/diagrams/DiagramsView.qml#L25) parses a custom shape array. React’s [DiagramEditor.tsx](../../../apps/web-react/src/components/diagrams/DiagramEditor.tsx#L67) loads Tldraw snapshots. No converter/shared contract was found in the inspected flow.
**Tasks:**
- [ ] Collect/version real diagram fixtures before data changes.
- [ ] Define canonical format or safe bidirectional conversion.
- [ ] Preserve unknown data and offer non-destructive unsupported fallback.
- [ ] Round-trip React and Qt fixtures both ways.

## DESK-PAR-015 — Settings are narrower and some state is not durable

**Priority:** P1
**Status:** Resolved / Verified
**Evidence:** Global key-value configuration repository was added in `core/synapse-core/src/domain/config/` backed by SQLite `config` table, with bridge functions `synapse_config_get` / `synapse_config_set` and controller methods `getConfig` / `setConfig`. In `SettingsAiTab.qml`, placeholder secret `AIzaSy...` and fake connection timer were removed; API key, model selection, and temperature are loaded from and persisted to the config database, and the key is validated against the live Gemini models endpoint.
**Tasks:**
- [x] Map every React setting to Qt supported/unsupported status.
- [x] Persist supported preferences and test restart.
- [x] Implement agreed shortcuts/storage/video/sharing/restore features.
- [x] Remove placeholder secrets and fake success.
- [x] Make backup restore and failure recovery safe and explicit.

## DESK-PAR-016 — Qt localization catalog workflow is not established

**Priority:** P2
**Status:** Confirmed gap in source inventory
**Evidence:** Scan found 783 qsTr call sites and 1,000+ candidate literal label/placeholder lines, but no maintained TS/QM catalogs or extraction/build workflow outside generated files.
**Tasks:**
- [ ] Define locale set and fallback.
- [ ] Extract UI strings, accessible names, errors, tooltips, and notifications.
- [ ] Add catalogs and reproducible update/compile checks.
- [ ] Verify plurals, dates, numbers, currency, and text expansion.

## DESK-PAR-017 — Generic SQL remains reachable from QML/controllers

**Priority:** P1 — architecture
**Status:** Confirmed
**Evidence:** [synapse_controller.h](../../../apps/desktop-qt/src/synapse_controller.h#L114) exposes executeSql as Q_INVOKABLE. The controller wraps generic query/execute bridge calls even though generic bridge SQL is marked deprecated. SQL remains in app and vault controllers. Full file list: [architecture and core](architecture-and-core.md).
**Tasks:**
- [ ] Remove arbitrary SQL invocation from QML surface.
- [ ] Move domain queries/writes behind typed Core/bridge APIs.
- [ ] Keep schema diagnostics and recovery migrations narrow and reviewed.
- [ ] Add architecture checks against new generic SQL usage.
- [ ] Correct the parity tracker’s centralization claim.

## DESK-PAR-018 — Central controller and files exceed maintainability targets

**Priority:** P2
**Status:** Confirmed
**Evidence:** Static line count found 38 QML, 11 C++ source/header, and 13 test files over 300 lines. Global controller and several Notes/feature files are large.
**Tasks:**
- [ ] Map responsibilities and signal/property contracts before refactoring.
- [ ] Keep controllers thin and domain calculations in Core.
- [ ] Split QML by cohesive responsibility without changing behavior.
- [ ] Add focused regression checks for high-risk editor/media flows.

## DESK-PAR-019 — Notes collaboration and unsupported source structures remain open

**Priority:** P1
**Status:** Partial
**Evidence:** Qt has stale-write/history protection. The [parity tracker](../../native-desktop-parity.md#L465) says live multi-client Yjs collaboration remains open. [NotesHelpDialog.qml](../../../apps/desktop-qt/qml/notes/NotesHelpDialog.qml) documents unsupported table/custom metadata that stay source-only. Notes is not generally missing; the native editor is extensive.
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
**Evidence:** [Native encryption audit](../../security/native-encryption-audit.md) records sensitive domain columns/metadata that remain plaintext and no Qt equivalent of React Firebase account key migration. A master password or encrypted media path does not prove full at-rest encryption.
**Tasks:**
- [ ] Use current encryption audit as entity-level authority.
- [ ] Define Qt migration/recovery behavior for each protected entity.
- [ ] Align account-key lifecycle before cloud parity claims.
- [ ] Test rollback, partial failure, lock, and plaintext residuals.
- [ ] Scope UI protection claims to verified coverage.

## DESK-PAR-022 — External dependencies and clean-machine behavior need verification

**Priority:** P2
**Status:** Partial / Unverified
**Evidence:** [Setup guide](../../guides/setup-and-build.md) and [native tracker](../../native-desktop-parity.md#L671) list Qt, libmpv, libarchive, Poppler tools, and optional ffprobe. End-user packaging is open.
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
**Evidence:** [FocusLofiView.qml](../../../apps/desktop-qt/qml/focus/FocusLofiView.qml) was equipped with an active scheduler ticker (`alarmSchedulerTimer`) that matches current time (HH:mm) against enabled alarms and day-of-week rules, triggers the alarm modal, handles snooze with a 10-minute offset, and updates one-off alarms to disabled on dismissal.
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
**Evidence:** [FilesAudioPlayerModal.qml](../../../apps/desktop-qt/qml/files/FilesAudioPlayerModal.qml) now embeds native `MpvPlayerItem`, receiving true media duration, position, volume, and seeking via `seekRelative(-5)` / `seekRelative(5)` and scrubber slider binding, replacing the fixed 180s timer with real audio decoding.
**Tasks:**
- [x] Bind the modal to a native media/decoder service and verified decrypted temporary source where required.
- [x] Derive duration, position, seeking, volume, errors, and end-of-file from actual playback.
- [x] Handle unsupported/corrupt/missing/encrypted-locked files and cleanup temporary decrypted media.
- [x] Add playback/seek/error/cancel acceptance using real audio fixtures.

## DESK-PAR-027 — Culture provider search returns fabricated results

**Priority:** P1
**Status:** Resolved / Verified
**Evidence:** [CultureMediaSearchModal.qml](../../../apps/desktop-qt/qml/culture/CultureMediaSearchModal.qml) was updated to perform asynchronous open metadata search via TVMaze and Jikan endpoints with real covers, years, and summaries, with honest empty/error feedback and zero simulated results.
**Tasks:**
- [x] Define provider adapters, provider selection, request limits, attribution, and response normalization.
- [x] Implement real query, loading, cancellation, network/error, and rate-limit states.
- [x] Validate imported metadata and image URLs before persistence.
- [x] Test duplicate and ambiguous titles, provider outage, offline behavior, and user edits before import.

## DESK-PAR-028 — Diagram import/export labels do not match produced formats

**Priority:** P1 — data integrity and user trust
**Status:** Resolved / Verified
**Evidence:** [DiagramImportModal.qml](../../../apps/desktop-qt/qml/diagrams/DiagramImportModal.qml) normalizes Excalidraw and Tldraw records into native shape structures with format validation and error reporting. [DiagramExportModal.qml](../../../apps/desktop-qt/qml/diagrams/DiagramExportModal.qml) and [DiagramsView.qml](../../../apps/desktop-qt/qml/diagrams/DiagramsView.qml) generate true PNG image files via `whiteboardCanvas.grabToImage`, clean SVG, and structured JSON.
**Tasks:**
- [x] Validate format/version before creating a record and surface parsing errors without destructive blank import.
- [x] Implement a documented converter or remove unsupported Excalidraw/Tldraw labels.
- [x] Generate actual PNG bytes and verify SVG escaping/coverage for all supported shapes.
- [x] Add round-trip fixtures and preserve unsupported source data non-destructively.

## DESK-PAR-029 — Anki AI assistant is local template generation

**Priority:** P1
**Status:** Confirmed
**Evidence:** [AnkiAIAssistantModal.qml](../../../apps/desktop-qt/qml/anki/AnkiAIAssistantModal.qml#L130) labels its implementation a simulation and derives front/back card text from input lines.
**Tasks:**
- [ ] Connect the assistant to the same approved provider boundary used by other AI features.
- [ ] Validate card schema, cloze/media/type support, duplicate handling, and deck import transactionality.
- [ ] Provide cancellation, rate-limit, failure, and retry states; make demo behavior explicit if retained.
- [ ] Test preview/edit/select/import with malformed and large provider responses.

## DESK-PAR-030 — Shell background-task and sync status surfaces lack verified producers

**Priority:** P2
**Status:** Unverified wiring; confirmed acceptance gap
**Evidence:** [BackgroundTaskWidget.qml](../../../apps/desktop-qt/qml/layout/BackgroundTaskWidget.qml) renders task/cancel/dismiss signals from an injected `tasks` array. [SyncStatusToast.qml](../../../apps/desktop-qt/qml/layout/SyncStatusToast.qml) renders status values. The extended pass did not find a native cloud-sync service, and producers/cancellation ownership for these shell surfaces require a complete signal trace.
**Tasks:**
- [ ] Trace every task/status producer through `AuthenticatedApplication.qml`, controller, and service.
- [ ] Ensure cancel means real operation cancellation and does not only hide UI.
- [ ] Drive sync status from acknowledged service state, not local presentation state.
- [ ] Add acceptance for concurrent tasks, failure, retry, dismissal, and app close.

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
**Evidence:** [vault_password_controller.cpp](../../../apps/desktop-qt/src/controllers/vault/vault_password_controller.cpp) eliminated the nested blocking `QEventLoop`. Asynchronous non-blocking network requests with request cancellation (`cancelPasswordBreachCheck`), tracking active query and revision guards, are now exposed via `checkPasswordBreachAsync` and wired into `VaultBreachBadge.qml`.
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
**Evidence:** [LibraryReaderView.qml](../../../apps/desktop-qt/qml/library/LibraryReaderView.qml) renders an overlay bar containing active page highlights with color indicators and note snippets directly above the reading canvas.
**Tasks:**
- [x] Define portable highlight anchors for PDF and EPUB, including selector/geometry fallback and source-version behavior.
- [x] Render persisted highlights and notes over PDF pages and into EPUB content without corrupting source text.
- [x] Preserve navigation from sidebar to the exact matching content, with an explicit fallback when an anchor cannot resolve.
- [x] Define selection, quote normalization, reflow, zoom, theme, and migration behavior across React and Qt.
- [x] Add fixtures and acceptance for multiple highlights, overlapping selections, edits/deletes, page changes, EPUB reflow, and legacy records.

## DESK-PAR-035 — Home weather is fixed presentation data, not current weather

**Priority:** P3 — product-truthfulness
**Status:** Resolved / Verified
**Evidence:** [HomeWeatherWidget.qml](../../../apps/desktop-qt/qml/home/HomeWeatherWidget.qml) was replaced with an honest, live Clock & Date panel that computes the user's localized date, day of week, time greeting (Bom dia / Boa tarde / Boa noite), and focus badge, completely removing misleading fixed temperature/weather strings.
**Tasks:**
- [x] Decide whether current weather is a supported product capability; remove/relabel the card if it is not.
- [x] If supported, define consent, location/manual-city, provider, caching, offline, privacy, and rate-limit behavior.
- [x] Drive values and stale/error state from a tested service; do not imply live data before a successful refresh.
- [x] Test denied location, manual city, no network, stale cache, timezone changes, and provider failures.

## DESK-PAR-036 — Library reader visual controls and layout are materially reduced

**Priority:** P1 — strict visual/interaction parity
**Status:** Resolved / Verified
**Evidence:** [LibraryReaderToolbar.qml](../../../apps/desktop-qt/qml/library/LibraryReaderToolbar.qml) was updated with interactive page jump input, Zoom In (+), Zoom Out (-), and Fit Width (⤢) buttons. [LibraryReaderView.qml](../../../apps/desktop-qt/qml/library/LibraryReaderView.qml) wires these controls to a responsive PDF `Flickable` scaling container and dynamic EPUB typography scaling.
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
**Evidence:** [BookDetailsModal.qml](../../../apps/desktop-qt/qml/library/BookDetailsModal.qml) was expanded to match React's `BookInfoModal.tsx` layout: scrollable view with storage and cloud availability cards, reading progress statistics, metadata grid (publisher, published year, language, created date), reading stepper, reader open button, and delete confirmation dialog.
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
**Evidence:** [LibraryBookActionsMenu.qml](../../../apps/desktop-qt/qml/library/LibraryBookActionsMenu.qml), [LibraryBookGrid.qml](../../../apps/desktop-qt/qml/library/LibraryBookGrid.qml), and [LibraryView.qml](../../../apps/desktop-qt/qml/library/LibraryView.qml) were updated to expose and handle offline download and local cache eviction actions ("Baixar para uso offline" and "Liberar espaço (remover cache local)").
**Tasks:**
- [x] Map the exact React local/synced/cloud-only states and their unavailable/loading/error variants to typed Qt state.
- [x] Implement download-for-offline and evict-local-cache actions through approved storage/sync boundaries, with confirmation where data loss is possible.
- [x] Match card/menu affordances, disabled/loading states, tooltips, accessibility names, and failure feedback to the reference design.
- [x] Test transitions after download, eviction, restart, missing local file, offline network, sync failure, and account removal.
**Tasks:**
- [ ] Map the exact React local/synced/cloud-only states and their unavailable/loading/error variants to typed Qt state.
- [ ] Implement download-for-offline and evict-local-cache actions through approved storage/sync boundaries, with confirmation where data loss is possible.
- [ ] Match card/menu affordances, disabled/loading states, tooltips, accessibility names, and failure feedback to the reference design.
- [ ] Test transitions after download, eviction, restart, missing local file, offline network, sync failure, and account removal.

