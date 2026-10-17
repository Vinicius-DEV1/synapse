# 📝 Synapse Notes — Architecture & Technical Specification

**Synapse Notes** is the central knowledge authoring and cognitive modeling engine of the Synapse platform. Built on top of **TipTap v3**, **ProseMirror**, and **Yjs CRDTs**, it combines a fluid block-based writing experience with real-time mathematical convergence across devices.

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
  - Editor Component: `src/components/Editor.tsx`
  - Custom Nodes & Extensions: `src/components/editor-extensions/`
  - Editor Hooks & Autosave: `src/components/editor/`
  - Real-time Collaboration Engine: `src/utils/yjs-utils.ts`

---

## 2. ProseMirror & TipTap Extensions Catalog

Synapse Notes extends the standard ProseMirror document model with dedicated nodes engineered for deep academic and technical study:

| Extension Node | Purpose | Technical Implementation |
| :------------- | :------ | :----------------------- |
| **Callout Node** | Visual emphasis blocks with customizable icons and color palettes | Custom node view with dynamic icon picker and Radix UI integration. |
| **Code Block Lowlight** | Blazing-fast client-side syntax highlighting across 50+ languages | Lowlight v3 paired with Highlight.js and language selector popovers. |
| **Dynamic LaTeX Math** | Real-time mathematical and scientific formula rendering | KaTeX-driven inline and block math nodes with instant live preview. |
| **Interactive Task Lists** | Checklists with nested hierarchical states | Custom ProseMirror task item schema with keyboard indentation (`Tab` / `Shift+Tab`). |
| **Responsive Data Tables** | Structured multi-column ledgers and data comparisons | `@tiptap/extension-table` with row/column insertion, deletion, and cell merging. |
| **Embedded Bookmarks** | Rich link preview cards with local metadata extraction | Asynchronous Open Graph metadata resolver with zero-latency cached previews. |

---

## 3. Real-Time Collaborative State & Concurrency (Yjs CRDTs)

Synapse Notes replaces legacy "last-write-wins" database overwrites with mathematically guaranteed **Conflict-Free Replicated Data Types (CRDTs)**:

1. **State Vectors (`Y.Doc`)**:
   - Each note edit produces a compact binary state vector update representing insertion and deletion operations.
   - When multiple devices (e.g. Linux desktop and Android companion) edit the same paragraph simultaneously, the edits merge deterministically without user conflict prompts.
2. **Offline-First Convergence**:
   - When offline, edits accumulate in the local `Y.Doc`.
   - Upon reconnecting, state vectors are exchanged with the signaling relay (Firebase Firestore) using encrypted binary blobs (`Uint8Array`).
3. **History Compaction**:
   - To avoid unbounded CRDT growth over months of note revision, periodic document compaction generates consolidated snapshots.

---

## 4. Visual Revision History & Semantic Diffing

To support deep research and version auditing, Synapse Notes captures historical snapshots of note content:

- **Semantic HTML Diffing**: Powered by `htmldiff-js`, the revision inspector compares any historical snapshot with the current note version.
- **Visual Color-Coded Additions & Deletions**:
  - Insertions are highlighted in muted emerald (`bg-emerald-500/20 text-emerald-200`).
  - Deletions are struck through in muted rose (`bg-rose-500/20 text-rose-200 line-through`).
- **One-Click Restoration**: Allows users to preview and cleanly restore historical revisions without disrupting the surrounding page tree hierarchy.

---

## 5. Security & Cryptographic Isolation

- **Client-Side Encryption**: Note content is encrypted using the dedicated `notes_key` (derived from the Two-Tier Keychain) via **AES-256-GCM** before touching SQLite or IndexedDB.
- **Blind Cloud Sync**: The Firestore signaling relay receives only encrypted Yjs update vectors. No unencrypted note titles, blocks, or revision diffs are ever visible to cloud relays.
