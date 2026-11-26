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
| Open manager | Full modal lists items, previews, reorders, ungroups one, removes one, adds files and absorbs loose page files | Native manager lists items with preview, up/down reorder, ungroup and confirmed removal; a separate add dialog searches saved files and absorbs loose page files in a batch | Core manager actions now have source paths. React opens the manager by clicking the widget; Qt keeps its existing expand-on-title behavior and exposes the manager from the hover toolbar. Arrow reorder exists, but drag reorder and matched focus/layout acceptance remain open. |
| Unlink bundle | Confirmation choice removes the bundle node and keeps file records | New native confirmation emits unlink; `BlockListEditor` removes only the bundle node | Source path implemented; runtime and autosave acceptance open. |
| Ungroup all | Converts bundle children to loose `fileWidget` nodes in order | New native confirmation serializes escaped file widgets, parses them through Core, validates each output's type and metadata, flushes active rich slices, and serializes before replacing the bundle | Source path implemented; verify IDs, type, size, link flag, color, order, undo and React round-trip. |
| Keyboard delete | Focused bundle intercepts Backspace/Delete and opens the same confirmation | Qt title click gives the bundle focus; unmodified Backspace/Delete opens its native confirmation unless rename or a modal owns input | Source path added; verify focus, event priority, shortcuts and modal/rename exclusion at runtime. |
| Remove group with files | React offers unlink, ungroup or delete-all confirmation choices | Qt confirmation currently offers unlink or ungroup | Partial. The inspected Qt client has no matching Drive delete operation; do not describe local soft-delete as Drive deletion. |
| Remove one item | React offers ungroup to page, remove from group, or delete file/Drive copy | Native manager asks to unlink from the group or move the local file record to Trash; React-like remote Drive deletion is unavailable | Source path implemented for unlink and local soft-delete. The UI explicitly says a Drive copy remains. Verify restore and partial persistence behavior. |
| Add one file | The manager absorbs loose page files from the current page | Qt add dialog searches saved files and can absorb the loose page files in one batch | Qt saved-file search is additive; loose-file selection granularity and search filtering differ. Compare duplicates, hidden/deleted entries, order and missing records. |

## Native manager behavior

- The Qt widget title still expands or collapses the compact file preview. The hover toolbar opens the manager explicitly, preserving the existing native title interaction; React opens its manager by activating the widget. This remains a discoverability and keyboard-focus difference.
- The manager uses a centered native `Dialog`, item rows with arrow controls, native file preview routing, inline group-title editing, per-item ungrouping and a separate confirmation for unlink versus local Trash. The local Trash path is Core soft-delete; the Core Trash repository includes `file` entries and exposes restore. The Qt path does not delete the Google Drive copy.
- The Qt restore wrapper delegates `item_type="file"` to Core but currently emits no `filesChanged` notification for a restored file. The restored row may require a file-library refresh; verify this before treating the Trash return path as fully accepted.
- The item picker searches active saved files and also exposes the current page's loose file widgets through one batch action. It currently cannot absorb one loose file at a time or apply the picker search to the loose-file batch.
- Item drag-reordering and same-viewport keyboard/focus behavior have not been accepted. Arrow reordering is the available native route.
- Neither source inspection nor `qmllint` verifies that note autosave and the file soft-delete stay consistent under a save failure. The local file row is recoverable from Trash; verify stale bundle references, restoration and visible feedback before closing the associated acceptance item.

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
6. Reorder one item with both arrows and drag, ungroup one item, unlink one item, move one local file to Trash and restore it, add a saved file and absorb loose files. Record that the manager currently lacks drag reorder and individual loose-file absorption parity.
7. Compare local Trash and Drive behavior separately. Test offline/token-missing/partial failure and confirm neither client reports a remote deletion that did not happen.
