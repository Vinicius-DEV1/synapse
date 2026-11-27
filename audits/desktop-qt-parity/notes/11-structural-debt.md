# Notes Anti-Monolith Debt Inventory

This inventory is limited to Caderno Notes paths in Desktop Qt, the Notes domain in `synapse-core`, and the Qt Notes bridge. It does not inspect other product modules. The project target is fewer than 300 lines per source file; each file below currently exceeds that target.

## Snapshot

Line counts were refreshed on 2026-11-27 with `wc -l` from the active worktree after the page-history fixes. Re-run the command before each extraction because later edits can change the counts.

```bash
find apps/desktop-qt/qml/notes \
  apps/desktop-qt/src/controllers/notes \
  core/synapse-core/src/domain/notes \
  bridges/bridge-qt/src/domain/notes \
  -type f \( -name '*.qml' -o -name '*.cpp' -o -name '*.h' -o -name '*.rs' \) -print0 \
  | xargs -0 wc -l \
  | awk '$1 > 300' \
  | sort -nr
```

### Desktop Qt presentation (`apps/desktop-qt/qml/notes/`)

| Lines | File |
| ---: | --- |
| 716 | `apps/desktop-qt/qml/notes/BlockListEditor.qml` |
| 522 | `apps/desktop-qt/qml/notes/NotesRichTextInput.qml` |
| 438 | `apps/desktop-qt/qml/notes/NotesToggleBlock.qml` |
| 422 | `apps/desktop-qt/qml/notes/NotesEditorModalsHost.qml` |
| 393 | `apps/desktop-qt/qml/notes/NotesRichTextEditor.qml` |
| 366 | `apps/desktop-qt/qml/notes/PageHistoryModal.qml` |
| 360 | `apps/desktop-qt/qml/notes/QuestionBlock.qml` |
| 354 | `apps/desktop-qt/qml/notes/BlockDelegateRouter.qml` |
| 353 | `apps/desktop-qt/qml/notes/NotesTableExcelGrips.qml` |
| 340 | `apps/desktop-qt/qml/notes/NotesColumnLayout.qml` |
| 340 | `apps/desktop-qt/qml/notes/DocumentBundleManagerDialog.qml` |
| 332 | `apps/desktop-qt/qml/notes/LinkPreviewCard.qml` |
| 317 | `apps/desktop-qt/qml/notes/YouTubeWatchModal.qml` |
| 308 | `apps/desktop-qt/qml/notes/NotesFilePreviewModal.qml` |
| 302 | `apps/desktop-qt/qml/notes/NotesSelectionBubbleToolbar.qml` |
| 301 | `apps/desktop-qt/qml/notes/FileAttachmentWidget.qml` |

### Desktop Qt Notes controllers (`apps/desktop-qt/src/controllers/notes/`)

| Lines | File |
| ---: | --- |
| 486 | `apps/desktop-qt/src/controllers/notes/notes_controller.cpp` |
| 456 | `apps/desktop-qt/src/controllers/notes/notes_rich_code_blocks.cpp` |
| 375 | `apps/desktop-qt/src/controllers/notes/notes_rich_spoilers.cpp` |
| 347 | `apps/desktop-qt/src/controllers/notes/notes_text_operations.cpp` |
| 333 | `apps/desktop-qt/src/controllers/notes/notes_rich_tables.cpp` |
| 319 | `apps/desktop-qt/src/controllers/notes/notes_rich_task_lists.cpp` |
| 313 | `apps/desktop-qt/src/controllers/notes/notes_rich_block_editing.cpp` |

### Shared Notes Core (`core/synapse-core/src/domain/notes/`)

| Lines | File |
| ---: | --- |
| 643 | `core/synapse-core/src/domain/notes/table_schema/mod.rs` |
| 512 | `core/synapse-core/src/domain/notes/crdt_hydrator.rs` |
| 418 | `core/synapse-core/src/domain/notes/mermaid_svg.rs` |
| 390 | `core/synapse-core/src/domain/notes/html_normalizer/mod.rs` |
| 347 | `core/synapse-core/src/domain/notes/pages.rs` |
| 326 | `core/synapse-core/src/domain/notes/mod.rs` |
| 302 | `core/synapse-core/src/domain/notes/link_index.rs` |

### Qt Notes bridge (`bridges/bridge-qt/src/domain/notes/`)

| Lines | File |
| ---: | --- |
| 374 | `bridges/bridge-qt/src/domain/notes/pages.rs` |
| 332 | `bridges/bridge-qt/src/domain/notes/table_ast_ffi.rs` |

Total: **32 files** above the source-length target in this scoped scan.

## Recent decomposition check

`FileAttachmentWidget.qml` delegates identity, rename, toolbar actions, and selected-widget keyboard handling to focused sibling components. Its current count is 301 lines, so it remains just above the target despite the extraction; `FileAttachmentRenameEditor.qml`, `FileAttachmentIdentity.qml`, `FileAttachmentActionBar.qml`, and `FileAttachmentKeyboardActions.qml` remain individually below 300 lines. The extracted keyboard scope parses and the native app target builds, but preview-return focus and key routing still need runtime acceptance.

## Decomposition requirements

- Split one responsibility at a time. Preserve public C++ slots/signals, QML component properties/signals, Rust APIs, FFI contracts, serialized NoteBlock shapes and error behavior.
- Keep canonical note semantics, parsing, serialization and persistence in `core/synapse-core/`; keep Qt controllers as thin presentation adapters.
- Split QML by cohesive visual and interaction responsibility. Keep new same-folder components importable without moving the canonical editor entry points or changing `apps/web-react/`.
- Split Rust domains into focused models, algorithms, repositories, orchestration and tests. Keep bridge files limited to typed FFI adaptation.
- Re-run the scoped line-count command after each extraction. Do not mark the file complete while a new extracted file also exceeds 300 lines.
- Review callers and event order after each split. A line-count improvement alone does not prove layout, keyboard behavior, serialization, persistence or Core parity.
- Keep verification targeted to the affected Notes files and contracts. Preserve the current visual baseline with same-viewport runtime comparison before closing UI extraction items.

## Priority order

1. **Core and bridge boundaries:** split the large table schema, HTML normalizer, page domain, CRDT hydrator and table AST bridge without changing canonical APIs or persisted data.
2. **Editor orchestration:** split `BlockListEditor.qml`, `NotesRichTextInput.qml`, `NotesRichTextEditor.qml` and `BlockDelegateRouter.qml` into focused state, key-routing and delegate responsibilities while keeping editor focus, cursor and save semantics intact.
3. **Widget and modal views:** split the toggle, column, question, bundle-manager, link-preview, table-grip, media-picker, selection-toolbar and editor-modal components along visible subviews and focused actions.
4. **Qt controller adapters:** split controller files by cohesive Notes API and rich-editor operation, preserving thin delegation and avoiding duplicate Core algorithms.

The order is a planning aid, not permission to change unrelated modules. React Web remains the reference and stays unchanged.
