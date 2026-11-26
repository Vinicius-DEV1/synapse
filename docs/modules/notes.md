# 📝 Synapse Notes — Architecture & Technical Specification

**Synapse Notes** is the React client's knowledge-authoring module, built on **TipTap v3**, **ProseMirror**, and Yjs CRDTs in supported web collaboration flows. This React design specification does not imply the same editor or Yjs collaboration exists in Qt or Compose; consult the [native desktop parity guide](../native-desktop-parity.md) and the [Qt platform guide](../platforms/desktop-qt.md).

---

## 1. Core Architectural Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SYNAPSE NOTES PIPELINE                          │
├────────────────────────────────────────────────────────────────────────┤
│  PROSEMIRROR DOCUMENT MODEL                                            │
│  Schema  •  Custom Node Views  •  Decorations  •  Transform Steps      │
├────────────────────────────────────────────────────────────────────────┤
│  TIPTAP V3 EXTENSIONS LAYER                                            │
│  Callouts  •  Code Blocks (Lowlight)  •  LaTeX Math  •  Task Lists     │
├────────────────────────────────────────────────────────────────────────┤
│  CRDT CONCURRENCY & COLLABORATION                                      │
│  Y.Doc  •  y-prosemirror  •  State Vectors  •  Update Snapshots        │
├────────────────────────────────────────────────────────────────────────┤
│  PERSISTENCE & REVISION AUDITING                                       │
│  IndexedDB / SQLite  •  Diff Engine (htmldiff-js)  •  Snapshot History │
└────────────────────────────────────────────────────────────────────────┘
```

- **Source Code Locations**:
  - Editor Component: `apps/web-react/src/components/Editor.tsx`
  - On-Demand Page Content Hydrator: `apps/web-react/src/components/page-view/pageContentFetcher.ts`
  - Custom Nodes & Extensions: `apps/web-react/src/components/editor-extensions/`
  - Editor Hooks, Lazy Lowlight & Table Validation: `apps/web-react/src/components/notes/hooks/`
  - Real-time Collaboration & Compaction Engine: `apps/web-react/src/utils/yjs-utils.ts`

---

## 2. ProseMirror & TipTap Extensions Catalog

Synapse Notes extends the standard ProseMirror document model with dedicated nodes engineered for deep academic and technical study:

| Extension Node | Purpose | Technical Implementation |
| :------------- | :------ | :----------------------- |
| **Callout Node** | Visual emphasis blocks with customizable icons and color palettes | Custom node view with dynamic icon picker and Radix UI integration. |
| **Code Block Lowlight** | Blazing-fast client-side syntax highlighting with zero boot overhead | On-demand grammar loading (`highlight.js/lib/core` + `createLazyLowlightPlugin`) refreshing decorations asynchronously via ProseMirror metadata transactions. |
| **Dynamic LaTeX Math** | Real-time mathematical and scientific formula rendering | KaTeX-driven inline and block math nodes with instant live preview. |
| **Interactive Task Lists** | Checklists with nested hierarchical states | Custom ProseMirror task item schema with keyboard indentation (`Tab` / `Shift+Tab`). |
| **Responsive Data Tables** | Structured multi-column ledgers and data comparisons | `@tiptap/extension-table` with Excel-style grips (`TableExcelGrips`) and $O(1)$ non-table transaction bailout in `useTableCellValidation`. |
| **Embedded Bookmarks** | Rich link preview cards with local metadata extraction | Asynchronous Open Graph metadata resolver with zero-latency cached previews. |

---

## 3. Real-Time Collaborative State & Concurrency (Yjs CRDTs)

Synapse Notes replaces legacy "last-write-wins" database overwrites with mathematically guaranteed **Conflict-Free Replicated Data Types (CRDTs)**:

1. **Lightweight Metadata Tree & On-Demand Body Hydration**:
   - `getAllPages()` / `notes_get_all_pages` loads only lightweight page metadata (`id`, `parent_id`, `title`, `icon`, `is_pinned`, `sort_order`, timestamps) for instant sidebar and tab rendering.
   - Full HTML/JSON bodies and Yjs `crdt_state` payloads are hydrated on demand when a note is opened via `getPageContent(pageId)` with in-flight request deduplication.
2. **State Vectors (`Y.Doc`)**:
   - Each note edit produces a compact binary state vector update representing insertion and deletion operations.
   - When multiple devices (e.g. Linux desktop and Android companion) edit the same paragraph simultaneously, the edits merge deterministically without user conflict prompts.
3. **Offline-First Convergence**:
   - When offline, edits accumulate in the local `Y.Doc`.
   - Upon reconnecting, state vectors are exchanged with the signaling relay (Firebase Firestore) using encrypted binary blobs (`Uint8Array`).
4. **Automated Snapshot Compaction (`yjs-utils.ts`)**:
   - To avoid unbounded CRDT tombstone growth over months of note revision, `encodeYDocToBase64` automatically compacts encoded snapshots exceeding 128 KB into a fresh `Y.Doc` state with a `WeakMap` low-yield throttle.

---

## 4. Visual Revision History & Semantic Diffing

To support deep research and version auditing, Synapse Notes captures historical snapshots of note content:

- **Semantic HTML Diffing**: Powered by `htmldiff-js`, the revision inspector compares any historical snapshot with the current note version.
- **Visual Color-Coded Additions & Deletions**:
  - Insertions are highlighted in muted emerald (`bg-emerald-500/20 text-emerald-200`).
  - Deletions are struck through in muted rose (`bg-rose-500/20 text-rose-200 line-through`).
- **One-Click Restoration**: Allows users to preview and cleanly restore historical revisions without disrupting the surrounding page tree hierarchy.

---

## 5. Security and Cryptographic Scope

- The React/Tauri and Qt clients have different storage and sync adapters. Verify the concrete path before assuming identical encryption behavior.
- In native Qt, page and revision bodies are protected by the notes key in supported flows; titles, descriptions, and other page metadata remain plaintext at rest.
- Cloud synchronization and sharing use entity-specific adapters. Do not assume titles, metadata, or every Yjs payload is encrypted on every path.
- See the [encryption coverage guide](../security/encryption-coverage.md) for Qt coverage and remaining at-rest gaps.

## 6. Native Qt Hierarchy Controls

The Qt desktop client keeps the page tree in SQLite and exposes native hierarchy actions from the page canvas:

- Sub-pages can be reordered by dragging sibling cards, nested by dropping onto another page, or moved to the top level by dropping onto the root target.
- Each page in the navigation tree and each sub-page card exposes **Move to…**, which opens a searchable destination dialog matching page titles and breadcrumbs. It marks the current parent and prevents selecting the source page or any of its descendants.
- Reordering validates the complete sibling set and persists the new order in one transaction. Page moves validate the destination and reject hierarchy cycles in the controller before updating the parent link.
- The Qt worktree is transitioning to a unified native block editor: HTML is parsed through the shared Notes AST, rich-text slices use Qt `TextArea`/`QTextDocument`, and native QML components render interactive blocks. This is not the TipTap/ProseMirror editor and does not currently provide an equivalent Yjs collaboration binding. Runtime, visual, modal and cross-client acceptance remain incomplete; do not describe cross-client parity as complete until those checks pass.

## 7. Native Qt Visual Baseline

React's desktop PageView uses a centered `max-w-5xl` canvas with responsive horizontal padding, producing a 928 px inner reading width at the desktop breakpoint. Qt now allows a 1,024 px outer canvas with 48 px desktop margins, which targets the same inner width; effective layout geometry still needs a matched-viewport capture. Qt has native page header, cover, hierarchy and sub-page components in the active worktree, but a fresh pixel comparison has not been recorded. The Qt page cover and hierarchy behaviors must be checked against the React flows before claiming equivalence. Cover metadata remains plaintext under the current shared schema; see the [encryption coverage guide](../security/encryption-coverage.md). Existing page history and page unlock flows require focused interaction and persistence review.

## 8. Typed Table Controls

React Notes defines five typed table columns: text, number, date, select and checkbox. The type selector is a 240 px closeable popover with a three-column choice grid. The “Filtrar Coluna” section starts collapsed when there is no active filter; operator and value edits stay as a draft until Apply, while Clear removes the applied filter and resets the draft. Selecting a type updates the table schema and clears the filter attached to that column; edits to select options do not clear filters. React provides select/checkbox choices and a native date input for date filters. The React type and filter controls are implemented by `apps/web-react/src/components/notes/components/table/TableColumnTypePopover.tsx`, `TableColumnOptionsEditor.tsx` and `TableColumnFilterSection.tsx`.

Qt renders the equivalent selector in `apps/desktop-qt/qml/notes/NotesTableColumnTypePopover.qml` and coordinates it with table grips in `NotesTableExcelGrips.qml`. It uses the same 240 px three-column type layout, selection and close affordance. When a type changes, Qt removes only that column's filter, updates the schema through the table controller/Core path, and recalculates any remaining filters against the canonical table source. If no filters remain, the editor restores the canonical HTML from its read-only filtered projection. The guarded schema-write path prevents the normal external-source-change cleanup from discarding filters on other columns. The filter editor starts collapsed without an applied filter, keeps edits local until Apply, and resets its draft when Clear removes the applied filter. Select and checkbox inputs use native Qt combo boxes; date inputs remain text fields that accept the supported date format.

Qt also exposes native number/date format controls and column insertion/deletion in this popover. These are native affordances layered around the common five-type selector; they must preserve the same table schema and filter behavior. Filtered rows are a view projection and must never become the saved note body. Full runtime persistence, edge placement, keyboard/focus and same-viewport visual comparisons remain part of Qt acceptance; a successful QML harness or native build alone does not establish complete parity.

## 9. Native Notes File Import

The Qt Notes media picker delegates local encryption and file-record creation to `SynapseDataController::importLocalFile()`. The visible local-upload mode supports selecting multiple local files, adding more, removing individual selections, and choosing whether multiple successful imports become one document bundle or separate file widgets. Bundling is on by default when multiple files are selected, matching React. Existing-file selection is a separate mode and serializes its chosen record as a linked file widget; it is not combined with the visible upload surface. Core accepts one local import at a time, so Qt processes the queue sequentially and correlates each `fileOperationFinished` result by a unique request ID. Widget HTML is built from the returned file ID, name, type and size; an unrelated file-list refresh cannot change which attachment is inserted. A later failure preserves earlier successful results in memory and retry continues at the failed file without reimporting completed files. A Notes-local helper decodes each file dialog `file:` URL into a local path before calling the controller.

This describes the current native multi-file local import path. Focused QML tests verify mode separation and serialization, queue sequencing, file removal/deduplication, grouped and separate output, retry state, and URL decoding; they do not verify a real ENC1 import, the live file dialog, note save/reopen, or same-viewport visuals. The Qt progress indicator is estimated from completed file count because the current import API does not report byte-level progress. React also uploads to Google Drive and displays connection state and percentage progress; the Qt Notes picker has no Drive flow or equivalent byte-progress callback. Drive behavior, exact progress parity and displaying selected local byte sizes remain open and must be tracked before claiming full picker equivalence. The existing-file selection command is retained as a legacy handler but is absent from the current visible React and Qt slash catalogs.

### Audio attachments

React opens its audio player directly over the note when an attachment is an audio record or has a supported audio filename suffix. Qt Notes follows that route through `NotesAudioPreviewModal.qml`: it asks the controller to prepare the file, receives a Core-protected temporary preview path with a `notes-audio-` request ID, and gives only the matching result to native MPV. Dismissal cancels the matching preparation or releases the modal's temporary preview; vault preview invalidation also closes playback. File previews are shared with the Files screen, so the request prefix prevents the Notes result from being mistaken for an active Files preview. The shared native preview API currently rejects files above 250 MiB; compare this limit with React's behavior before claiming large-file parity. Focused harnesses cover request matching, player start, cleanup and cancellation. Folder attachments now carry their intent through nested Notes blocks to the Files module, which opens the referenced folder by its stable ID using the existing folder-stack navigation. A focused routing harness verifies folder/audio/document intent; root and nested folder selection from the live active/floating Notes surfaces remains native acceptance work. Actual MPV format support, encrypted playback, vault lock during playback, decoder errors, focus behavior and visual comparison remain open under QT-NOTES-045.

### File attachment viewer

Clicking a folder attachment opens its folder in Files; PDF/EPUB opens the file action modal with quick preview and full-reader tab choices; audio attachments open the Notes audio player; image, video, text and code attachments open a Notes-owned full-canvas viewer without leaving the note. The native viewer reuses `FilesPreviewOverlay.qml`, prepares files through the protected Core preview API with a Notes-specific request ID, loads text through the size-limited controller reader, renders PDF pages through a Notes-specific request-correlated controller signal so Library and Files viewers cannot consume or close those pages, and cancels an in-flight PDF page render on close. A generated-PDF controller test covers successful rendering and cancellation, and releases temporary file/PDF paths when closed or invalidated by a vault lock. Quick preview from the PDF/EPUB action modal also stays over the note. The Files preview listener ignores Notes audio/viewer result IDs to prevent two surfaces from consuming one operation.

Text and Markdown attachment previews also save per-file reading position and bookmarks. Qt stores this small, device-local reader state in the native app database's config table under a file-ID-scoped key, offers the same 5–98% resume prompt as React, saves scroll position after a 500 ms debounce, and supports adding, jumping to, renaming and removing bookmarks. Bookmark edits preserve the saved position. The rename action transfers focus to its inline field, selects the label, saves on Enter and exposes accessible names for the trigger and row actions. React stores the equivalent state in localStorage; neither client syncs reading progress across devices. The focused Qt harness restores a 42% reading point and bookmark, scrolls long synthetic text and verifies the debounced write, then exercises bookmark add/remove, resume, rename focus/save and Escape dismissal. A native controller test confirms the config JSON survives closing and reopening the same SQLite database through a new controller; the complete live Notes view-to-Core restart path remains acceptance work. Full keyboard traversal, trigger-focus restoration, screen-reader announcement and same-viewport accessibility remain to be verified. The shared image preview only assigns a source URL while its image surface is visible, so text previews do not trigger an invisible image decode.

The Notes bookmark trigger sits in the attachment viewer toolbar as a Lucide-style bookmark outline with an amber count badge. Its popup is a nonmodal 288 px panel aligned under the trigger, and each bookmark shows its creation date below the label like React's `BookmarksDrawer`. Qt keeps native accessible names and focus behavior for edit/remove controls; exact toolbar spacing, full Tab order, focus return and screenshot comparison remain open.

The React Markdown attachment viewer includes a document AI assistant that receives the loaded Markdown, supports conversational analysis and edit requests, previews proposed Markdown changes before applying them, and can generate question content with referenced batteries. Qt has a Notes-owned sparkle action and AI modal for Markdown attachments. It supplies up to 48,000 document characters (the beginning and end for long files), keeps conversational history, supports quick prompts, request cancellation and stale-response rejection, and shows current/proposed Markdown. Applying a proposal uses the existing encrypted text-file save for the same stable file ID; failures keep the proposal available. Gemini authentication uses the `x-goog-api-key` request header instead of a URL query parameter.

The assistant supports keyboard-operated `@` lookup for linked Notes batteries, excludes the current and already attached batteries, and loads referenced questions as read-only context. Generated multiple-choice and open questions are parsed into a review card and added only after an explicit user action through the typed Core quiz assistant API. Insertion uses a Core transaction; a `quizQuestionsChanged` signal refreshes an already expanded question block from Core so its inline cached AST cannot hide the new items. Insertion errors remain visible and retryable. The model is instructed to avoid duplicating existing questions, and the user reviews the proposal before insertion; Core does not enforce semantic duplicate rejection. Proposal review highlights inserted and removed lines and offers a raw proposed-text view. It uses an LCS diff bounded to 500,000 line-pair cells and falls back to highlighting the changed middle between common prefix/suffix lines for larger documents. React marks differences at word level, so the finer-grained appearance still needs comparison. Focused Qt tests cover prompt/context construction, filtering and keyboard interactions, typed action payloads, insertion retry, question-widget refresh, line diff operations, raw toggle and large-document fallback. Vault-lock invalidation, duplicate policy, live provider behavior, attachment reopen and matched-viewport modal/focus/accessibility acceptance remain open. The standalone Files AI modal is not evidence for the Notes flow.

The Notes-only text attachment surface constrains its content column to 768 px, centers the column, wraps raw source and uses a larger rendered/raw font scale matching the React viewer. It gates those layout changes through the Notes editing flag because `FilesPreviewOverlay.qml` also serves the Files module. A focused QML harness checks the 768 px desktop maximum and confirms the text area narrows when the test window shrinks. Qt renders Markdown through `TextEdit.MarkdownText`, which supports CommonMark and GitHub extensions for tables and task lists ([Qt TextEdit documentation](https://doc.qt.io/qt-6/qml-qtquick-textedit.html)); its native code-block and blockquote decoration still differs from ReactMarkdown's custom renderer. Matched-viewport typography, table overflow and rendered-markup acceptance remain open.

Markdown attachment source editing is available inside the Notes-owned viewer. The full-canvas editor starts from the loaded text, marks unsaved changes, supports Tab indentation and Ctrl+S, and asks before discarding edits. It uses a centered editing column, responsive side gutters, React-like toolbar and status bar, and live line, word and character counts. Saving writes UTF-8 text to a temporary plaintext input, encrypts a staged replacement with the Files vault key, and asks Core to update the active file's protected local path and byte size while preserving the stable file ID; only after that succeeds is the previous managed encrypted file removed. Failures keep the old record and editor content intact, and edits above 4 MiB are rejected to match the native text-preview boundary. The native integration test confirms that an oversized edit preserves the previous encrypted path, byte size and readable content. If the record has a Drive copy, Qt reports that this save only changed the local encrypted copy; a typed Drive content-sync adapter is still missing. Encrypted controller integration and focused QML tests cover save/reopen under the same ID, modified file size, unsaved-discard choice, Tab, Ctrl+S and text emission. Exact visual comparison, controller failure injection, and cross-client reopen remain acceptance items.

The native viewer currently displays an explanatory fallback for EPUB, slides, archives and unsupported types; Qt's common preview limit is 250 MiB and text preview is limited to 4 MiB. React's `FileViewer` supports additional formats and has different controls and layout. Real image/video codec support, interactive PDF page behavior on user files, export, error/retry behavior, actual config persistence across restarts, bookmark keyboard handling, nested/floating Notes routes and matched-viewport comparison remain open; see QT-NOTES-045 and the audit file-widget crosswalk.

## 10. Inline Calendar Event Flow

The Notes `/evento` command opens an inline event form linked to the current page. The form starts with tomorrow at 14:00, selects Mentoria by default, and enables four reminders by default: one day, two hours, 15 minutes, and the event time. The user can set the title, date, time, event type and reminder choices before creating the event. The event is persisted through the active platform service and a `calendar-event-widget` containing the returned event ID, title, date and linked page ID is inserted into the note.

Both clients expose explicit Cancel and Create actions. React renders a dedicated event modal; Desktop Qt hosts its native form within the Notes setup modal and offers additional native color and recurrence controls. Cancel closes without creating an event. Date/time validation and one active submission guard prevent invalid or duplicate creation. The Qt focused QML harness covers the Cancel and create signal paths; live Core persistence, reminder delivery and exact modal geometry remain native runtime acceptance items.

## 11. Inline Focus Session Setup

The Notes `/foco` command opens a setup form for a focus session. Its visible order is the session tag, description and target duration, with preset choices for 15, 25, 30, 45 and 60 minutes plus a numeric duration field. Slash-command arguments can prefill the tag, description and duration. The current React Notes host does not pass the Focus screen's existing tag list into this modal, so tag autocomplete is not part of this Notes entry point.

Desktop Qt presents the same labeled field order and prefill behavior in the native Notes setup host. It also retains an additional **Inserir timer na nota** action alongside **Iniciar Foco**; the React Notes host only starts the focus timer. The QML harness verifies visible labels, order, example placeholders and prefill. Live timer behavior, focus return and exact viewport geometry remain runtime acceptance items.

## 12. Inline Alarm Setup

The Notes `/alarme` command opens alarm setup with the time initialized from a valid slash argument or `12:00`. The user can set a time and an optional label up to 30 characters, then save the alarm. The saved alarm uses the active platform service. Notes also retains a separate secondary action for linking an existing alarm as an inline widget; that is a native addition beyond React's create-alarm modal.

Desktop Qt presents alarm setup on a translucent, full-canvas surface with a scrollable centered column capped at React's 672 px content width. It uses responsive title/time typography, separate time and optional-label cards, a full-width save action, and keeps existing-alarm linking collapsed until requested. React also applies backdrop blur; Qt currently uses the translucent canvas without blur. Focused QML tests cover viewport sizing, small-window scrolling, slash prefill, time validation, save, existing-alarm link serialization, Escape and header close. Backdrop dismissal, blur comparison, live Core error recovery, reminder delivery and matched-viewport geometry remain runtime acceptance items.

## 13. Inline Habit Selection and Creation

The Notes `/habito` command opens a picker for existing habits or a new habit name. Existing choices create an inline widget linked by the Core habit ID. A new habit uses the emerald color, Flame icon and seven-day weekly target by default; the widget must store the created record's actual Core ID so it resolves in the Notes page. Matching an existing name without regard to case selects that existing habit instead of offering a duplicate create action.

React's Notes entry point uses its dedicated searchable HabitSelect modal. Desktop Qt keeps the flow within its setup host and also offers a native **Todos os hábitos do dia** action. The Qt create path reads the created record after Core success and uses that record ID for the inserted widget. Its search field focuses on open, supports wrapped ArrowUp/ArrowDown, Enter, Escape and 1–9 selection, highlights the active choice and explains the empty list. Focused QML coverage verifies keyboard routing logic, create defaults, duplicate prevention and selected/created IDs; visible-window key propagation, loading/error feedback, live Core persistence, focus return and saved-note reopen remain acceptance items.

## 14. Inline Question Battery Creation

The Notes `/question` command creates an inline question block. In Desktop Qt, the Notes-specific Core operation validates the current page and transactionally creates a battery with `sequential` layout, its owning `page_id`, and a `quiz_page_links` record. The bridge returns the actual battery ID, which the QML picker stores in the block. Standalone question-module battery creation keeps its existing API and defaults.

The Qt modal uses an atomic `NotesQuestionCreateForm.qml` with a React-like help/title header, a 48 px battery field with embedded plus action, an existing-results heading, rows that keep each real battery ID, and a dashed empty state. The results viewport grows with the list up to 220 px. This results in existing Core batteries; React instead searches question widgets already placed in note pages.

Question block metadata loads through a battery-ID lookup instead of scanning the entire battery list. The collapsed block does not fetch full question content; expanding its preview requests only that battery's questions, or the referenced single question for a legacy single-question block. This keeps per-block initialization bounded as question and battery data grow.

Starting focus from a Notes question widget also loads only its linked battery's questions; legacy single-question widgets load only that question by ID. Neither Notes path reads and filters the global question list.

The Notes focus entry adapter converts Core's question transport shape to the QML view model: it maps `question` to the displayed prompt, parses the JSON-string options into an array, and maps `correct_index` and `expected_answer` to the fields consumed by the card. This adapter is Notes-local so the shared Questions screen is not changed. A focused QML harness covers battery and legacy single-question payloads; a live saved-note session remains part of acceptance.

Removing a question card from a note now requires explicit confirmation. The confirmation removes only the note card; the linked battery and its questions remain available in the Questions module.

Sequential focus in a Notes question widget asks before showing results and displays the number of answered and pending questions. Review returns to the last question; confirmation opens the result view. The Notes host enables this confirmation specifically for the Notes entry point.

Open-answer questions in the Notes focus session use an explicit evaluation action and the existing native AI client with React's structured verdict/feedback prompt. The implementation keeps orchestration in `NotesOpenAnswerSession.js`, provider calls in `NotesOpenAnswerEvaluator.qml`, verdict feedback in `NotesOpenAnswerFeedback.qml`, reference-answer rendering in `NotesOpenAnswerReferenceAnswer.qml`, and shared card structure in `QuizSequentialCard.qml`. The Notes session retains each answer while navigating, guards against duplicate evaluation, displays loading/verdict/feedback and provider errors, and lets the learner retry. Evaluated answers and feedback are persisted through typed Core and Qt bridge/controller APIs; Core verifies the target is an open question and returns only the latest attempt for the targeted battery or question. A failed save can be retried without submitting the answer to the AI provider again. The Notes entry point reuses the existing Gemini configuration and does not add credential handling to Notes QML.

This flow has focused Core and mocked QML coverage and the native Qt target builds. Live provider behavior, saving and reopening a note, cross-client attempt visibility, credential transport/storage review and same-viewport comparison with React remain acceptance work. The existing native AI client currently includes the configured Gemini key in the provider request URL; this Notes implementation does not change that pre-existing platform-wide behavior.

The Qt Notes sequential-focus flow now opens a contextual assistant dialog after an open answer is evaluated. Its initial message includes the question, typed response, evaluation and reference answer. The chat keeps follow-up history, shows generation/validation progress, recovers complete action objects from truncated JSON, and displays create/edit/delete/reorder proposals with validation metadata and field previews. Learners can accept or reject one proposal or a batch; only accepted actions are sent to Core, where a battery-scoped transaction validates and applies them atomically. On success the question list is reloaded, and the current question and saved answers are remapped by stable IDs so reordering does not move the learner to a different question. A failed save leaves proposals pending for retry. Mocked QML coverage exercises parser recovery, proposal decisions, retry and reordered-session refresh; Core tests cover transaction and battery boundaries.

The assistant composer also has the four React quick prompts and an `@` picker for other Notes-linked batteries. The picker shows title/page/question count, filters by title and page, supports keyboard selection and chip removal, and sends selected questions as read-only context so the assistant can avoid repetitions. Core provides battery page metadata in the shared record. QT-NOTES-080 remains partial pending a live database/provider check and matched-viewport comparison. QT-NOTES-079 remains partial pending live Gemini, a real Core-backed approval/save-reopen round-trip, focus restoration, independent validator-model settings and matched-viewport checks.

Focused Core tests verify the page/layout/link data and ensure an invalid page leaves no battery or link behind. Focused QML checks verify the modal hierarchy, responsive result viewport, current-page context, Core ID insertion, existing ID selection and error copy. Live creation followed by saving/reopening the note, focus return and same-viewport comparison remain acceptance work. The React Notes host currently ignores the reuse flag emitted when a suggested existing question widget is selected; that client-side behavior is tracked in the parity audit rather than mirrored by Qt.

## 15. Notes link duplicate modal

When a resource URL appears on more than one Notes page, the duplicate-count action opens `NotesLinkDuplicatesDialog.qml`. The native dialog displays the link title and URL, each matching page and its ancestor path, and navigates to a selected page. It closes from its close button, Escape or an outside click. Duplicate rows are not expanded inside the link card; the card's color and annotation drawers remain independent.

React's reference is `LinkDuplicatesModal.tsx` in the link extension. Focused Qt QML tests cover resource metadata, ancestor ordering, selecting a page, Escape and outside-click dismissal. Live duplicate lookup/navigation, focus restoration and matched-viewport visual comparison remain required acceptance work.
