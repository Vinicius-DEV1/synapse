# Document-Bundle React-to-Qt Crosswalk

## Scope and evidence

This comparison covers only the Caderno document-bundle block. React files inspected: `apps/web-react/src/components/editor-extensions/bundles/DocumentBundleBlock.ts`, `DocumentBundleNodeView.tsx`, `DocumentBundleModal.tsx`, and `types.ts`. Qt files inspected: `DocumentBundleWidget.qml`, `DocumentBundleModal.qml`, `DocumentBundleDeleteDialog.qml`, `BlockDelegateRouter.qml`, and `BlockListEditor.qml`, plus the shared Qt file/Core bridge contracts.

Source presence is not runtime acceptance. The action dialog and bundle-to-file-widget conversion now have source paths, but this continuation did not run the QML UI, mutate a saved note, or verify file lifecycle/cross-client round-trip behavior.

## Action mapping

| User action | React Web | Desktop Qt | Current assessment |
| --- | --- | --- | --- |
| Rename group | Inline edit in `DocumentBundleNodeView` and modal title editing | Inline title edit in `DocumentBundleWidget` | Source paths exist; compare keyboard/focus, cancel and save feedback. |
| Set/clear color | Anchored `ColorPalettePicker` supports custom colors and reset | Native inline swatch palette | Partial visual/control difference; test reset-to-default and metadata round-trip. |
| Move group up/down | Widget header has direct up/down controls and uses editor movement commands | Generic `NotesBlockHandle` provides up/down and drag | Movement exists in a different location; compare discoverability, boundaries, keyboard and focus. |
| Open manager | Full modal lists items, previews, reorders, ungroups one, removes one, adds files and absorbs loose page files | Add modal searches files and absorbs loose page files; expandable widget row previews and removes items | Missing full management workflow, per-item reorder, per-item ungroup and parity confirmations. |
| Unlink bundle | Confirmation choice removes the bundle node and keeps file records | New native confirmation emits unlink; `BlockListEditor` removes only the bundle node | Source path implemented; runtime and autosave acceptance open. |
| Ungroup all | Converts bundle children to loose `fileWidget` nodes in order | New native confirmation serializes escaped file widgets, parses them through Core, validates each output's type and metadata, flushes active rich slices, and serializes before replacing the bundle | Source path implemented; verify IDs, type, size, link flag, color, order, undo and React round-trip. |
| Keyboard delete | Focused bundle intercepts Backspace/Delete and opens the same confirmation | Qt title click gives the bundle focus; unmodified Backspace/Delete opens its native confirmation unless rename or a modal owns input | Source path added; verify focus, event priority, shortcuts and modal/rename exclusion at runtime. |
| Remove group with files | React offers unlink, ungroup or delete-all confirmation choices | Qt confirmation currently offers unlink or ungroup | Partial. The inspected Qt client has no matching Drive delete operation; do not describe local soft-delete as Drive deletion. |
| Remove one item | React offers ungroup to page, remove from group, or delete file/Drive copy | Qt item drawer currently removes an item directly | Missing confirmation and behavior choices. |
| Add one file | React manager selects saved files | Qt add modal selects an existing file | Verify duplicate guard, hidden/deleted file handling and metadata parity. |
| Absorb loose page files | React manager identifies and adds loose file widgets from the current page | Qt add modal exposes an absorb action | Source exists; verify matching set/order, missing records and failure behavior. |

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
6. Reorder one item, ungroup one item, remove one item using each React choice, add a saved file and absorb loose files. Keep each missing Qt path open until implemented.
7. Compare local Trash and Drive behavior separately. Test offline/token-missing/partial failure and confirm neither client reports a remote deletion that did not happen.
