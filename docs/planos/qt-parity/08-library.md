# 08 — Library

> **Status**: ✅ Complete | **Complexity**: 🟡 Medium | **Priority**: P2
>
> Native PDF/EPUB import and reader with Poppler page rendering, rich text EPUB viewer, typography and reading theme customizer, interactive dictionary modal with definitions and flashcard creation, AI metadata enrichment modal, annotations system with bookmarks and highlights, full-text worker search across chapters/pages, reading statistics dialog, collections manager, multi-select bulk actions, filter bar with status/format/author/sort, and categorized in-app guide are all fully implemented and verified in Qt.

---

## React Reference
- **Components**: `apps/web-react/src/components/library/` (54 files)
- **EPUB subsystem**: `library/epub/` (18 files)
- **PDF subsystem**: `library/pdf/` (18 files)
- **Dictionary**: `library/dictionary/` (3 files)
- **Hooks**: `hooks/useLibraryData.ts`, `hooks/useLibraryFilter.ts`

## Qt Existing
- **QML**: `LibraryView.qml`, `LibraryHeaderBar.qml`, `LibraryBookGrid.qml`, `LibraryBookCard.qml`, `LibraryReaderView.qml`, `LibraryReaderToolbar.qml`, `LibraryReaderAnnotations.qml`, `LibraryReaderBookmarkList.qml`, `LibraryReaderHighlightList.qml`, `LibraryReaderTocList.qml`, `LibraryReaderSearchDialog.qml`, `LibraryReaderSearchHost.qml`, `LibraryReadingStatsDialog.qml`, `LibraryTypographyModal.qml`, `LibraryDictionaryModal.qml`, `LibraryAiEnrichModal.qml`, `LibraryReaderHighlightMenu.qml`, `LibraryActiveFiltersBar.qml`, `LibraryAuthorDropdown.qml`, `LibrarySortDropdown.qml`, `LibraryBulkActionsBar.qml`, `LibraryBulkSelection.qml`, `LibraryCollectionDialog.qml`, `LibraryCollectionGrid.qml`, `BookDetailsModal.qml`, `LibraryBookEditDialog.qml`, `LibraryHelpDialog.qml`
- **Native C++**: `native_book_reader.cpp/.h`, `native_book_cover.cpp`, `native_book_metadata.cpp`, `native_book_search.cpp/.h`
- **Controller**: `library_controller.cpp`, `library_reader_controller.cpp`

---

## Feature Parity Table

| Feature | React File | Qt Status |
|---------|-----------|-----------|
| Library grid view | `LibraryGrid.tsx` | ✅ Done (`LibraryBookGrid.qml`) |
| Book cards with covers | — | ✅ Done (`LibraryBookCard.qml`) |
| EPUB reader | `epub/EpubReader.tsx` | ✅ Done (native RichText viewer) |
| Reader top bar | `epub/EpubTopBar.tsx` | ✅ Done (`LibraryReaderToolbar.qml`) |
| Reader bottom bar | `epub/components/EpubBottomBar.tsx` | ✅ Done |
| Reader sidebar (TOC) | `epub/EpubSidebars.tsx` | ✅ Done (`LibraryReaderTocList.qml`) |
| Reader keyboard shortcuts | `epub/hooks/useEpubShortcuts.ts` | ✅ Done |
| Book upload modal | — | ✅ Done (`CreateBookModal.qml` + native import) |
| Book search | — | ✅ Done (native thread search) |
| Help dialog | `modals/LibraryHelpModal.tsx` | ✅ Done (`LibraryHelpDialog.qml`) |
| **PDF reader** | `pdf/PdfReader.tsx` | ✅ Done (native Poppler page rendering) |
| **PDF toolbar** | `pdf/PdfToolbar.tsx` | ✅ Done (`LibraryReaderToolbar.qml`) |
| **PDF page rendering** | `pdf/PdfPage.tsx` | ✅ Done (Poppler native rendering) |
| **PDF text layer** | `pdf/components/PdfPageTextLayer.tsx` | ✅ Done (`pdfPageText`) |
| **PDF highlight layer** | `pdf/components/PdfPageHighlightLayer.tsx` | ✅ Done (`LibraryReaderHighlightList.qml`) |
| **PDF highlight toolbar** | `pdf/components/HighlightToolbar.tsx` | ✅ Done (`LibraryReaderHighlightMenu.qml`) |
| **PDF annotation panel** | `pdf/components/AnnotationPanel.tsx` | ✅ Done (`LibraryReaderAnnotations.qml`) |
| **PDF search bar** | `pdf/components/PdfSearchBar.tsx` | ✅ Done (`LibraryReaderSearchDialog.qml`) |
| **Dictionary modal** | `modals/DictionaryModal.tsx` | ✅ Done (`LibraryDictionaryModal.qml`) |
| **EPUB highlight menu** | `epub/EpubHighlightMenu.tsx` | ✅ Done (`LibraryReaderHighlightMenu.qml`) |
| **EPUB typography settings** | `epub/EpubTypography.tsx` | ✅ Done (`LibraryTypographyModal.qml`) |
| **Book edit modal** | `modals/BookEditModal.tsx` | ✅ Done (`LibraryBookEditDialog.qml`) |
| **Book info modal** | `modals/BookInfoModal.tsx` | ✅ Done (`BookDetailsModal.qml`) |
| **Reading stats modal** | `modals/ReadingStatsModal.tsx` | ✅ Done (`LibraryReadingStatsDialog.qml`) |
| **Create collection modal** | `modals/LibraryCreateCollectionModal.tsx` | ✅ Done (`LibraryCollectionDialog.qml`) |
| **AI metadata enrichment** | `modals/BookMetadataAIModal.tsx` | ✅ Done (`LibraryAiEnrichModal.qml`) |
| **Annotations tab** | `ui/AnnotationsTab.tsx` | ✅ Done (`LibraryReaderAnnotations.qml`) |
| **Bookmarks tab** | `ui/BookmarksTab.tsx` | ✅ Done (`LibraryReaderBookmarkList.qml`) |
| **TOC tab** | `ui/TocTab.tsx` | ✅ Done (`LibraryReaderTocList.qml`) |
| **Library active filters** | `ui/LibraryActiveFilters.tsx` | ✅ Done (`LibraryActiveFiltersBar.qml`) |
| **Author dropdown filter** | `ui/LibraryAuthorDropdown.tsx` | ✅ Done (`LibraryAuthorDropdown.qml`) |
| **Sort dropdown** | `ui/LibrarySortDropdown.tsx` | ✅ Done (`LibrarySortDropdown.qml`) |
| **Collection cards** | `ui/LibraryCollectionCard.tsx` | ✅ Done (`LibraryCollectionGrid.qml`) |
| **Bulk actions bar** | `ui/LibraryBulkActionsBar.tsx` | ✅ Done (`LibraryBulkActionsBar.qml`) |
| **Reader host** | `LibraryReaderHost.tsx` | ✅ Done (`LibraryReaderView.qml`) |

---

## Implementation Specs

### PDF Reader (Core)
- **React**: `pdf/PdfReader.tsx`, `pdf/PdfPage.tsx`, `pdf/PdfToolbar.tsx`, `pdf/components/PdfPageCanvas.tsx`, `pdf/components/PdfPageTextLayer.tsx`
- **Create**: `qml/library/pdf/PdfReaderView.qml`, `qml/library/pdf/PdfPage.qml`, `qml/library/pdf/PdfToolbar.qml`
- **Approach**: Use Poppler-Qt6 library for PDF rendering (native, no JS required). Render each page as `Image` from `QImage`. Text layer via `Poppler::Page::text()`.
- **Controller**: `src/controllers/library/pdf_reader_controller.cpp` — `Q_INVOKABLE int pageCount()`, `Q_INVOKABLE QImage renderPage(int page, double zoom)`, `Q_INVOKABLE QString pageText(int page)`
- **Advantage**: Qt PDF rendering via Poppler is **faster** than PDF.js in WebView.
- **Acceptance**: PDF opens, pages render at correct zoom, text is selectable, scrolling between pages is smooth.

### PDF Highlights & Annotations
- **Create**: `qml/library/pdf/PdfHighlightLayer.qml`, `qml/library/pdf/PdfHighlightToolbar.qml`, `qml/library/pdf/PdfAnnotationPanel.qml`
- **Behavior**: Text selection creates highlight with color choice. Highlights persist across sessions. Annotation panel shows all highlights with notes. Highlight inspector shows note tooltip on hover.
- **Controller**: `Q_INVOKABLE void addHighlight(int page, const QRectF &rect, const QString &color, const QString &note)`, `Q_INVOKABLE QVariantList getHighlights(const QString &bookId)`
- **Acceptance**: Select text → highlight appears, color picker shown, annotation panel lists all highlights, notes can be added/edited.

### PDF Search
- **Create**: `qml/library/pdf/PdfSearchBar.qml`
- **Behavior**: Ctrl+F opens search bar. Search across all pages. Navigate results with up/down arrows. Current result highlighted, others dimmed.
- **Controller**: `Q_INVOKABLE QVariantList searchPdf(const QString &query)` — returns list of `{page, rect}`
- **Acceptance**: Search finds text across pages, navigation jumps to correct page and scrolls to result.

### EPUB Highlights & Bookmarks
- **Create**: `qml/library/epub/EpubHighlightMenu.qml`, `qml/library/epub/EpubHighlightColorBar.qml`, `qml/library/epub/EpubHighlightNoteEditor.qml`, `qml/library/epub/EpubBookmarkRibbon.qml`
- **Behavior**: Text selection in EPUB shows context menu with highlight option. Color choice (yellow, green, blue, pink, purple). Bookmark ribbon on current page. Bookmarks list in sidebar.
- **Controller**: Extend library controller with highlight/bookmark CRUD via bridge-qt
- **Acceptance**: Select text → highlight menu appears, colors work, bookmarks toggle, sidebar shows lists.

### EPUB Typography Settings
- **Create**: `qml/library/epub/EpubTypographySettings.qml`
- **Behavior**: Panel to adjust font family, font size, line height, margins, theme (light/dark/sepia). Changes apply in real-time to the reader.
- **Acceptance**: All typography settings work, changes are immediate, preferences persist.

### Dictionary
- **Create**: `qml/library/DictionaryModal.qml`, `qml/library/DictionaryContent.qml`
- **Behavior**: Select word in reader → look up definition. Shows word, pronunciation, part of speech, definitions, examples. Can save to vocabulary list.
- **Controller**: Offline dictionary lookup or online API call. `Q_INVOKABLE QVariantMap lookupWord(const QString &word, const QString &language)`
- **Acceptance**: Word selection opens dictionary, definition shown, save to vocabulary works.

### Book Edit/Info Modals
- **Create**: `qml/library/BookEditModal.qml`, `qml/library/BookInfoModal.qml`
- **Behavior**: Edit: change title, author, cover, tags, description, reading status. Info: show metadata (pages, format, size, added date), reading progress, time spent reading.
- **Acceptance**: Edit saves changes, info shows accurate metadata.

### Reading Stats Modal
- **Create**: `qml/library/ReadingStatsModal.qml`, `qml/library/ReadingSummaryCard.qml`
- **Behavior**: Statistics about reading: books read this month/year, pages read, time spent, reading streak, completion rate, genre distribution.
- **Acceptance**: Stats are accurate, based on actual reading tracking data.

### Collections
- **Create**: `qml/library/LibraryCreateCollectionModal.qml`, `qml/library/LibraryCollectionCard.qml`
- **Behavior**: Group books into user-defined collections (e.g., "CS Books", "Fiction", "Currently Reading"). Collection card shows cover mosaic and book count.
- **Acceptance**: Create collection, add/remove books, collection card displays correctly.

### Library Filters & Sorting
- **Create**: `qml/library/LibraryActiveFilters.qml`, `qml/library/LibraryAuthorDropdown.qml`, `qml/library/LibrarySortDropdown.qml`, `qml/library/LibraryBulkActionsBar.qml`
- **Behavior**: Filter by: author, status (reading, completed, to-read), format (EPUB, PDF), collection. Sort by: title, author, date added, last read, progress. Bulk actions: delete, move to collection, change status.
- **Acceptance**: Filters and sorting work, bulk selection with shift/ctrl, actions apply to selected books.

---

## Dependencies
- Poppler-Qt6 library for PDF rendering
- Offline dictionary data or dictionary API
- Bridge functions for highlights, bookmarks, collections, reading stats

## Estimated New Files
- ~25 new QML files (PDF reader alone is ~10)
- ~2 new controller files (pdf_reader_controller, dictionary_controller)
- ~3 test files
