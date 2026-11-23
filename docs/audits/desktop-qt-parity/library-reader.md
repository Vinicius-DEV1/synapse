# Library Reader Parity Checklist

**Status:** Partial native reader. Book opening, PDF-page rendering, EPUB chapter display, searches, bookmarks, and stored annotations have meaningful Qt implementation. This document covers the confirmed gap between persisting a highlight and displaying it in the reading surface.

## Verified current shape

| Capability | Qt observation | React comparison | Status |
| --- | --- | --- | --- |
| PDF page display | Poppler-backed page is rendered to a temporary image and shown by `Image`. | Dedicated canvas, text, and highlight layers exist. | Partial |
| EPUB chapter display | Parsed chapter HTML is assigned to one read-only `TextEdit`. | Dedicated EPUB reader and highlight components exist. | Partial |
| Bookmark/highlight records | Qt loads, edits, deletes, and shows records in its annotation sidebar. | React has annotation APIs and reader UI. | Implemented; revalidate |
| Highlight in source location | No overlay/anchor rendering was found in the Qt PDF image or EPUB text view. | React contains explicit PDF/EPUB highlight rendering. | Confirmed gap |

Relevant evidence: [LibraryReaderView.qml](../../../apps/desktop-qt/qml/library/LibraryReaderView.qml), [library reader controller](../../../apps/desktop-qt/src/controllers/library/library_reader_controller.cpp), and the React [PDF reader](../../../apps/web-react/src/components/library/pdf/PdfReader.tsx) / [EPUB reader](../../../apps/web-react/src/components/library/epub/EpubReader.tsx).

## DESK-PAR-034 implementation checklist

### 1. Contract and migration

- [ ] Inventory the current Core highlight schema and every React/Qt writer/reader.
- [ ] Specify PDF anchor fields: page, normalized selected quote, geometry/text offsets, source fingerprint, and compatibility fallback.
- [ ] Specify EPUB anchor fields: chapter/resource identity, CFI or equivalent stable selector, normalized quote, and fallback selector.
- [ ] Decide the source-update policy: retain with warning, re-anchor, or mark unresolved; never silently attach to unrelated text.
- [ ] Add versioned migration and reversible fixtures for current text-only highlight rows.

### 2. Qt rendering

- [ ] Introduce a PDF text/geometry layer or a proven equivalent above the rendered page image.
- [ ] Draw highlight color and accessible note affordance at recorded geometry; respect page size and zoom changes.
- [ ] Render EPUB highlight spans from anchors without modifying stored chapter HTML.
- [ ] Keep selections, context menu, dictionary, keyboard navigation, theme, and font-size changes working.
- [ ] Render an explicit unresolved-annotation state rather than hiding records.

### 3. Navigation and editing

- [ ] Make sidebar item activation open the correct document, page/chapter, and precise anchor.
- [ ] Scroll/focus the matching highlight and expose note contents accessibly.
- [ ] Maintain correct behavior for edit color/note, delete, delete-all, undo/recovery policy, and concurrent external updates.
- [ ] Ensure temporary decrypted/rendered files are cleaned up on close, error, lock, and navigation.

### 4. Cross-client and acceptance

- [ ] Create shared PDF and EPUB fixtures with basic, multi-line, overlapping, punctuation-normalized, and non-ASCII selections.
- [ ] Verify create in React → view/edit in Qt and create in Qt → view/edit in React.
- [ ] Test page/chapter changes, resize, zoom, font/theme changes, reflow, search, restart, and source-version mismatch.
- [ ] Test malformed/unresolved anchors, deleted books, failure to render a page, and encrypted/locked-book cleanup.
- [ ] Record exact focused test commands, fixture IDs, platform, and manual evidence below before closing the finding.

## Completion record

| Date | Change | Command / scenario | Result | Reviewer |
| --- | --- | --- | --- | --- |
| _Not started_ | — | — | — | — |
