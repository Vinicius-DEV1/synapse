# Caderno Interaction Inventory

Use this inventory when reviewing every menu, keyboard route, contextual tool, widget, and nested editor. A feature is incomplete if its normal action exists but its undo, error, cancellation, accessibility, or persistence behavior differs.

The command-by-command ID, display-copy, keyword, Qt-route, and remaining-gap comparison is in [08-slash-command-crosswalk.md](08-slash-command-crosswalk.md).

## Page lifecycle

Review: create root page; create child page; create page from a reference; rename; edit description; change icon; pin/unpin; move; reorder; duplicate; export/import; share; delete/restore; lock/unlock; cover add/replace/remove; save now; autosave; history; navigate breadcrumb; open sibling/child; open in new tab; return from modal; handle empty, loading, stale, missing, locked, encrypted, conflict, and failed states.

For each action, verify local metadata/body state, SQLite update, timestamps, history, encryption, user-visible feedback, focus restoration, and whether navigation should occur.

## Editor surface

Review: insert and edit paragraphs; headings 1–6; hard/soft line breaks; bold, italic, underline, strike, inline code, text color, highlight, links, spoilers; blockquote/callout; code block/language; ordered, bullet, and nested task lists; divider; table; image; page reference; all custom widgets; block drag/reorder; selection and bubble toolbar; context menu; shortcuts; paste; drop; AI; undo/redo; keyboard navigation; content save/flush.

The Qt editor now routes Core `NoteBlock` values through `BlockDelegateRouter.qml`, with rich-text slices implemented by `NotesRichTextEditor.qml`. Verify that block changes preserve focus, cursor, selection, per-block attributes, and nested structure. Confirm unsupported content is rejected safely and does not silently lose formatting.

## Table controls

Review: row and column insertion, deletion, move, resize, schema type, select options, number/date format, validation, filter operators, clearing one/all filters, cell overlay, cell/row/column/table/range color, merge/split, selection across cells, header semantics, spans, keyboard navigation, copy/paste, undo/redo, and multiple tables in one note.

Current typed filters in Core include text matching, equality, numeric comparison/ranges, date comparison/ranges, checkbox matching, empty and not-empty. Compare each operator and localized UI label with `apps/web-react/src/components/notes/hooks/useTableFilter.ts` and `components/table/TableColumnTypePopover.tsx`.

## Slash command execution

| React command | Expected result to compare |
| --- | --- |
| `/text` | Convert current block/selection to normal text and put caret at the expected position |
| `/h1`, `/h2`, `/h3` | Apply matching heading; compare conversion from lists, marks and selected ranges |
| `/cols2`, `/cols3` | Insert column group with editable rich content and expected widths |
| `/todo`, `/bullet` | Insert task/bullet list with list keyboard behavior |
| `/callout` | Insert standard callout and preserve its marks/children |
| `/code` | Insert code block, expose language selection and correct cursor |
| `/page-create`, `/page` | Create linked page or select existing page; preserve query and anchor |
| `/group` | Insert expandable collection |
| `/toggle`, `/blockquoteToggle` | Insert standard or callout toggle with editable nested body |
| `/table`, `/table-week`, `/table-day`, `/table-habit` | Insert expected grid/template, schema, column labels and caret |
| `/question` | Open question setup; query may inform generation but must not be lost silently |
| `/ia` | Open AI prompt with selected text and block context |
| `/divider` | Insert divider at current position |
| `/foco` | React opens setup and starts the global timer. Qt now calls the existing timer controller from the primary action; inserting an inline focus widget is a separate Notes action. Verify state, completion, cancellation, and duration limits. |
| `/alarme` | React saves an active alarm. Qt now saves it through the alarm controller without inserting a note widget; linking an existing alarm to the note is a separate Notes action. Verify scheduling, timezone, cancellation, and save/reopen. |
| `/evento` | React creates a calendar event and inserts a widget with its event ID and linked page. Qt now returns event/page IDs through Core and matches tomorrow/14:00, category, and reminder defaults. Verify timezone conversion, create failure, status/title/date persistence, reminder/color controls, anchored popup placement, nested open-agenda routing, confirmation/unlinked/missing/expiry/series deletion, live-state timing, hover reorder, event lookup beyond the agenda list limit, and cross-client round-trip. |
| `/documento`, `/agrupar`, `/scrap`, `/video`, `/livro`, `/evento`, `/habito` | Compare the actual React result with Qt's setup/picker or inserted widget; bind returned entity IDs and handle cancellation/failure. See the command crosswalk for current routes. |

Qt-only `/mermaid` should remain an additive native capability; it must not alter or replace React behavior.

For all commands, test menu filtering by ID/title/subtitle/keyword in English and Portuguese, result ordering, no-result state, arrows, Enter, Escape, Left/Space dismissal rules, query removal, unsupported-command feedback, insertion into nested blocks, undo, and screen-reader selected-item announcements.

## Widget inventory

Each widget needs a source-schema round-trip review and full lifecycle comparison. The Qt router currently has dedicated branches for: code block, blockquote, question, habit, focus, alarm, calendar event, file attachment, document bundle, toggle, callout toggle, column group, link preview, link group, media, scrap, collection, encrypted image, Mermaid, external image, and rich-text fallback.

For each type verify: canonical HTML node and attributes; missing/legacy attributes; creation; display; edit; action buttons; keyboard equivalent; loading/error/deleted/locked state; nested rich content; persistence; copy/paste; reorder; undo/redo; page reload; cross-client React round-trip; and cleanup of timers, signals and media handles.

## Modal and popover states

For `NotesEditorModalsHost.qml`, `NotesSetupWidgetsModal.qml`, `NotesMediaWidgetPickerModal.qml`, link/page-reference dialogs, image actions/viewer, history, delete confirmation, and widget-specific dialogs, compare: initial focus; Escape; outside click; confirmation; disabled/busy state; validation messages; empty results; failure/retry; close while work is in flight; keyboard tab order; focus restoration; and modal stacking.
