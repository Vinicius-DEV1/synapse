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

The Qt Notes media picker delegates local encryption and file-record creation to `SynapseDataController::importLocalFile()`. It supports selecting multiple local files, adding more, removing individual selections, and choosing whether multiple successful imports become one document bundle or separate file widgets. Bundling is on by default when multiple files are selected, matching React. Core accepts one local import at a time, so Qt processes the queue sequentially and correlates each `fileOperationFinished` result by a unique request ID. Widget HTML is built from the returned file ID, name, type and size; an unrelated file-list refresh cannot change which attachment is inserted. A later failure preserves earlier successful results in memory and retry continues at the failed file without reimporting completed files. A Notes-local helper decodes each file dialog `file:` URL into a local path before calling the controller.

This describes the current native multi-file local import path. Focused QML tests verify queue sequencing, file removal/deduplication, grouped and separate output, retry state, and URL decoding; they do not verify a real ENC1 import, the live file dialog, note save/reopen, or same-viewport visuals. React also uploads to Google Drive and displays connection state and percentage progress; the Qt Notes picker currently performs encrypted local import and coarse per-file progress only. Drive behavior and exact progress parity remain open and must be explicitly tracked before claiming full picker equivalence.
