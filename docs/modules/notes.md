# 📝 Synapse Notes — Architecture & Technical Specification

**Synapse Notes** is the React client's knowledge-authoring module, built on **TipTap v3**, **ProseMirror**, and Yjs CRDTs in supported web collaboration flows. This React design specification does not imply the same editor or Yjs collaboration exists in Qt or Compose; consult the [native desktop parity matrix](../native-desktop-parity.md).

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
- See the [native encryption audit](../security/native-encryption-audit.md) for Qt coverage and remaining at-rest gaps.

## 6. Native Qt Hierarchy Controls

The Qt desktop client keeps the page tree in SQLite and exposes native hierarchy actions from the page canvas:

- Sub-pages can be reordered by dragging sibling cards, nested by dropping onto another page, or moved to the top level by dropping onto the root target.
- Each page in the navigation tree and each sub-page card exposes **Move to…**, which opens a searchable destination dialog matching page titles and breadcrumbs. It marks the current parent and prevents selecting the source page or any of its descendants.
- Reordering validates the complete sibling set and persists the new order in one transaction. Page moves validate the destination and reject hierarchy cycles in the controller before updating the parent link.
- The Qt editor remains source-oriented and does not implement the React TipTap/ProseMirror schema or Yjs collaboration. Track native support in the [desktop parity matrix](../native-desktop-parity.md) before describing cross-client parity as complete.

## 7. Native Qt Visual Baseline

The Qt page canvas uses the same centered 928 px reading column, cover spacing, sibling navigation, breadcrumb row, title scale, description offset, and three-column desktop sub-page grid as the React page view. Saved cover images render in the Qt page header. The native cover dialog supports local image upload, direct image URLs, random Picsum covers, replacement, and removal. Local uploads and random images are decoded and resized off the UI thread to a maximum width of 1280 px and encoded as JPEG at quality 72 before the prepared SQLite update; random image downloads are asynchronous and capped at 20 MB with a 30-second timeout. Cover metadata remains plaintext under the current shared schema; see the [native encryption audit](../security/native-encryption-audit.md). Notes with content open in rendered reading mode; empty notes open in the native editor. Pixel-level side-by-side comparison remains pending, and TipTap/Yjs/editor block parity remains incomplete.
