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

## 10. Inline Calendar Event Flow

The Notes `/evento` command opens an inline event form linked to the current page. The form starts with tomorrow at 14:00, selects Mentoria by default, and enables four reminders by default: one day, two hours, 15 minutes, and the event time. The user can set the title, date, time, event type and reminder choices before creating the event. The event is persisted through the active platform service and a `calendar-event-widget` containing the returned event ID, title, date and linked page ID is inserted into the note.

Both clients expose explicit Cancel and Create actions. React renders a dedicated event modal; Desktop Qt hosts its native form within the Notes setup modal and offers additional native color and recurrence controls. Cancel closes without creating an event. Date/time validation and one active submission guard prevent invalid or duplicate creation. The Qt focused QML harness covers the Cancel and create signal paths; live Core persistence, reminder delivery and exact modal geometry remain native runtime acceptance items.

## 11. Inline Focus Session Setup

The Notes `/foco` command opens a setup form for a focus session. Its visible order is the session tag, description and target duration, with preset choices for 15, 25, 30, 45 and 60 minutes plus a numeric duration field. Slash-command arguments can prefill the tag, description and duration. The current React Notes host does not pass the Focus screen's existing tag list into this modal, so tag autocomplete is not part of this Notes entry point.

Desktop Qt presents the same labeled field order and prefill behavior in the native Notes setup host. It also retains an additional **Inserir timer na nota** action alongside **Iniciar Foco**; the React Notes host only starts the focus timer. The QML harness verifies visible labels, order, example placeholders and prefill. Live timer behavior, focus return and exact viewport geometry remain runtime acceptance items.

## 12. Inline Alarm Setup

The Notes `/alarme` command opens alarm setup with the time initialized from a valid slash argument or `12:00`. The user can set a time and an optional label up to 30 characters, then save the alarm. The saved alarm uses the active platform service. Notes also retains a separate secondary action for linking an existing alarm as an inline widget; that is a native addition beyond React's create-alarm modal.

Desktop Qt presents the time and label in separate cards, uses a large centered time field, and provides a full-width save action. It keeps existing-alarm linking collapsed until requested. The modal is capped at the same 672 px content width as React's alarm form, while the React client uses a full-canvas overlay and Qt stays inside its native Notes modal shell. Focused QML tests cover slash prefill, time validation, alarm creation and existing-alarm link serialization. Full-canvas geometry, live Core error recovery and reminder delivery remain runtime acceptance items.

## 13. Inline Habit Selection and Creation

The Notes `/habito` command opens a picker for existing habits or a new habit name. Existing choices create an inline widget linked by the Core habit ID. A new habit uses the emerald color, Flame icon and seven-day weekly target by default; the widget must store the created record's actual Core ID so it resolves in the Notes page. Matching an existing name without regard to case selects that existing habit instead of offering a duplicate create action.

React's Notes entry point uses its dedicated searchable HabitSelect modal. Desktop Qt keeps the flow within its setup host and also offers a native **Todos os hábitos do dia** action. The Qt create path reads the created record after Core success and uses that record ID for the inserted widget. Its search field focuses on open, supports wrapped ArrowUp/ArrowDown, Enter, Escape and 1–9 selection, highlights the active choice and explains the empty list. Focused QML coverage verifies keyboard routing logic, create defaults, duplicate prevention and selected/created IDs; visible-window key propagation, loading/error feedback, live Core persistence, focus return and saved-note reopen remain acceptance items.

## 14. Inline Question Battery Creation

The Notes `/question` command creates an inline question block. In Desktop Qt, the Notes-specific Core operation validates the current page and transactionally creates a battery with `sequential` layout, its owning `page_id`, and a `quiz_page_links` record. The bridge returns the actual battery ID, which the QML picker stores in the block. Standalone question-module battery creation keeps its existing API and defaults.

The Qt modal uses an atomic `NotesQuestionCreateForm.qml` with a React-like help/title header, a 48 px battery field with embedded plus action, an existing-results heading, rows that keep each real battery ID, and a dashed empty state. The results viewport grows with the list up to 220 px. This results in existing Core batteries; React instead searches question widgets already placed in note pages.

Question block metadata loads through a battery-ID lookup instead of scanning the entire battery list. The collapsed block does not fetch full question content; expanding its preview requests only that battery's questions, or the referenced single question for a legacy single-question block. This keeps per-block initialization bounded as question and battery data grow.

Starting focus from a Notes question widget also loads only its linked battery's questions; legacy single-question widgets load only that question by ID. Neither Notes path reads and filters the global question list.

Removing a question card from a note now requires explicit confirmation. The confirmation removes only the note card; the linked battery and its questions remain available in the Questions module.

Sequential focus in a Notes question widget asks before showing results and displays the number of answered and pending questions. Review returns to the last question; confirmation opens the result view. The Notes host enables this confirmation specifically for the Notes entry point.

Open-answer questions are a remaining parity gap: Desktop Qt currently accepts transient text but does not retain it across navigation, evaluate it with the React AI flow, or save typed feedback/attempt history. The required native provider, credential path and typed Core attempt contract are tracked in the Notes parity audit.

Focused Core tests verify the page/layout/link data and ensure an invalid page leaves no battery or link behind. Focused QML checks verify the modal hierarchy, responsive result viewport, current-page context, Core ID insertion, existing ID selection and error copy. Live creation followed by saving/reopening the note, focus return and same-viewport comparison remain acceptance work. The React Notes host currently ignores the reuse flag emitted when a suggested existing question widget is selected; that client-side behavior is tracked in the parity audit rather than mirrored by Qt.

## 15. Notes link duplicate modal

When a resource URL appears on more than one Notes page, the duplicate-count action opens `NotesLinkDuplicatesDialog.qml`. The native dialog displays the link title and URL, each matching page and its ancestor path, and navigates to a selected page. It closes from its close button, Escape or an outside click. Duplicate rows are not expanded inside the link card; the card's color and annotation drawers remain independent.

React's reference is `LinkDuplicatesModal.tsx` in the link extension. Focused Qt QML tests cover resource metadata, ancestor ordering, selecting a page, Escape and outside-click dismissal. Live duplicate lookup/navigation, focus restoration and matched-viewport visual comparison remain required acceptance work.
