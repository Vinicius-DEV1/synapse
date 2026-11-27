# Caderno Implementation Checklist

Keep boxes unchecked until source review and current evidence exist. Use small commits grouped by one defect or feature. Do not check an item because a component or signal name exists.

## A. Baseline and source mapping

- [ ] Capture current React and Qt commits, worktree status, build options, Qt version, Core bridge version, and platform.
- [ ] Re-read root and app `AGENTS.md`, the parity skill, design-system skill and bug-audit workflow before implementation.
- [ ] Confirm all modified/untracked Qt Notes files have a clear owner and are included in the new folder structure without breaking QML imports or `qmldir` registrations.
- [x] Extract bundle metadata validation and extension-badge projection to `DocumentBundleOperations.js`; `DocumentBundleWidget.qml` is now below 300 lines, and the existing body/actions/dialogs remain separate QML components. Source review and focused `qmllint` pass.
- [ ] Mount the refactored bundle widget and compare valid, empty and malformed metadata, title/color updates, manager/picker opening, signal order, saved attributes and Qt/React round-trip to confirm the extraction preserved visuals and event behavior.
- [x] Split `FileAttachmentWidget.qml` into the Core-backed parent and focused `FileAttachmentIdentity.qml`, `FileAttachmentRenameEditor.qml`, `FileAttachmentActionBar.qml`, and `FileAttachmentKeyboardActions.qml` views; all five QML files are below 300 lines. Focused `qmllint` and the native app build pass.
- [x] Match the React file-widget title flow in Qt source: wrap long names, grow row height from content with a 44 px minimum, and align the 32 px icon badge and 12 px icon/title spacing. Focused `qmllint` and the native app build pass; see QT-NOTES-053.
- [x] Route Backspace at the start of a rich-text block after a file widget, and Delete at the end of the preceding rich-text block, through the existing file confirmation dialog; see QT-NOTES-054.
- [x] Add presentation-only file-widget selection keyed by stable NoteBlock ID; select on pointer press before preview, forward state through the router, apply default/custom/missing border and ring colors, keep it out of serialization, and route focused selected-widget Delete/Backspace through the existing confirmation with rename/palette/action/dialog guards. Focused QML lint and native build pass; runtime focus and visual behavior remain unchecked. See QT-NOTES-055.
- [ ] Verify selected file-widget state at the same viewport for normal, custom-color and missing files; test pointer ordering, nested editors, other-block/page clearing, preview open/return, rename/color changes, and prove no selection data reaches Core or serialized HTML. Compare the full ring/shadow treatment with React.
- [ ] Verify Delete and Backspace on a selected file widget open exactly one confirmation; test active focus after preview return, dialog/palette/action suppression, Cancel, confirmed actions, nested editors and save failure. See QT-NOTES-055.
- [ ] Mount the file widget and compare same-size geometry, long-name wrapping, rename input accessible name, focus and text selection, action reveal/tab order, color palette anchoring, both adjacent keyboard deletion directions, dialog return focus, and serialized attributes with React; source evidence alone does not verify runtime parity.
- [ ] Compare React `Editor.tsx`, `useEditorExtensions.ts`, `useEditorSync.ts`, `useEditorSave.ts`, `useSlashCommand.ts`, `useEditorDropPaste.ts`, and `PageView.tsx` against current Qt files.
- [ ] Inventory every custom React extension/schema and every Qt AST `blockType`; identify unknown, legacy, and unhandled types.
- [ ] Generate a React-to-Qt function/handler mapping for editor init, change, commit, flush, save, undo, redo, selection, keyboard, paste, drop, page change, and destroy.
- [ ] Maintain a Notes counterpart map across React/Tauri, Qt, and native Android for equivalent files, public action names, payload fields, and test scenarios; align names/paths only where the responsibilities are truly one-to-one, preserve the React UI and framework-native layer roots, and record intentional differences.
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
- [x] Define the Core rich-HTML split offset as UTF-16 and map text, supported block separators, void elements and decoded character references while keeping split tags balanced.
- [ ] Verify the Core offset map against Qt `QTextDocument` at paragraph, heading, list, table-cell/row, `<br>`, image/object, nested-mark, combining-character, and supplementary-character cursor boundaries.
- [x] Use the complete HTML5 named-character-reference table and HTML numeric-reference rules in Core Notes decoding; keep text and attribute contexts distinct and preserve unknown references in one pass.
- [ ] Verify parse/serialize round-trips for named and numeric entities, semicolonless references in text and attributes, unknown/malformed references, ampersands, quotes, apostrophes, and angle brackets in both clients.
- [ ] Verify page-reference cursor mapping around active/deleted references and adjacent identical/different references; each native `QTextObjectInterface` reference must consume one `QTextDocument` UTF-16 position and preparation must leave no boundary word joiner counted as content.
- [ ] Verify pointer hit testing selects exactly one page-reference object; typing replaces the selected object; Backspace/Delete opens confirmation; Keep, confirmed removal, undo, and click behavior match React for active and deleted targets.
- [ ] While a referenced note stays open, rename, trash, restore from Trash, and rename its target again; verify every top-level and nested chip updates title/state/action without changing stored markup, dirty state, cursor, selection, or undo history.
- [ ] Compare active and deleted page-reference labels at the same viewport: active shows only the current title; missing/deleted shows the current title plus ` (Excluída)` and measures enough width without clipping or wrapping differently.
- [ ] Drag PDF, EPUB, text, image, video, audio, archive, and unknown files into a note; verify each serialized widget retains the file type persisted by Core and the correct React/native open action after save and reopen.
- [ ] Verify copy/paste and cut for a selected reference, including canonical HTML and custom Qt MIME; round-trip Qt→React and React→Qt with titles containing quotes, ampersands, emoji and combining characters.
- [ ] Verify a merged `QTextFragment` containing adjacent identical object-replacement characters serializes one canonical `span[data-page-id][title]` per reference and preserves order/count after reload.
- [ ] Preserve block colors/highlights in the same semantic representation as React.
- [ ] Keep Core files focused and below the repository's anti-monolith target; remeasure each Notes Core file after subsequent changes and split any new files that exceed 300 lines.

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
- [ ] Verify `/foco` starts the global Qt timer and `/alarme` saves an active alarm without inserting note widgets; confirm inline timer insertion and existing-alarm linking remain separate Notes actions.
- [ ] Verify keyboard navigation: arrows, Enter, Escape, Left, Space, Backspace, and modifier keys.
- [ ] Verify menu no-result state, error message, selected option announcement and focus restoration.
- [ ] Verify caret location and query deletion for every command.
- [ ] Verify insertion at beginning, middle, end, after a widget, and inside each nested block type.
- [ ] Verify setup modal cancellation, validation, successful record creation and returned widget IDs.
- [ ] Match alarm time (`HH:mm`) and optional-label length constraints; verify incomplete fields cannot create alarms.
- [ ] Return and serialize the created calendar event ID and page ID into the note widget; verify the widget refreshes status/title/date from Core.
- [ ] Verify a linked event status toggle updates Core before the widget node and survives reload; failure must leave the prior status intact and visible.
- [ ] Add and verify React-equivalent event deletion confirmation, including cancellation, missing events, expired events, and Core failure; the agenda record must not be silently deleted.
- [ ] Verify every event deletion entry point, including the widget control, popover, and generic block handle, uses the same confirmation path.
- [ ] Compare the default color swatch selected/idle fill, border thickness and × glyph against React at the same scale; confirm all nine color swatches retain their current selection ring (QT-NOTES-048).
- [ ] Verify the new native event popover stays anchored at all editor edges, repositions while scrolling, closes on Escape/outside click, and never blocks unrelated note content.
- [ ] Verify the native “Abrir na Agenda” popover action opens the calendar module from top-level and nested Notes editors without changing the note or event.
- [ ] Verify recurring event widget deletion asks clearly, deletes the complete active Core series on confirmation, preserves it on cancellation/failure, and keeps expired-series records when removing the note widget.
- [ ] Verify a legacy event widget without an event ID can be confirmed and removed without calling calendar persistence; cancellation keeps the node.
- [ ] Verify linked widgets use the Core event-by-ID query, resolve events outside the 300-row agenda list, and refresh after successful Qt event mutations without repeated full-list scans.
- [ ] Verify hover move-up/down controls at first/last positions and inside nested block lists; IDs, attributes and undo behavior must remain intact.
- [ ] Verify live-event highlighting at the exact −15/+60 minute boundaries, completion/missing-record states, time-zone transitions, and delegate destruction.
- [ ] Verify linked event editing persists title/date through Core, preserves event duration/reminders, and leaves both Core and note unchanged on validation or write failure.
- [ ] Compare event widget color controls and reminder labels with React; verify widget color survives Core refresh and cross-client save/reopen.
- [ ] Keep the widget's serialized color independent from the linked calendar event color during refresh and React round-trip.
- [ ] Match the React event form's tomorrow/14:00 default, title default, event types, reminder choices/defaults, validation, and async submission feedback.
- [ ] Verify Scrap preflight rejects incomplete protocols, whitespace, and bare-domain prefixes with trailing text; confirm invalid entries stay editable and cause no capture request.
- [ ] Verify command behavior after undo, redo, save, page switch and reopen.

## F. Tables

- [ ] Keep filter UI projection separate from canonical HTML and suppress programmatic changes from the dirty/save path.
- [ ] Preserve all filtered-out rows on autosave, save-now, page switch, lock, modal open, reload and crash recovery.
- [ ] Force a filter evaluation failure after a valid filter; verify it restores the canonical table, removes the read-only overlay, clears filter state, and leaves source HTML and dirty state unchanged.
- [ ] Identify the table under the cursor; apply schema, validation, filter, movement and formatting to that table only.
- [ ] Support multiple tables in a single rich slice and multiple slices without cross-table effects.
- [ ] Compare each text/number/date/select/checkbox filter operator, empty handling, locale parsing and date/number format.
- [x] Make the Qt typed-column selector use React's 240 px three-column layout and close control; selecting a type clears only its own filter, preserves other filters through the schema write, and recalculates/restores the read-only projection. Persistent offscreen QML coverage passes; see QT-NOTES-059.
- [x] Match the collapsed “Filtrar Coluna” section, local draft state, explicit Apply/Clear actions, typed select/checkbox inputs, and repositioning when the section expands. Persistent offscreen QML coverage passes; see QT-NOTES-060.
- [ ] Compare Qt's date text inputs with React's native date inputs, including localized calendar selection, keyboard use, validation, and between ranges.
- [ ] In the running app, apply filters to two columns, change one column's type, and verify only that column's filter clears while the other filter and visible rows remain correct through save, reload and React round-trip.
- [ ] Compare the column-type popover at left/right/top/bottom editor edges and at matched viewport/DPI; verify clamping, flipping, selected and hover states, Escape/outside close, keyboard focus and accessible labels.
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

## G.1. Notes modal parity

- [ ] Complete [11-modal-crosswalk.md](11-modal-crosswalk.md): match every React Notes editor modal/popover to its native host and verify each Notes entry point.
- [x] Add the native Notes media action dialog with current-tab/new-tab choices; preserve media type, ID and title through Notes signals and add video tab state capture/restore. QML harness and source build pass; verify player/module loading and tab restore in the running app.
- [x] Add the native Notes file action dialog with quick preview, full reader in the current tab, and full reader in a new tab; preserve direct-widget actions separately from bundle previews. QML harness and source build pass; verify file types, missing IDs, failure states and visual parity in the running app.
- [ ] Verify live current/new tab routing for linked books, videos and files, including switching away/back, pinned tabs, missing/deleted target IDs, and saved-tab metadata.
- [ ] Compare React's in-place quick file viewer with Qt's protected preview over the current note; ensure the note stays intact and the preview can be dismissed without losing its current editor state. Compare resume and bookmark control geometry, keyboard focus, popup placement, labels and bookmark count at the same viewport/DPI.
- [ ] Compare image viewer/crop and image-delete dialog geometry, controls, keyboard behavior, focus, errors, undo, and save/reopen behavior at matching viewport/DPI.
- [ ] Compare consolidated setup/picker surfaces with React focus, alarm, event, habit, question, file upload/select, and media select dialogs, including fields, defaults, search, validation, cancellation, busy/error/empty states, and insertion target. Upload and existing-file selection are now separate Qt modes; the existing-file command remains absent from the visible React and Qt slash catalogs (QT-NOTES-063).
- [x] Add the explicit Notes calendar-event Cancel action beside the primary create action and verify cancel does not create or insert an event; focused harness passes. See QT-NOTES-064.
- [x] Match React Notes focus setup labels, icons, example placeholders and Tag → Description → Target Time ordering while preserving slash prefills and native actions; focused harness passes. See QT-NOTES-065.
- [x] Give alarm creation its own large-time, optional-label and primary-save form on a full-canvas responsive surface; preserve existing-alarm linking as a collapsed secondary flow and verify creation/invalid time/link serialization. See QT-NOTES-066.
- [ ] Verify full-canvas alarm backdrop click behavior, blur/tint appearance, focus return, live creation failure, reminder delivery and matched-viewport geometry. See QT-NOTES-066.
- [x] Match Notes habit quick-create defaults, prevent case-insensitive duplicates, resolve the actual Core-created habit ID, and preserve IDs for existing selections. See QT-NOTES-067.
- [x] Add the Notes habit picker keyboard path (ArrowUp/ArrowDown, Enter, Escape, 1–9), active-option highlighting, search focus and empty-state guidance; focused harness passes. See QT-NOTES-068.
- [ ] Verify actual Qt key-event propagation in a visible app window, focus return, accessibility and same-viewport HabitSelect modal geometry. See QT-NOTES-068.
- [x] Create Notes question batteries through an atomic Core transaction that returns the actual ID, stores `sequential` layout, and writes both `page_id` and `quiz_page_links`; preserve existing selection IDs and show failure feedback without inserting a broken block. Focused Core and QML harnesses pass. See QT-NOTES-069.
- [ ] Reopen a saved note after live Qt question-battery creation and verify the question widget resolves its battery; compare title/search/empty/error/cancel/focus/insertion geometry at a matched viewport. See QT-NOTES-069.
- [ ] Repair React's existing-question suggestion selection path: `QuestionCreateModal` passes a reuse flag, but `EditorModalHost` currently ignores it and creates another battery. Keep Qt's real-ID selection behavior while the React defect is fixed in a separately authorized parity pass. See QT-NOTES-069.
- [x] Match the Notes question modal's hierarchy: help icon/title, full-width title field with embedded plus action, results heading, existing battery rows and empty state; keep habit setup unchanged. Focused QML checks pass. See QT-NOTES-070.
- [ ] Capture React and Qt question-create modals at the same viewport and compare spacing, backdrop, focus/close behavior and result/search semantics. See QT-NOTES-070.
- [x] Remove global battery/question scans from each Notes question widget; resolve metadata by battery ID and load question content by ID only when expanding the preview. Focused Core and QML checks pass. See QT-NOTES-071.
- [ ] Verify large-note runtime responsiveness, question preview expand/collapse/reopen, missing/deleted IDs and metadata refresh after external edits. See QT-NOTES-071.
- [x] Keep Notes focus-session loading scoped to the selected battery or legacy question ID; do not read or filter the global question list. Focused QML harness covers both paths. See QT-NOTES-072.
- [ ] Verify missing/deleted targets, focus modal visual states, answer submission and save/reopen from the Notes entry point. See QT-NOTES-072.
- [x] Normalize Core question transport records at the Notes focus boundary: map `question`/`question.prompt`, parse JSON-string options, and adapt snake_case/camelCase answer fields. Focused battery, legacy-target and malformed-options cases pass. See QT-NOTES-077.
- [ ] Run a real Core-backed Notes focus session and verify the statement, options, correct-choice feedback, open-answer fields, malformed legacy records, and save/reopen behavior. See QT-NOTES-077.
- [x] Ask for confirmation before removing a question card from a note, and preserve the linked battery/questions in the Questions module. The QML harness verifies Cancel and exactly one confirmed removal signal. See QT-NOTES-073.
- [ ] Compare question-block delete confirmation size, text emphasis, backdrop, focus return, Escape behavior and live save/reopen against React. See QT-NOTES-073.
- [x] Show the React finish confirmation before Notes focus results; track confirmed questions separately and allow Review, finish, Escape and backdrop cancel. Focused QML flow/dialog cases pass. See QT-NOTES-074.
- [ ] Compare finish-dialog viewport geometry, icon, status colors/text, focus, shortcut propagation and result persistence against React. See QT-NOTES-074.
- [x] Preserve open-answer drafts through question navigation; persist evaluated typed answers and feedback through typed Core/bridge/controller operations and restore the latest attempt by targeted battery/question lookup. Focused Core/QML tests, a typed bridge C-API round-trip, and a native Qt controller integration test pass; the controller test recreates a page-linked question, saves an attempt, closes/reopens the controller/database, calls the production Notes session loader and instantiates the production sequential focus modal to validate restored answer, verdict, count and explanation state. Reopening the full saved note through the running Qt Notes UI remains unverified. See QT-NOTES-075.
- [x] Connect explicit Notes open-answer submission to the existing native AI client with the React prompt/response contract, loading and duplicate-submit guards, correct/partial/incorrect verdicts, provider error/retry, and persistence retry without a second provider call. The QML harness uses a mocked evaluator and does not contact Gemini. Review the existing configured-key transport/storage risk separately. See QT-NOTES-075.
- [x] Show the question's reference answer after evaluation alongside its explanation; focused QML coverage verifies the Notes focus card uses the expected-answer field. See QT-NOTES-075.
- [x] Align the Notes open-answer explanation with React's disclosure hierarchy: one neutral panel contains the reference answer and detailed explanation; render Notes prompts/explanations as Markdown and offer an in-card `Gabarito` control linked to `Alt+G`. Focused QML checks cover the grouped panel, Markdown format and shared toggle state. Same-viewport geometry, color and focus/keyboard dispatch comparison remain open. See QT-NOTES-075.
- [x] Register React's `Alt+G` and `Ctrl+G` explanation shortcuts for Notes open answers and route them through the shared toggle state. Add plain `G` when the answer editor is not focused; keep it disabled while typing, outside the Notes focus mode, or when a seventh multiple-choice option exists. Focused QML checks verify sequence registration and both context gates. See QT-NOTES-082.
- [x] Dispatch `G` into the focused answer editor, `Ctrl+G`/`Alt+G` while it owns focus, and plain `G` with modal focus through a visible `QQuickWindow`; the native test verifies text entry and shared explanation toggling. See QT-NOTES-082.
- [ ] Verify shortcut focus/propagation in the running desktop application and compare explanation behavior with React at the same viewport. See QT-NOTES-082.
- [x] Close the explanation disclosure whenever Notes focus navigates to another question while retaining the answer, evaluation and answered count. Focused QML coverage returns to a previously evaluated question and verifies its answer remains restored with the disclosure closed. See QT-NOTES-083.
- [ ] Compare next/back navigation and restored explanation state with React in the running Notes focus UI. See QT-NOTES-083.
- [x] Add React-equivalent Notes focus navigation using Left/Right, `<`/`>`, and Alt+Left/Right while the answer field is focused. Focused QML checks confirm sequence registration, focus gates, preserved drafts, and final-question confirmation. See QT-NOTES-084.
- [x] Dispatch Alt+Right/Left while the answer field is focused through a visible `QQuickWindow`; verify navigation, draft restoration and explanation closing, and confirm unmodified Right leaves the active question/draft unchanged. See QT-NOTES-084.
- [x] Dispatch unmodified Left/Right and `<`/`>` with modal focus through a visible `QQuickWindow`; verify first/last boundaries and finish confirmation. See QT-NOTES-084.
- [ ] Verify question counts, focus behavior and the complete navigation flow in the running desktop application at a matched viewport. See QT-NOTES-084.
- [x] Generate Notes multiple-choice option shortcuts from the current list (`1–9`, `A–Z`) and preserve option G when it exists. Focused QML tests cover eight-option mapping, text-focus/confirmed guards and G resolving to option seven. See QT-NOTES-085.
- [x] Dispatch `G` and `7` through a visible `QQuickWindow` for a seven-option question; both select option seven. Dispatch `A` and `Z` for a 26-option question and verify indexes 0 and 25. QML mapping checks cover 1/4/9/10/26-option boundaries and reject unavailable indexes. See QT-NOTES-085.
- [ ] Verify option shortcuts, visible letter labels and input isolation in the running desktop application at a matched viewport. See QT-NOTES-085.
- [x] In Notes focus, leave Space inert before answer confirmation and advance after confirmation; retain generic quiz Space behavior outside Notes. Focused QML checks cover the answered, focused-input and navigation state gates. See QT-NOTES-086.
- [x] Dispatch Space through a visible `QQuickWindow`: it is inert before confirmation and while the answer field is focused, advances an answered question, and opens the finish confirmation after the last question. See QT-NOTES-086.
- [ ] Verify the completed-answer path and final state in the running desktop application and compare with React at the same viewport. See QT-NOTES-086.
- [ ] Verify open-answer results, history and counts after saving/reopening a real note in the Qt UI, check cross-client visibility, and compare the visible response/evaluation states against React at a matched viewport. Core database close/reopen persistence is covered separately; see QT-NOTES-075.
- [x] Add a Notes-only contextual assistant dialog after open-answer evaluation, including the React-shaped first prompt, follow-up history, send/loading/provider error, clear, Escape/backdrop/close, late-response invalidation and chat cleanup when the focus session ends. Mocked QML tests cover these states. See QT-NOTES-078.
- [x] Add typed Core/Qt bridge operations for assistant create/edit/delete/reorder actions. Core enforces same-battery targets and atomic rollback; three focused tests cover mutation, validation and rollback. See QT-NOTES-079.
- [x] Parse React-compatible action responses, render proposal cards, wire single/batch accept/reject and persist only accepted actions through the typed Core operation. Mocked QML coverage verifies all four action kinds, target mapping, malformed/truncated JSON recovery, rejection without side effects, batch persistence retry and refresh across reordering. See QT-NOTES-079.
- [ ] Add React's independent generator/validator model choices to Qt settings and use the selected validator for the second validation pass. The second pass, progress, fail-safe behavior and validated/corrected metadata already exist, but both passes currently use Qt's single configured Gemini model. See QT-NOTES-079.
- [x] Add the four React quick prompts and `@` referenced-battery selector. The Core-backed picker filters note batteries by title/page, excludes the active and already attached batteries, supports keyboard selection/removal, and sends referenced questions as read-only non-repetition context. Mocked QML tests cover these paths. See QT-NOTES-080.
- [ ] Verify `@` battery loading and page titles from a real Notes database, attached-context generation with Gemini, and modal layout/keyboard navigation at a matched viewport. See QT-NOTES-080.
- [ ] Compare assistant modal geometry, message/action layout, focus return, close behavior and matched-viewport keyboard behavior against React; validate against live Gemini after mocked actions pass. See QT-NOTES-078 and QT-NOTES-079.
- [x] Match Notes habit quick-create defaults, prevent case-insensitive duplicates, resolve the actual Core-created habit ID, and preserve IDs for existing selections. See QT-NOTES-067.
- [ ] Add and verify the React HabitSelectModal keyboard path (ArrowUp/ArrowDown, Enter, Escape, 1–9), loading/empty/create feedback and exact focus return for the Notes habit picker. See QT-NOTES-067.
- [ ] Verify every modal/popover loading, disabled, error, retry, empty, cancel, outside-click, Escape, tab-order, focus-return, stacking and close-during-work state.
- [x] Open duplicate-link matches in a centered Notes modal with React's resource header, ancestor paths, page navigation, Escape and outside-click dismissal; remove the inline card expansion while retaining link color and note drawers. The focused QML harness passes four behavior cases. See QT-NOTES-076.
- [ ] Verify duplicate detection against real note content, outside-click and focus restoration in the running editor, then compare modal dimensions, typography, spacing, overlay, row hover, screen-edge behavior and accessibility at matching viewport/DPI. See QT-NOTES-076.
- [x] Correlate local Notes upload completion by the Core operation request ID, build the widget from the returned file metadata, ignore stale results, show import failures and decode the selected local file URL; focused harness passes 4/4 cases. See QT-NOTES-061.
- [x] Add multi-file local selection, add/remove, default-on bundle grouping, sequential Core imports, result-derived file/bundle HTML and retry without reimporting prior successes. The focused harness passes 8/8 behavior cases, including bundle-item parsing. See QT-NOTES-062.
- [x] Keep the visible Notes upload command focused on local upload and split the legacy existing-file selector into its own mode; verify linked vs uploaded widget serialization and mode routing in the focused QML harness. See QT-NOTES-063.
- [ ] Verify real `OpenFiles` selection, ENC1 import, second-file failure/retry, busy dismissal guard, saved note round-trip and same-viewport upload controls. Assess the missing Qt Drive upload/status and percentage progress against React; record an approved limitation if kept out of Qt. See QT-NOTES-062.
- [ ] Verify local encrypted import and the inserted attachment in a live Notes page, including encoded local paths, cancellation during import, retry, save/reopen, and error/focus behavior. See QT-NOTES-061.
- [ ] Capture same-viewport screenshots for each modal's default, populated, validation/error, and confirmation states; record any intentional native adaptation and remaining mismatch.

## H. Native widgets and nested blocks

- [ ] Compare creation/edit/save lifecycle for question, focus, alarm, calendar event, habit, collection, toggle, callout toggle, media, video, book, scrap, Mermaid, link preview and link group.
- [ ] Verify legacy link-group metadata parses ordinary JSON before attempting URI-decoding; percent-escaped URLs remain byte-for-byte intact, encoded legacy JSON still loads, and malformed entries are reported without allowing an edit to overwrite them.
- [ ] Verify document-bundle metadata parses ordinary JSON before legacy URI-decoding; filenames with `%` survive unchanged, malformed bundles cannot be overwritten by rename/recolor/add/remove, and valid bundles round-trip through React.
- [ ] Verify document-bundle remove actions from the widget, generic block menu, and focused Delete/Backspace open the same dialog; cancel, unlink and ungroup have distinct results, rename/modal input keeps its keyboard behavior, and ungroup uses Core-parsed file-widget nodes with stable order and metadata.
- [ ] Accept the native document-bundle manager against React: arrow and drag reorder, preview, ungroup one item, unlink or move one local file to Trash, restore from Trash, and absorb loose files from top level, toggles, collections, blockquotes, link groups and columns while removing the exact source in the same Core-backed AST update. Verify link/type/size/name metadata, column wrappers/widths/order, stale nested paths, keyboard/focus, undo, save/reload and React round-trip. Record other unsupported containers and that Drive-copy deletion remains unavailable unless a typed native service is added.
- [ ] Verify “Mover para a Lixeira local” waits for the page save to succeed. Force a save failure/conflict and confirm the file remains active; undo or add another file reference before save and confirm deletion is canceled; force `deleteFile` failure and verify the page stays saved, the file remains active, and the save indicator offers retry. Switch pages with a queued request and confirm it is scoped to the original page.
- [ ] Verify page navigation is blocked when saving a dirty note fails or conflicts. Confirm the selected page, editor content, dirty/error state, and queued document-bundle Trash intent remain intact until retry succeeds; confirm navigation can proceed after the note save succeeds even if the file soft-delete remains queued for retry.
- [ ] On a stale-timestamp conflict, verify the native choice dialog can explicitly keep local edits and save them against the latest timestamp, or discard them and reload the saved page. Confirm focus, keyboard operation, encrypted-page behavior, history and queued file-Trash reconciliation.
- [ ] Verify React's delete-all choice against Qt file lifecycle: Qt must name local Trash accurately and report partial/failure state; do not claim Google Drive deletion until a native Drive delete contract and outcome exist.
- [ ] Compare React bundle move-up/down controls with Qt's block handle at first/last positions, hover/focus, keyboard use and nested-editor depth; record the control-location difference even where native movement works.
- [ ] Verify live data refresh and deletion/soft-delete states for linked Core records.
- [ ] Verify Notes file widgets resolve file metadata by ID regardless of folder, visibly handle missing/trashed records, and refresh after rename, delete and restore signals. Confirm restored files become previewable without reopening the page.
- [ ] Force a Core file-rename failure from the Notes widget; confirm it does not change widget attributes or saved note content, keeps the entered name for retry and exposes an error. Verify successful retry updates Core and React-compatible widget metadata exactly once.
- [ ] Cancel and reopen the file rename editor after typing a draft and after a Core metadata refresh. Confirm the input resets to the current resolved name and selects the basename before the final extension; verify full selection for dotfiles and extensionless names, multi-dot names, focus, Enter, Escape, retry, double-click and the hover action.
- [ ] Compare attachment previews for folders, PDF, EPUB, audio, image, video, text, code and unsupported formats. Check active page, floating/read-only page, errors, async result routing, and the close/return path.
- [x] Add a Notes-only Markdown sparkle action and AI modal. It sends bounded start/end document context (up to 48,000 characters), preserves chat history, shows original/proposed Markdown, supports cancellation/stale-response rejection, and applies through encrypted same-ID save. Focused build, QML lint and `--suite=markdown-ai` pass; evidence in QT-NOTES-081.
- [x] Implement Notes `@` battery suggestions, attached read-only question context, generated-question review and typed Core insertion; after successful insertion, refresh an expanded question block from Core. Focused keyboard, reference, insert/retry, QML lint and widget-refresh tests pass; see QT-NOTES-081.
- [x] Add safe line-level insertion/deletion highlighting and a raw-proposal toggle to Markdown AI review; bound LCS work and use a common-prefix/suffix fallback for large diffs. Focused QML/AI tests cover changed/unchanged lines, large fallback, raw toggle and proposal actions; see QT-NOTES-081.
- [x] Pass the active data controller from the Notes file viewer into the Markdown assistant and normalize Core `QVariantList` battery/question results before filtering or mapping. Viewer harness verifies reference loading, question context and cleanup on `filePreviewsInvalidated`; live vault-lock integration remains open. See QT-NOTES-081.
- [x] Reject same-battery generated questions whose prompts match an active prompt after case and whitespace normalization. Core tests verify duplicate rejection and transaction rollback for a mixed action batch, while another battery remains isolated. See QT-NOTES-081.
- [ ] Decide and verify safe handling of semantic paraphrases with different wording; current Core guard intentionally covers exact normalized wording only. Keep model/user review and do not claim paraphrase detection. See QT-NOTES-081.
- [ ] Finish Markdown AI acceptance: compare inline change markers, colors and typography against React; verify live-controller vault-lock behavior, live provider response, proposal/apply updates in a reopened attachment, and matched-viewport modal sizing, focus, keyboard and accessibility. See QT-NOTES-081.
- [ ] Verify bundle inline/manager previews and file widgets nested in toggles, columns and collections route through the owning active/floating PageView, start Core exactly once, close the bundle manager when needed, and show success/error outcomes.
- [ ] Remove an attachment while another rich-text slice has pending edits; verify those edits are flushed and preserved, and that a failed flush or serialization leaves the attachment in place with recoverable feedback.
- [ ] Runtime-check attachment choices at root and inside nested toggles, columns, and collections against React: Cancel, Unlink, and local Trash. Confirm Cancel changes nothing, Unlink leaves the Core file active, local Trash waits for a successful page save, duplicate references preserve the file, save conflict preserves the file and note, failed Core deletion remains retryable, and Trash restore works. Qt leaves Drive copies intact and states this in the dialog; remote deletion requires a typed native service.
- [ ] Verify the attachment-deletion dialog covers the full app window, remains centered at small and large sizes, dismisses on Escape/outside without performing an action, and restores keyboard focus to the editor.
- [ ] Compare the missing-file notice's Keep/Remove Widget actions, direct block deletion, focused Backspace/Delete, and modal error recovery. Confirm each path opens exactly one confirmation and preserves the note if AST serialization fails.
- [x] Replace CSS-style alpha suffix concatenation in Notes widget colors with `NotesColorUtils.withHexAlpha()`, preserving the six-digit serialized palette value. Focused QML lint and native build pass; see QT-NOTES-056.
- [ ] Runtime-verify the shared Notes file and document-bundle palette against React: nine named colors plus default, bottom-end anchoring/flip/viewport clamp, correct default/hover/selected alpha colors, outside/Escape dismissal, trigger toggle, keyboard/focus, high-DPI geometry and saved hex values after Qt/React round-trip. See QT-NOTES-048 and QT-NOTES-056.
- [ ] Compare same-ID rename refresh, local arrows versus native block handle, keyboard order, accessible names, focus restoration and same-viewport styling; record any accepted native control-location difference.
- [ ] Tab and Shift+Tab through file-widget and document-bundle controls without using the pointer; verify hidden action rows reveal on focus, focus indicators and accessible names, Enter/Space activation, palette operation, invalid-metadata disabled actions, nested-editor traversal and focus return from dialogs.
- [ ] Verify nested editor slash commands, AI, page references, selection, drag/drop, undo and persistence recursively.
- [ ] Verify native page-reference object accessibility name/role, keyboard focus, visible selection, hit target, chip geometry/colors, and updated title/deleted state against React at the same viewport.
- [ ] Verify the rich editor's accessible description announces the selected/adjacent page-reference title and deleted state as the caret moves, without changing dirty state; validate screen-reader role/action behavior separately.
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

- [x] Remove the widget color palette’s unconditional 40 ms position polling; resolve the nearest ancestor Flickable, defer initial positioning until the popup opens, and clear the observer on close (QT-NOTES-057).
- [x] Verify initial edge flip, vertical/horizontal scroll, nested Flickable selection, window resize clamping and observer cleanup on close in isolated offscreen QML harnesses (QT-NOTES-057).
- [x] Verify Escape/outside-click dismissal, scroll anchoring and editor-focus restoration through actual `FileAttachmentWidget` and `DocumentBundleWidget` instances inside Flickables (QT-NOTES-048/057).
- [x] Select a bundle swatch and confirm canonical `data-color` changes while bundle `data-type` and item metadata remain intact in the emitted attributes (QT-NOTES-048).
- [ ] Verify actual NotePage nested-editor chains, page save/reload and React round-trip; compare high-DPI visuals and idle resource use (QT-NOTES-048/057).

- [ ] Measure 100/500/1,000-block notes for startup, first edit, input latency, scroll, parse, serialize, save and memory.
- [ ] Measure large tables, filtering, image-heavy pages, nested widgets and Mermaid diagrams.
- [ ] Prevent excessive full-list Core serialization and unnecessary delegate rebuilds; preserve native focus/caret while optimizing.
- [ ] Verify cancellation/cleanup for timers, connections, async import, metadata requests, preview tasks and media playback.
- [ ] Compare React/Qt at matched window size, DPI, font environment, theme and content for page header, toolbar, editor, every widget, table, modal, hover and focus.
- [ ] Decompose the remaining Notes files above 300 lines listed in [11-structural-debt.md](11-structural-debt.md), including `src/controllers/notes/notes_controller.cpp`, keeping each new QML/C++/Rust/bridge file focused and rechecking module imports, signals, Core contracts and behavior. `NotesSetupWidgetsModal.qml` is currently 265 lines and is below the target.
- [ ] Compare keyboard-only and screen-reader paths, accessible names, roles, state, order and selected-item announcements.
- [ ] Compare English and Portuguese labels, errors, empty states and shortcut help.
- [ ] Update `NotesHelpDialog.qml` so all descriptions match active controls and do not mention removed source/preview modes.
- [ ] Update [native-desktop-parity.md](../../../docs/native-desktop-parity.md), [modules/notes.md](../../../docs/modules/notes.md), and documentation ownership whenever status changes.

## K. Final acceptance

- [ ] Complete the focused build, Core tests, Qt Notes tests, QML lint and `git diff --check` commands from [07-verification.md](07-verification.md).
- [ ] Complete side-by-side screenshots for page view, normal editing, every block/widget family, table, image, dialogs, locked page, empty state and error state.
- [ ] Complete source-level second-pass review for every bug fix and acceptance item.
- [ ] Record exact command results, platform/tool versions, and remaining limitations.
- [ ] Mark parity `Complete` only when all required acceptance evidence exists and no unresolved high-severity issue remains.
