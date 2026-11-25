# Caderno Implementation Checklist

Keep boxes unchecked until source review and current evidence exist. Use small commits grouped by one defect or feature. Do not check an item because a component or signal name exists.

## A. Baseline and source mapping

- [ ] Capture current React and Qt commits, worktree status, build options, Qt version, Core bridge version, and platform.
- [ ] Re-read root and app `AGENTS.md`, the parity skill, design-system skill and bug-audit workflow before implementation.
- [ ] Confirm all modified/untracked Qt Notes files have a clear owner and are included in the new folder structure without breaking QML imports or `qmldir` registrations.
- [ ] Compare React `Editor.tsx`, `useEditorExtensions.ts`, `useEditorSync.ts`, `useEditorSave.ts`, `useSlashCommand.ts`, `useEditorDropPaste.ts`, and `PageView.tsx` against current Qt files.
- [ ] Inventory every custom React extension/schema and every Qt AST `blockType`; identify unknown, legacy, and unhandled types.
- [ ] Generate a React-to-Qt function/handler mapping for editor init, change, commit, flush, save, undo, redo, selection, keyboard, paste, drop, page change, and destroy.
- [ ] Confirm all shared calculations and persistence paths use Core and typed bridge methods; remove any duplicate raw SQL or domain rules in Qt controllers.
- [ ] Confirm there are no accidental React layout/behavior changes; permit only behavior-preserving naming/organization changes if required.

## B. Core schema and lossless round-trip

- [ ] Define the canonical NoteBlock schema and document each block type and required/optional attributes.
- [ ] Ensure parse → serialize → parse is stable for every React node and valid legacy representation.
- [ ] Preserve unknown safe `data-*`, style, class and extension attributes that React relies on.
- [ ] Preserve empty paragraph, trailing paragraph, soft/hard breaks, nested marks, entities, emoji, combining characters and links.
- [ ] Verify custom node attributes for question, habit, focus, alarm, calendar event, file, bundle, media, scrap, Mermaid, link preview, link group, toggle, callout toggle, collection, column group, page reference, divider, image and encrypted image.
- [ ] Verify malformed HTML has a safe, user-visible recovery path and cannot silently drop unsupported content.
- [ ] Escape all dynamic HTML text/attribute interpolation once at serialization boundaries and preserve the raw values sent to Core; test ampersands, quotes, apostrophes and angle brackets on every widget type.
- [ ] Resolve the UTF-16/Core offset mismatch for Qt insertion, selection and split APIs.
- [ ] Make entity decoding/escaping complete and canonical without double-decoding.
- [ ] Preserve block colors/highlights in the same semantic representation as React.
- [ ] Keep Core files focused and below the repository's anti-monolith target; split parser, serializer, helpers and tests by responsibility.

## C. Page view and hierarchy

- [ ] Compare React and Qt page canvas width at 1280, 1440 and 1920 px; align Qt's desktop reading column to the 928 px React content width.
- [ ] Compare responsive margins, cover offset, title, icon, description, breadcrumbs, sub-page grid and footer spacing.
- [ ] Verify root/child creation, linked page creation, rename, description, icon, pin, duplicate, move, reorder, delete, restore, import, export and share actions.
- [ ] Verify hierarchy cycle rejection, deleted/missing parent handling, sort order, breadcrumb refresh, and failed persistence feedback.
- [ ] Compare page tree selection, search, collapsed state, scroll state, context menu, keyboard focus, and tabs.
- [ ] Compare cover URL/local file validation, replacement, remove, decode/resize, failure, cancellation, and saved metadata.
- [ ] Verify empty, loading, not-found, locked, unlocked, encrypted, no-content and save-error states.
- [ ] Verify initial content cache, stale refresh, page switch and back navigation do not flash or show another page's content.

## D. Rich-text editor fundamentals

- [ ] Match paragraph and H1–H6 insertion/conversion, spacing, font metrics and keyboard behavior.
- [ ] Match bold, italic, underline, strike, inline code, links, text color, highlight and spoilers for cursor and selection.
- [ ] Match link creation/edit/remove, unsafe-target blocking, duplicate handling and external navigation.
- [ ] Match hard/soft breaks, paste, clipboard, selection, context menu and drag selection.
- [ ] Match ordered/bullet/task lists, nested indentation, multiple paragraphs per item, checkboxes and list exit behavior.
- [ ] Match blockquote/callout color palette, reset, nested content, collapse and block actions.
- [ ] Match code block input, language catalog, lazy highlighting, copy, delete confirmation, add paragraph and undo.
- [ ] Match divider insert, move, delete, drag boundaries and keyboard-accessible actions.
- [ ] Match selection bubble, block handle, hover/focus states and multi-block selection actions.
- [ ] Ensure per-block edits retain cursor/selection, do not rebuild the active TextArea, and produce correct undo units.
- [ ] Verify no syntax or unsupported-paste path silently strips formatting or saves a lossy HTML projection.

## E. Slash commands

- [ ] Complete source and runtime review of all 31 React command IDs and exact keyword aliases using [08-slash-command-crosswalk.md](08-slash-command-crosswalk.md); keep Mermaid as additive Qt-only command.
- [ ] Compare command titles, descriptions, icons, grouping, localization, search normalization and result ordering.
- [ ] Match each selected command's real React outcome, including `/foco` starting a global timer and Qt's current paused inline widget behavior; preserve an inline widget as a separate action only if it remains reachable without changing React slash semantics.
- [ ] Verify keyboard navigation: arrows, Enter, Escape, Left, Space, Backspace, and modifier keys.
- [ ] Verify menu no-result state, error message, selected option announcement and focus restoration.
- [ ] Verify caret location and query deletion for every command.
- [ ] Verify insertion at beginning, middle, end, after a widget, and inside each nested block type.
- [ ] Verify setup modal cancellation, validation, successful record creation and returned widget IDs.
- [ ] Match alarm time (`HH:mm`) and optional-label length constraints; verify incomplete fields cannot create alarms.
- [ ] Return and serialize the created calendar event ID and page ID into the note widget; verify the widget refreshes status/title/date from Core.
- [ ] Match the React event form's tomorrow/14:00 default, title default, event types, reminder choices/defaults, validation, and async submission feedback.
- [ ] Verify Scrap preflight rejects incomplete protocols, whitespace, and bare-domain prefixes with trailing text; confirm invalid entries stay editable and cause no capture request.
- [ ] Verify command behavior after undo, redo, save, page switch and reopen.

## F. Tables

- [ ] Keep filter UI projection separate from canonical HTML and suppress programmatic changes from the dirty/save path.
- [ ] Preserve all filtered-out rows on autosave, save-now, page switch, lock, modal open, reload and crash recovery.
- [ ] Identify the table under the cursor; apply schema, validation, filter, movement and formatting to that table only.
- [ ] Support multiple tables in a single rich slice and multiple slices without cross-table effects.
- [ ] Compare each text/number/date/select/checkbox filter operator, empty handling, locale parsing and date/number format.
- [ ] Compare clear-one/clear-all filter behavior and result counts with React.
- [ ] Verify row/column insert, delete, move and resize preserve cell content, column types, options, header semantics, width, spans and backgrounds.
- [ ] Verify merged cells, nested content, table split, selection range, copy/paste and undo/redo.
- [ ] Verify invalid cell counts/highlights update when cells/schema change and do not mark content dirty by themselves.
- [ ] Verify table toolbar position during scrolling, resizing, window scaling, focus changes and keyboard use.

## G. Images and files

- [ ] Route dropped non-image files through encrypted file import and insert canonical Core file IDs.
- [ ] Queue multi-file drops safely with stable ordering and error feedback; avoid duplicate import or duplicate widget insertion.
- [ ] Compare file picker, drag-drop, attachment selection, link/reference, upload, rename, delete, preview, export, file-missing and lock states.
- [ ] Compare image format allowlist, MIME sniffing, size/pixel limits, single/batch path and clipboard behavior.
- [ ] Compare image alignment, dimensions, caption, alt/title, resize handles, natural-size reset, fit width and undo granularity.
- [ ] Compare crop/view zoom/pan, cancel, save encoding and retained metadata.
- [ ] Verify encrypted image storage, key absence/lock behavior, cache lifecycle, broken remote sources and React `encrypted-image` compatibility.
- [ ] Verify image insertion at paragraph, list, table, column, toggle and block boundaries.
- [ ] Verify DocumentBundle create/open/reorder/absorb/remove/ungroup/delete and missing-file handling.

## H. Native widgets and nested blocks

- [ ] Compare creation/edit/save lifecycle for question, focus, alarm, calendar event, habit, collection, toggle, callout toggle, media, video, book, scrap, Mermaid, link preview and link group.
- [ ] Verify live data refresh and deletion/soft-delete states for linked Core records.
- [ ] Verify nested editor slash commands, AI, page references, selection, drag/drop, undo and persistence recursively.
- [ ] Preserve column widths, child metadata and target group attributes when dropping blocks into columns.
- [ ] Verify maximum nesting depth and behavior at structural boundaries.
- [ ] Verify every modal's loading, disabled, error, retry, empty, cancel and in-flight close behavior.
- [ ] Verify media players stop, timers disconnect and async callbacks cannot update destroyed widgets.

## I. Save, history, collaboration and security

- [ ] Verify dirty state, autosave debounce, explicit save, flush, failure retry and user feedback.
- [ ] Verify optimistic conflict detection and recovery without overwriting another client’s newer content.
- [ ] Verify editor backup/recovery after restart and stale backup invalidation after a successful save.
- [ ] Verify page switching, tab switching, window close and app shutdown flush all active blocks.
- [ ] Compare revision list, semantic diff, locked/encrypted revisions, restore confirmation and post-restore save.
- [ ] Define an interoperable Qt collaboration strategy for React Yjs pages and prove concurrent edits converge without data loss, or obtain an explicit product decision describing the limitation.
- [ ] Verify page body encryption/decryption, lock transitions, plaintext temporary files, cache clearing and metadata boundaries against the native encryption audit.
- [ ] Verify clipboard, file URLs, external links, Mermaid SVG and imported HTML are validated and bounded.

## J. Performance, accessibility and visual parity

- [ ] Measure 100/500/1,000-block notes for startup, first edit, input latency, scroll, parse, serialize, save and memory.
- [ ] Measure large tables, filtering, image-heavy pages, nested widgets and Mermaid diagrams.
- [ ] Prevent excessive full-list Core serialization and unnecessary delegate rebuilds; preserve native focus/caret while optimizing.
- [ ] Verify cancellation/cleanup for timers, connections, async import, metadata requests, preview tasks and media playback.
- [ ] Compare React/Qt at matched window size, DPI, font environment, theme and content for page header, toolbar, editor, every widget, table, modal, hover and focus.
- [ ] Split `NotesSetupWidgetsModal.qml` and `src/controllers/notes/notes_controller.cpp` along focused responsibilities; current source lengths exceed the 300-line target and must be remeasured after the split.
- [ ] Compare keyboard-only and screen-reader paths, accessible names, roles, state, order and selected-item announcements.
- [ ] Compare English and Portuguese labels, errors, empty states and shortcut help.
- [ ] Update `NotesHelpDialog.qml` so all descriptions match active controls and do not mention removed source/preview modes.
- [ ] Update [native-desktop-parity.md](../../../native-desktop-parity.md), [modules/notes.md](../../../modules/notes.md), and documentation ownership whenever status changes.

## K. Final acceptance

- [ ] Complete the focused build, Core tests, Qt Notes tests, QML lint and `git diff --check` commands from [07-verification.md](07-verification.md).
- [ ] Complete side-by-side screenshots for page view, normal editing, every block/widget family, table, image, dialogs, locked page, empty state and error state.
- [ ] Complete source-level second-pass review for every bug fix and acceptance item.
- [ ] Record exact command results, platform/tool versions, and remaining limitations.
- [ ] Mark parity `Complete` only when all required acceptance evidence exists and no unresolved high-severity issue remains.
