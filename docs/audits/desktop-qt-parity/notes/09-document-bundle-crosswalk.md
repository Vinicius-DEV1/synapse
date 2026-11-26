# Document-Bundle React-to-Qt Crosswalk

## Scope and evidence

This comparison covers only the Caderno document-bundle block. React files inspected: `apps/web-react/src/components/editor-extensions/bundles/DocumentBundleBlock.ts`, `DocumentBundleNodeView.tsx`, `DocumentBundleModal.tsx`, and `types.ts`. Qt files inspected: `DocumentBundleWidget.qml`, `DocumentBundleWidgetBody.qml`, `DocumentBundleWidgetHeader.qml`, `DocumentBundleWidgetActions.qml`, `DocumentBundleWidgetPalette.qml`, `DocumentBundleItemsPreview.qml`, `DocumentBundleWidgetDialogs.qml`, `DocumentBundleModal.qml`, `DocumentBundleManagerDialog.qml`, `DocumentBundleManagerHeader.qml`, `DocumentBundleManagerItem.qml`, `DocumentBundleItemRemovalDialog.qml`, `DocumentBundleDeleteDialog.qml`, `DocumentBundleOperations.js`, `BlockDelegateRouter.qml`, and `BlockListEditor.qml`, plus the shared Qt file/Core bridge contracts.

Source presence is not runtime acceptance. The action dialog and bundle-to-file-widget conversion now have source paths, but this continuation did not run the QML UI, mutate a saved note, or verify file lifecycle/cross-client round-trip behavior.

## Action mapping

| User action | React Web | Desktop Qt | Current assessment |
| --- | --- | --- | --- |
| Rename group | Inline edit in `DocumentBundleNodeView` and modal title editing | Inline widget edit and manager-header edit | Source paths exist; compare keyboard/focus, cancel and save feedback. |
| Set/clear color | Anchored `ColorPalettePicker` supports custom colors and reset | Native inline swatch palette | Partial visual/control difference; test reset-to-default and metadata round-trip. |
| Move group up/down | Widget header has direct up/down controls and uses editor movement commands | Generic `NotesBlockHandle` provides up/down and drag | Movement exists in a different location; compare discoverability, boundaries, keyboard and focus. |
| Open manager | Full modal lists items, previews, reorders, ungroups one, removes one and absorbs loose page files individually | Native manager lists items with preview, arrow and drag reorder, ungroup, confirmed removal and individual loose-file absorption from top-level and supported nested containers; a separate picker searches active saved files | Core manager actions now have source paths. React opens the manager by clicking the widget; Qt keeps its existing expand-on-title behavior and exposes the manager from the hover toolbar. Verify same-viewport focus, layout, drag feedback and persisted order. |
| Unlink bundle | Confirmation choice removes the bundle node and keeps file records | New native confirmation emits unlink; `BlockListEditor` removes only the bundle node | Source path implemented; runtime and autosave acceptance open. |
| Ungroup all | Converts bundle children to loose `fileWidget` nodes in order | New native confirmation serializes escaped file widgets, parses them through Core, validates each output's type and metadata, flushes active rich slices, and serializes before replacing the bundle | Source path implemented; verify IDs, type, size, link flag, color, order, undo and React round-trip. |
| Keyboard delete | Focused bundle intercepts Backspace/Delete and opens the same confirmation | Qt title click gives the bundle focus; unmodified Backspace/Delete opens its native confirmation unless rename or a modal owns input | Source path added; verify focus, event priority, shortcuts and modal/rename exclusion at runtime. |
| Remove group with files | React offers unlink, ungroup or delete-all confirmation choices | Qt confirmation currently offers unlink or ungroup | Partial. The inspected Qt client has no matching Drive delete operation; do not describe local soft-delete as Drive deletion. |
| Remove one item | React offers ungroup to page, remove from group, or delete file/Drive copy | Native manager asks to unlink from the group or move the local file record to Trash after the page save succeeds; React-like remote Drive deletion is unavailable | Source path queues the local soft-delete by page and verifies the saved content no longer references the file. Verify save conflict/failure, undo, duplicate references, retry, restore and partial persistence behavior. The UI explicitly says a Drive copy remains. |
| Absorb one loose file | The manager finds loose file widgets through ProseMirror descendants and moves the selected widget into the bundle | Qt recursively queries the current Core NoteBlock representation for top-level files and files inside toggle, blockquote-toggle, collection, blockquote and link-group containers; it removes the source path and updates bundle metadata in one serialization | Source path follows the React per-item action for supported containers. Column-group children are hidden because `columnBlock` is not a typed NoteBlock and recursive serialization could flatten its wrapper. Verify nested markup preservation, stale paths, metadata, order, undo and round-trip; record additional unsupported React containers. |
| Add one saved file | React's manager focuses on loose page widgets and has no general saved-library picker in this flow | Qt's separate picker searches active saved files and adds one file without removing another page widget | This remains an additive native workflow; compare duplicate, deleted/missing and metadata handling. |

## Native manager behavior

- The Qt widget title still expands or collapses the compact file preview. The hover toolbar opens the manager explicitly, preserving the existing native title interaction; React opens its manager by activating the widget. This remains a discoverability and keyboard-focus difference.
- The manager uses a centered native `Dialog`, item rows with arrow controls, native file preview routing, inline group-title editing, per-item ungrouping and a separate confirmation for unlink versus local Trash. The local Trash path is Core soft-delete; the Core Trash repository includes `file` entries and exposes restore. The Qt path does not delete the Google Drive copy.
- The Qt restore wrapper delegates `item_type="file"` to Core but currently emits no `filesChanged` notification for a restored file. The restored row may require a file-library refresh; verify this before treating the Trash return path as fully accepted.
- The manager lists loose file widgets from the live `BlockListEditor` Core AST and moves one selected block from top-level or supported nested containers into the bundle in one serialization. It separately opens a picker for active saved files. Recursive traversal uses Core parsing/serialization for toggle, blockquote-toggle, collection, blockquote and link-group children. Column-group descendants remain hidden because recursive parsing would flatten the untyped `columnBlock` wrappers; runtime markup preservation and unsupported React containers still require verification.
- Item drag reordering now uses the native row handle and drop targets; arrow controls remain available. Runtime drag feedback, boundary behavior, focus and persisted order have not been accepted.
- Local file soft-delete now runs after `savePage` succeeds and rechecks the saved NoteBlock projection before deleting, so a failed/conflicted note save leaves the file active. The two Core writes are still sequential rather than one SQLite transaction; test interruption, stale bundle references, restore and visible feedback before closing the associated acceptance item.
- Page navigation now stays on a dirty note when its save fails, preserving the bundle removal and queued local-Trash intent for retry. A soft-delete failure after the page save does not block navigation; the request remains scoped to the original page and can retry when it is loaded again.

## Canonical metadata

React `BundledFileItem` uses `fileId`, `name`, `fileType`, and optional `fileSize`, `isLink`, and `addedAt`. React serializes `data-items` as ordinary JSON. Qt accepts canonical `fileId` and legacy `id` when ungrouping, maps file properties into Core-parsed file-widget nodes, and preserves group color on each emitted node.

`NotesJsonAttribute.js` parses ordinary JSON first and only tries a complete URI-decoding fallback when ordinary JSON fails. Invalid JSON, non-array values or items without a usable ID block edits that would replace stored values. Validate `%` in names/URLs and legacy encoded payloads in both clients before closing QT-NOTES-037/038.

## Deletion and platform limits

React's group delete handler invokes `window.api.files.delete()` for each bundled file and separately attempts Google Drive deletion when a valid account token and Drive record exist. The inspected native Qt APIs expose Core-backed file trashing and file metadata, but no matching Drive deletion operation. `synapse_files_delete_file` marks a local file row deleted; it is a soft-delete path, not proof of permanent removal from local storage or Drive.

Before claiming parity for delete-all, define a typed native operation that reports local and remote outcomes separately, handles partial failure, and leaves the bundle/file state recoverable. Until that exists, keep unlink and ungroup distinct from file deletion and do not describe local Trash as deletion from Google Drive.

## Acceptance sequence

1. Compare both clients at the same viewport with zero, one and several files; verify header layout, item count, color, hover/focus and first/last reorder states.
2. Cancel each confirmation and verify note HTML and Core file rows remain unchanged.
3. Unlink a bundle and confirm the file records remain while the widget disappears from the page.
4. Ungroup a bundle containing PDF, EPUB, text, image and link items. Confirm one file widget per child in stable order with matching ID, title, type, size, `isLink` and color; save/reload in Qt and React.
5. Try empty/malformed metadata, deleted files, duplicate IDs, quotes, ampersands and percent signs. Verify the source is not overwritten and failures are visible.
6. Reorder one item with both arrows and drag, ungroup one item, unlink one item, move one local file to Trash and restore it, add a saved file, and absorb loose files from top-level, toggle, collection, blockquote and link-group content. Confirm source removal, saved metadata, stale-path protection, undo and round-trip. Try a column-group descendant and verify it is hidden until the parser can preserve `columnBlock` wrappers.
7. Compare local Trash and Drive behavior separately. Test offline/token-missing/partial failure and confirm neither client reports a remote deletion that did not happen.
