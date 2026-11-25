# Caderno (`notes`) Desktop Qt vs Web React Parity & Compatibility Audit

## Scope

This audit covers **exclusively the Caderno (`notes`) module** across:
- Shared Rust domain core: [`core/synapse-core/src/domain/notes/`](../../../core/synapse-core/src/domain/notes/mod.rs)
- Qt FFI bridge: [`bridges/bridge-qt/src/domain/notes/`](../../../bridges/bridge-qt/src/domain/notes/pages.rs)
- Native Desktop Qt views and controllers: [`apps/desktop-qt/qml/notes/`](../../../apps/desktop-qt/qml/notes/NotesEditorView.qml), [`apps/desktop-qt/src/controllers/notes/`](../../../apps/desktop-qt/src/controllers/notes/notes_controller.cpp)
- Cross-client TipTap HTML serialization fixes in [`apps/web-react/src/components/editor-extensions/BlockquoteToggle.tsx`](../../../apps/web-react/src/components/editor-extensions/BlockquoteToggle.tsx) and [`ToggleBlock.tsx`](../../../apps/web-react/src/components/editor-extensions/ToggleBlock.tsx)

---

## Root-Caused Bugs & Architectural Gaps

### 1. Uneditable Formatting Warning Banner (`BUG-01`)
- **Symptom**: Opening notes authored in Web React displays `"This note contains formatting that is not available in visual editing. Switch to source editing to preserve it."` or forces read-only preview mode.
- **Root Cause**: `NotesRichDocument::supportsSource` in `apps/desktop-qt/src/controllers/notes/notes_rich_validation.cpp` enforces strict QTextDocument round-trip invariants that reject standard TipTap `editor.getHTML()` output:
  - Empty paragraphs (`<p></p>`) collapse in `QTextDocument::setHtml` unless normalized to `<p><br/></p>`.
  - Consecutive or trailing spaces inside `<p>` collapse unless `style="white-space:pre-wrap"` is applied.
  - TipTap tables include `<table style="min-width: ..."><colgroup><col ...></colgroup>` and `colwidth` / `data-column-*` attributes on `<td>` and `<th>`.
  - Custom dividers (`<hr class="editor-divider" style="margin: 0">`), default-colored blockquotes (`data-color="default"`), links with `rel="noopener noreferrer"` or `class`, external/large `<img>` tags, `<encrypted-image>`, and `<pre><code class="language-mermaid">` were rejected or unhandled in `block_ast.rs`.
- **Remediation**: Pre-normalize TipTap HTML slices in `core/synapse-core/src/domain/notes/html_normalizer.rs` and extract standalone `<encrypted-image>`, external/styled `<img>`, and Mermaid diagrams as typed blocks in `block_ast.rs`, while preserving strict `NotesRichDocument::supportsSource` invariants for direct unit tests.

### 2. Missing Toggle & Toggle Callout Titles and Colors (`BUG-02`)
- **Symptom**: No toggle callout (`blockquote-toggle`) or collapsible toggle (`toggle-block`) displays its title or custom accent color in Desktop Qt.
- **Dual Root Cause**:
  1. **Web React HTML Serialization**: `BlockquoteToggle.tsx` and `ToggleBlock.tsx` transformed `title` into `HTMLAttributes['data-title']` in `addAttributes()`, then overwrote `'data-title': HTMLAttributes.title || ''` (`undefined` -> `""`) and `'data-color': HTMLAttributes.color || 'default'` in `renderHTML()`.
  2. **CRDT vs HTML Divergence**: Web React rehydrated titles from binary Yjs `pages.crdt_state` (`Y.XmlElement("blockquoteToggle")`), whereas Desktop Qt reads `pages.content` (HTML) and clears `crdt_state = NULL` on save.
  3. **QML Binding Break**: Imperative `toggleRoot.title = text` assignment in `NotesToggleBlock.qml` broke property bindings on delegate updates.
- **Remediation**:
  - Fix `renderHTML` in `BlockquoteToggle.tsx` and `ToggleBlock.tsx` to read `node.attrs` without clobbering `data-title`, `data-color`, or `data-is-open`.
  - Add `crdt_hydrator.rs` in `core/synapse-core/src/domain/notes/` to decode Yjs `crdt_state` updates on read and backfill missing `data-title`, `data-color`, and `data-is-open` attributes in HTML so existing user notes recover their titles automatically.
  - Keep `NotesToggleBlock.qml` inputs synchronized reactively with `blockData`.

### 3. Destructive Plain-Text Stripping in Container Blocks (`BUG-03`)
- **Symptom**: Editing inside `NotesToggleBlock.qml`, `CollectionBlock.qml`, or `NotesColumnLayout.qml` stripped inner HTML tags via regex into a plain `TextArea`.
- **Remediation**: Embed `NotesRichTextEditor` instances for rich container bodies so inline marks, headings, lists, checklists, links, tables, and code blocks round-trip losslessly.

### 4. Editor Surface Fragmentation, Shortcuts, Paste URL Card & Modularity (`BUG-04` – `BUG-08`)
- **Symptoms**:
  - `Ctrl+B` / `Ctrl+I` / `Ctrl+U` shortcuts and `flushRichEditor()` bypassed active rich slices when `isBlockMode` was active.
  - Clicking below a trailing widget block could not append a paragraph.
  - Pasting a standalone URL did not offer instant `LinkPreviewCard` conversion.
  - Slash command menu and selection bubble mixed system emojis instead of vector `AppIcon` glyphs.
  - Several QML files in `apps/desktop-qt/qml/notes/` exceeded the 300-line modularity target (`NotesEditorView.qml`, `NotesRichTextInput.qml`, `LinkPreviewCard.qml`, `NotesEditorCanvas.qml`).
- **Remediation**: Route notes cleanly through the unified block/rich editor, forward formatting shortcuts to the focused rich slice, add a trailing click-to-append area, add URL-to-card conversion on paste, standardize vector icons, and decompose oversized QML files into focused sub-components under 300 lines.

---

## Canonical Cross-Client Persistence & Verification

- **Web / Tauri Save & Live Sync Alignment**:
  - [`apps/web-react/src/components/notes/utils/canonicalNoteHtml.ts`](../../../apps/web-react/src/components/notes/utils/canonicalNoteHtml.ts) normalizes XML-sensitive attributes (such as `checked="checked"`) inside [`useEditorSave.ts`](../../../apps/web-react/src/components/notes/hooks/useEditorSave.ts) without removing any TipTap features.
  - [`useEditorSync.ts`](../../../apps/web-react/src/components/notes/hooks/useEditorSync.ts) and [`Editor.tsx`](../../../apps/web-react/src/components/Editor.tsx) reload external HTML edits into the live TipTap editor on focus whenever `crdt_state` was cleared by a native Desktop Qt save.
  - [`apps/web-react/src-tauri/src/cmd_notes.rs`](../../../apps/web-react/src-tauri/src/cmd_notes.rs) and [`apps/desktop-qt/src/controllers/notes/notes_controller.cpp`](../../../apps/desktop-qt/src/controllers/notes/notes_controller.cpp) hydrate legacy toggle attributes from `crdt_state` for both plain and vault-encrypted notes.
- **Reproducible Verification**:
  - `cargo test -p synapse-core notes`
  - `cargo build --release -p synapse-bridge-qt && cmake --build apps/desktop-qt/build --parallel`
  - `ctest --test-dir apps/desktop-qt/build --output-on-failure`
  - `cd apps/web-react && npx vitest run src/components/editor-extensions/ToggleCompatibility.test.ts src/components/notes/hooks/useEditorSync.test.ts && npm run typecheck`
  - `cargo check --manifest-path apps/web-react/src-tauri/Cargo.toml`
