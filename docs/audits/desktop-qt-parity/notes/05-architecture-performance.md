# Caderno Architecture and Performance

## Desired ownership

| Layer | Caderno responsibility |
| --- | --- |
| React/QML presentation | Render controls, editor blocks, menus and states; dispatch user actions; provide keyboard and accessibility affordances |
| React hooks / Qt controllers | Coordinate editor lifecycle, focus, debounce, async work and adapter calls; do not own canonical business rules or raw SQL |
| `core/synapse-core/src/domain/notes/` | Canonical page entities, HTML normalization, AST parsing/serialization, table rules, hierarchy, history/diff, links and persistence |
| Typed bridges and platform APIs | Expose typed Core contracts; implement Qt document geometry, file dialogs, clipboard, media and other platform operations |

`BlockListEditor.qml` currently converts the note HTML to a Core `NoteBlock` array and renders it through a `Repeater`. Rich-text slices use native `TextArea`/`QTextDocument`; custom block components stay native. This is a reasonable native architecture and avoids embedding a large Chromium editor surface. Parity depends on preserving ProseMirror behavior and its serialized schema, not on copying its implementation technology.

## Core SSOT requirements

- Keep HTML parsing, block schema, safe canonicalization, table filter semantics, row/column operations, hierarchy checks, history calculations, link normalization and persistence in Rust Core.
- Use focused modules under Notes (`block_ast/`, `html_normalizer/`, `table_schema/`) with narrow files. Keep bridges split by contract and typed API.
- QML may adapt a user gesture into a Core operation, but should not create a second implementation of shared table/domain logic.
- Qt-only operations such as QTextDocument cursor geometry, native dialogs, local path resolution and MPV surfaces remain in Qt adapters.
- Preserve all unknown or legacy attributes that React uses. A normalized save must not erase content or styling that the other client understands.

## Save, recovery and encryption

React page content loads through a cache/deduplicated fetch path and editor backup store; the editor saves HTML and CRDT updates through its hooks. Qt `PageView.qml` maintains active page content and schedules native autosave; `notes_controller.cpp` delegates page persistence through the bridge and includes optimistic timestamp conflict checks. Confirm that every QML delegate flushes pending edits before page changes, tab switches, lock, close, history restore, and modal actions that replace content.

Qt and React do not currently share a live Yjs editor implementation. Qt must not write stale HTML over a newer CRDT-backed page state. This is a capability gap, not a reason to remove React collaboration. Page-body encryption and key lifecycle must be verified from the native encryption audit and concrete save path; do not claim titles/metadata are encrypted when the shared schema stores them as plaintext.

## Native and lightweight behavior

- Keep Qt UI in QML/Qt Quick with C++ adapters and Core calls; do not introduce WebEngine for the Notes editor.
- Avoid rebuilding all QML delegates on each keystroke. Keep stable IDs and update only the changed block while retaining cursor, selection and undo state.
- Current `BlockListEditor.qml` uses `Repeater`, so every block is instantiated. Measure long notes and consider a Qt-native virtualized/viewport-aware design only if it preserves page-level selection, nested widgets, keyboard navigation and correct QTextDocument editing.
- Block edits currently call Core serialization across the block list. Benchmark 100, 500 and 1,000 blocks; if cost is material, add an incremental Core API or batch transaction without creating a second serializer in QML.
- Inspect layout churn, syntax highlighting, Mermaid rendering, media surfaces, image decode/resize, timers and signal connections. Heavy work should not block the GUI thread; asynchronous operations need cancellation and teardown.
- Keep interaction feedback native and quick. Avoid full-document reloads when changing a single block, filter, icon or metadata field.
- Linked calendar event widgets should resolve their Core record by ID rather than request and scan the capped full Agenda list. Use a focused native mutation signal so visible widgets refresh after local changes without periodic polling.
- Existing Notes implementation debt: `NotesSetupWidgetsModal.qml` and `src/controllers/notes/notes_controller.cpp` exceed the 300-line target in the current worktree. Split the modal into cohesive native views and move controller adapters by domain before expanding these files further; verify QML imports and CMake registration with each extraction.

## Performance budgets to record

Measure startup-to-editor-ready, keystroke-to-frame latency, scroll frame pacing, filter evaluation, Core parse/serialize time, autosave duration, image import/resize, page switch with cache hit/miss, and peak memory for large notes. Record hardware, Qt version, build mode, note shape, block count and repeat count. A single screenshot or source-level intuition is not performance evidence.
