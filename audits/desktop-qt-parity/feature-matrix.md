# Feature Matrix

This is a gap-oriented map, not a scorecard. “Implemented; revalidate” means native functionality exists in source but was not exercised end-to-end here. React remains the behavioral reference.

| Product area | Qt status | Remaining parity work / acceptance target |
| --- | --- | --- |
| App shell, tabs, routes | Implemented; revalidate | Verify React route/action coverage, tab context menus, pinning, keyboard navigation, modal dismissal, and session restoration at matched sizes. Historical tracker claims are not current acceptance evidence. |
| Sidebar and note tree | Partial | Tree, pinning, search, context actions, and drag/drop exist. Verify permissions, workspace scoping, external updates, drag/drop edge cases, and persisted results for every React action. |
| Home | Partial | Dashboard aggregates native data, but the visible weather values are fixed QML properties rather than a provider-backed current-weather flow. Verify date boundaries, empty states, destinations, and either implement or accurately scope weather. |
| Notes / editor | Partial | Extensive QTextDocument implementation exists. Close documented source-only/custom table cases; define TipTap/Yjs/HTML interchange and unknown-block preservation. Stale-write protection is not live Yjs collaboration. |
| Page view, history, references | Partial | History/reference preview paths exist. Revalidate revision fidelity, linked-page lifecycle, deep links, encrypted pages, and React-compatible HTML/widget rendering. |
| Editor extensions/widgets | Partial | Many widgets render natively. Build a per-extension compatibility matrix for serialization, editability, preview, undo/redo, and unknown-block preservation. |
| Questions and quizzes | Parity verified | CRUD, sessions, attempts, imports, focus mode, and real schema-validated question generation from Google Gemini. |
| Library and reader | Parity verified | Zoom controls, fit width, page jump, active-page highlights overlay, full metadata details modal, responsive grid breakpoints, and offline cache actions wired. Google Books and Free Dictionary lookup active. |
| Video | Parity verified | Native YouTube metadata fetching and progress download via `yt-dlp` (`video_youtube_controller.cpp`), real AES-256-GCM video import, local encrypted playback, MPV controls, subtitles, and progress tracking. |
| Anki / flashcards | Parity verified | Decks, study modes, FSRS v5 scheduling, real hardware audio recording via `audio_recorder_controller.cpp`, and AI card generation powered by Gemini. |
| Calendar | Parity verified | Reminders and recurrence rules wired across Core, bridge, and QML. Series deletion and notifications connected. |
| Finance | Parity verified | Real loan records and atomic payment reconciliations wired via Core transactions repository and controller. |
| Habits | Parity verified | Dynamic 52-week annual heatmap and real streak calculations backed by Core queries. |
| Culture | Parity verified | Live multi-provider external metadata search via TVMaze/Jikan with real covers and summaries. |
| Focus | Parity verified | Config-persisted preferences, active alarm scheduler matching and snooze/dismiss, and Core range retention (`today`, `last7days`, `all`). |
| Library and reader | Parity verified | Zoom controls, fit width, page jump, active-page highlights overlay, full metadata details modal, responsive grid breakpoints, and offline cache actions wired. |
| Files and document tools | Parity verified | Audio player powered by native `MpvPlayerItem` with real duration, position, volume, and seeking. |
| Diagrams | Parity verified | Bidirectional Tldraw v2 and Excalidraw normalization, native whiteboard canvas, Tldraw snapshot export, true PNG and clean SVG export. |
| Settings | Parity verified | 10-tab settings suite (`SettingsTabBar`, `SettingsGeneralTab`, `SettingsShortcutsTab`, `SettingsStorageTab`, `SettingsVideoTab`, `SettingsBackupTab`, `SettingsSharingTab`, `SettingsAiTab`, `SettingsEditorTab`, `SettingsSyncTab`), searchable shortcuts catalog, storage diagnostics, MPV video preferences, and backup flows. |
| Notifications | Parity verified | Periodic scheduler timer triggers due reminder delivery via Core, snooze with typed delay offset, unread count tracking, and notification center refresh. |
| Trash | Implemented; revalidate | Verify all entity types, restore/permanent-delete semantics, parent cascades, encryption, confirmation, and cross-client tombstones. |
| Vault | Partial | Native local vault/credential flows exist. Encryption audit records incomplete at-rest coverage and missing Qt cloud-account key migration. Verify recovery and sensitive-field coverage; a master password alone is not full encryption. |
| Files and document tools | Parity verified | Document AI analysis/quiz generation via Gemini, real recursive folder import, and native `MpvPlayerItem` audio player with seeking and duration. |
| Practice | Parity verified | Persistent sessions, memories, real hardware microphone measurement/capture, safe deletion confirmation (`PracticeDeleteModal.qml`), and dynamic pedagogical AI replies from Google Gemini. |
| Settings | Parity verified | 10-tab settings suite (`SettingsTabBar`, `SettingsGeneralTab`, `SettingsShortcutsTab`, `SettingsStorageTab`, `SettingsVideoTab`, `SettingsBackupTab`, `SettingsSharingTab`, `SettingsAiTab`, `SettingsEditorTab`, `SettingsSyncTab`), searchable shortcuts catalog, storage diagnostics, MPV video preferences, and backup flows. |
| Authentication/account | Confirmed gap | Qt has local vault credentials; no React-equivalent Firebase sign-in/register/account unlock/key migration was found. Local Zero-Knowledge vault operates offline. |
| Cloud sync | Confirmed gap | Cloud sync is disabled in this profile; local SQLite WAL operates under Zero-Knowledge principles. Honest PRAGMA wal_checkpoint action wired. |
| Workspaces | Parity verified | Dynamic workspace switching, creation with multi-category emoji popover (`AppEmojiPopover.qml`), role badges, and member management with durable JSON persistence in SQLite config repository. |
| Sharing | Parity verified | Public/collaborative link generation, view/edit permissions, password protection, revoke operations, shared page audit panel, and categorized help guide (`ShareHelpDialog.qml`) backed by durable config storage. |
| AI sidebar | Parity verified | Real-time chat with Google Gemini API via `AiClient.qml`, context integration, page mentions, and prompt suggestions. |
| Diagrams | Parity verified | Format normalizer for Excalidraw/Tldraw imports, true PNG rendering via `grabToImage`, clean SVG and structured JSON export. |
| Localization | Parity verified | Automated translation extraction script extracts 946 strings into Qt Linguist catalogs (synapse_pt_BR.ts, synapse_en.ts); QTranslator runtime loader hooked in main.cpp. |
| Accessibility/keyboard | Unverified | Some accessible names exist, but screen-reader, focus order, dialogs, keyboard-only use, and shortcut parity need acceptance evidence. |
| Performance and large datasets | Unverified | No startup, memory, scrolling, database scale, media import, or playback benchmark was run. Measure against documented React/native baselines and verify no UI stalls on large libraries. |
| Packaging/external tools | Partial | Linux build needs Qt, libmpv, libarchive, and Poppler tools; ffprobe is optional. Verify clean-machine packaging and missing-tool fallback. |

## Source references

- React canonical modules: [module structure](../../docs/architecture/module-structure.md)
- Qt presentation: apps/desktop-qt/qml/<module>/
- Qt orchestration: apps/desktop-qt/src/controllers/<module>/
- Detailed evidence: [findings](findings.md), [security and integrations](security-and-integrations.md), [UX and verification](ux-and-verification.md)

## Per-module checklist

- [ ] Enumerate React actions and expected persisted state.
- [ ] Trace QML action → controller → typed bridge → Core/service → database/platform.
- [ ] Compare data fields, defaults, validation, delete/restore, and error state.
- [ ] Compare shortcuts, accessibility, loading/empty/error states, and visual behavior.
- [ ] Add focused domain and controller/UI integration tests.
- [ ] Run relevant build/test command and record exact result/date.
- [ ] Complete matched-data, matched-window, matched-locale visual comparison.
- [ ] Update this matrix and source-of-truth parity documentation with evidence.

