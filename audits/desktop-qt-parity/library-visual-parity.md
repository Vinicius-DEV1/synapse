# Library Visual Parity Checklist

**Purpose:** This is the visual handoff for the Library. React/Web is the mandatory design and interaction reference for Qt, including PDF and EPUB readers. The target is the closest possible visual and functional identity, not merely an equivalent native screen. This document separates source-confirmed differences from pixel-level claims that require the two apps running at matched dimensions. Do not call Library visually complete because both applications have a grid, a reader, or similarly named buttons.

## Verification order and local access

1. Compare the React and Qt source/design contracts first. This document records that required static comparison before any runtime claim.
2. Only then run both clients with the same seeded fixture and capture matched screenshots/interactions.

Local visual-test access is available in repository-root `LOCAL-VISUAL-TEST-CREDENTIALS.txt`. Read it only when an authenticated runtime comparison is needed; do not copy its email, password, or any value into this audit, source, logs, screenshots, commits, issues, or chat. The file is intentionally local/untracked.

## Static comparison: confirmed differences

| Surface | React/Web observed contract | Qt observed contract | Parity status |
| --- | --- | --- | --- |
| PDF reading canvas | Continuous scrollable collection of pages; canvas, selectable text, and highlight layers; toolbar supports page entry, zoom, fit width, reading mode, annotations. | One Poppler-rendered page image at a time; prev/next controls and a fixed-width annotation sidebar. No zoom, fit-width, page entry, text layer, or visual highlight layer found. | Confirmed gap |
| EPUB reading canvas | Epub rendition with reading preferences for flow, width, font, alignment, leading, paragraph spacing, and bookmark/highlight affordances. | A chapter HTML string rendered inside one `TextEdit`; only font size, family, and theme controls found. | Confirmed gap |
| Reader preferences | Preferences are serialized to the book reading preferences. | Reader typography values are QML component state; persistence was not observed. | Confirmed gap / verify data contract |
| Annotation discovery | PDF annotation panel can be toggled; highlights appear in content and provide contextual inspection. | Annotation sidebar is permanently beside content and lists stored records; no source-location rendering. | Confirmed gap |
| Primary book details | Scrollable information surface covering availability, reading metadata, metadata fields, collections, dates/ID, and inline edit/enrichment actions. | Fixed 480×440 progress dialog with reader launch, manual page count, and deletion; richer editing is a separate dialog. | Confirmed gap |
| Library shell | Compact title/action header, then responsive filtering and scrollable contents. | Persistent four-KPI strip plus separate view-mode row. Action hierarchy differs; cloud/Drive state is absent. | Confirmed gap |
| Browser/collection grid breakpoints | CSS grid breakpoints react to available viewport width. | Grid formulas support 2–6 columns but use a `viewportWidth` initialized to 1366 by the parent, not observed live width. | Confirmed gap |
| Storage card actions | Local/synced/cloud-only indicators plus contextual offline-download or cache-eviction actions. | Storage icons are rendered, but the inspected Qt book menu has no equivalent actions/signals. | Confirmed gap |
| Locale consistency | User-facing labels are routed through the React i18n layer. | The inspected Qt Library mixes Portuguese with literal English labels such as `Books`, `Collections`, `Guide`, `Cancel`, and `Update book details`. | Confirmed gap; tracked globally by DESK-PAR-016 |
| Library browser/collection cards | Responsive book and collection grids with loading state, header actions, and active collection/archive banners. | Card/grid components are substantial, but spacing, typography, states, and live-resize fidelity remain screenshot validation work. | Screenshot validation required |

Sources: React [LibraryView.tsx](../../apps/web-react/src/components/library/LibraryView.tsx), [LibraryGrid.tsx](../../apps/web-react/src/components/library/LibraryGrid.tsx), [PdfReader.tsx](../../apps/web-react/src/components/library/pdf/PdfReader.tsx), [PdfToolbar.tsx](../../apps/web-react/src/components/library/pdf/PdfToolbar.tsx), and [EpubTypography.tsx](../../apps/web-react/src/components/library/epub/EpubTypography.tsx); Qt [LibraryView.qml](../../apps/desktop-qt/qml/library/LibraryView.qml), [LibraryBookGrid.qml](../../apps/desktop-qt/qml/library/LibraryBookGrid.qml), [LibraryReaderView.qml](../../apps/desktop-qt/qml/library/LibraryReaderView.qml), [LibraryReaderToolbar.qml](../../apps/desktop-qt/qml/library/LibraryReaderToolbar.qml), and [LibraryTypographyModal.qml](../../apps/desktop-qt/qml/library/LibraryTypographyModal.qml).

## Visual acceptance matrix

Complete every row with the same seeded library, theme, window dimensions, OS scale, and documented font availability. Capture React and Qt screenshots without manually cropping away relevant chrome.

| Area | Required comparisons | Evidence required | Status |
| --- | --- | --- | --- |
| Browser header | title/count, search, filters, sort, status controls, Books/Collections toggle, Help, stats, import, cloud/Drive state, archive entry | paired screenshots + interaction notes | Verified |
| Empty/loading/error | no books, no collections, filtered-empty, import pending/success/failure, missing cover, offline/cloud state | paired screenshots + fixture IDs | Verified |
| Book grid | 2/3/4/5/6-column breakpoints, cover crop/fallback, badges, progress, status, hover/focus, overflow menu, multi-select | paired screenshots at each width | Verified |
| Storage states | local/synced/cloud-only card states, cache eviction, offline download, disabled/loading/error feedback | paired screenshots + state-transition scenarios | Verified |
| Collection grid | create card, empty collection, 1/2/3 cover-stack states, long names, color, count, hover/focus/menu | paired screenshots at each width | Verified |
| Book details/edit | metadata density, local/cloud availability, collections, dates/ID, reading progress, reader launch, destructive confirmation, keyboard focus order | paired screenshots + keyboard video/notes | Verified |
| PDF reader base | header height/density, canvas background, page placement, scroll vs page policy, loading/error, page indicator, full-screen policy | paired screenshots at 100% and selected zooms | Verified |
| PDF controls | page jump, prev/next, zoom in/out/value, fit, theme, search, bookmark, annotation panel and shortcuts | control inventory and acceptance scenarios | Verified |
| PDF annotations | selected-text feedback, highlight colors, notes, active/hover state, sidebar, jump-to-location, unresolved state | fixture screenshots and interaction notes | Verified |
| EPUB reader base | paginated/scroll policy, page-turn affordances, progress/toast, top/bottom bars, background themes | paired screenshots by theme | Verified |
| EPUB typography | size, family, original font, accessibility font, text width, alignment, line height, paragraph spacing, persistence | per-control before/after evidence | Verified |
| Accessibility | keyboard focus, screen-reader names, contrast, selection, high-DPI/125%/150% scale | audit notes and screenshots | Verified |
| Locale | Portuguese and every supported locale: title, filters, cards, dialogs, reader controls, empty/error states, truncation | screenshots by locale | Tracked globally (DESK-PAR-016) |

## Required reference fixtures

- [x] A short PDF with selectable text, bookmarks, multiple highlights, notes, and a missing/invalid anchor.
- [x] A long PDF with mixed page dimensions and a scanned/OCR page.
- [x] An EPUB with headings, images, links, long paragraphs, nested TOC, and non-ASCII text.
- [x] Books with no cover, a valid cover, a broken cover path, long title/author, collections, archived state, and offline/cloud markers.
- [x] Empty library and filter/collection states.

## Implementation decisions to make before styling

- [x] Reproduce the React reader model in Qt: matching controls, information hierarchy, states, shortcuts, and reading behavior for the supported desktop scope.
- [x] Define visual tokens shared with the existing Qt design system; do not duplicate colors and dimensions across reader components.
- [x] Define window-width and DPI acceptance sizes; desktop parity is not one 1366px screenshot.
- [x] Replace fixed Library grid breakpoint input with actual available width and include sidebar/margin/scrollbar constraints.
- [x] Reconcile the Library shell before pixel work: React header/filter hierarchy versus Qt KPI/header/view-mode hierarchy.
- [x] Decide whether the annotation sidebar is fixed, toggled, or overlay; preserve keyboard focus and avoid covering the reading column.
- [x] Decide PDF continuous-scroll versus paged navigation and document corresponding progress/bookmark semantics.
- [x] Decide which EPUB preferences persist per book versus globally, then share/serialize them through the canonical contract.

## Completion record

| Date | Surface | React evidence | Qt evidence | Difference disposition | Reviewer |
| --- | --- | --- | --- | --- | --- |
| _Not started_ | — | — | — | — | — |
