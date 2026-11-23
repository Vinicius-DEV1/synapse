---
name: desktop-qt-parity
description: Canonical engineering workflow, visual/functional parity standards, hybrid WYSIWYG block-editor architecture, and Core SSOT delegation rules for bringing Desktop Qt (apps/desktop-qt/) to 100% parity with React Web (apps/web-react/).
---

# Desktop Qt Parity (`apps/desktop-qt/` vs `apps/web-react/`)

Use this skill whenever auditing, implementing, refactoring, or verifying feature, visual, widget, or architectural parity between the React Web reference client (`apps/web-react/`) and the Native Desktop Qt 6 / QML / C++ client (`apps/desktop-qt/`).

---

## 1. Golden Rules of React-to-Qt Parity

1. **`apps/web-react/` is the Immutable Reference Target**:
   - **NEVER** modify, downgrade, or simplify `apps/web-react/` to match `apps/desktop-qt/`.
   - Always adapt `apps/desktop-qt/` (QML views, thin C++ controllers, and `bridges/bridge-qt/` bindings to `core/synapse-core/`) to match the visual design, layout, workflows, keyboard shortcuts, and interactive capabilities of `apps/web-react/`.
2. **100% Native, Lightweight, GPU-Accelerated Execution**:
   - Do not embed a heavy Chromium WebEngineView for the application shell or notes editor. Keep `desktop-qt` 100% native Qt 6 Quick / QML + C++17 + Rust `synapse-core` + `libmpv` (`MpvPlayerItem`).
3. **Zero Cross-Client Domain Duplication (Rust Core SSOT)**:
   - All domain models, business calculations (financial summaries, FSRS spaced repetition, habit streaks, quiz scoring, text/block diffing, quiz markdown parsing, diagram schema normalization, vault security health scoring), and SQLite queries MUST reside in `core/synapse-core/` and be exposed via `bridges/bridge-qt/`.
   - C++ controllers in `apps/desktop-qt/src/controllers/` and QML/JS files in `apps/desktop-qt/qml/` MUST NOT construct raw SQL queries or duplicate domain algorithms.
4. **Anti-Monolith File Limit (< 300 Lines)**:
   - Every QML component, C++ controller file, and Rust module file must remain focused, atomic, and strictly under **250–300 lines**.
5. **No Extraneous "Invented" Chrome in Qt**:
   - Do not add permanent KPI headers, top formatting toolbars, extra sidebar search boxes, numerical module count badges, or unrequested help buttons in Qt where React Web intentionally uses a cleaner, minimalist layout (such as hover-revealed headers, floating `BubbleMenu` toolbars, or sidebar-driven sub-tabs).

---

## 2. Caderno (`notes`) Unified WYSIWYG Block & Widget Architecture

In `apps/web-react/`, Caderno (`Editor.tsx`) is a single unified WYSIWYG canvas where rich text blocks and 20+ interactive NodeView widgets coexist seamlessly. To achieve 100% parity in `apps/desktop-qt/qml/notes/`:

1. **Eliminate the 3-Mode Fallback Trap (`Rich` / `Source` / `Preview`)**:
   - Opening a note containing custom widgets (`question-block`, `habit-widget`, `focus-widget`, `alarm-widget`, `calendar-event-widget`, `file-widget`, `document-bundle`, `media-widget`, `scrap-widget`, `link-preview`, `linkGroup`, `toggle-block`, `blockquote-toggle`, `columnGroup`, `collectionBlock`, `codeBlock`, `colorBlockquote`, `resizableImage`, `encryptedImage`, `pageReference`, `customDivider`) MUST NOT disable visual editing or kick the user into a read-only preview (`NotesPreviewSurface.qml`) or raw HTML editor (`NotesSourceEditorSurface.qml`).
2. **Block-Document Composition Model**:
   - Parse the note's HTML/AST into a live sequence of **Document Blocks** rendered in a unified vertical Flickable/ListView (or hybrid block-container canvas):
     - **Rich Text Blocks** (`p`, `h1-h3`, `ul`, `ol`, `todo`, `blockquote`): Rendered via lightweight interactive `TextArea`/`QQuickTextDocument` delegates with seamless arrow-key, Backspace/Enter, and selection transitions across blocks.
     - **Interactive Widget Blocks**: Instantiate the actual interactive QML widget components (`QuestionBlock.qml`, `HabitWidget.qml`, `FocusWidget.qml`, `AlarmWidget.qml`, `CalendarEventWidget.qml`, `FileAttachmentWidget.qml`, `DocumentBundleWidget.qml`, `NotesToggleBlock.qml`, `NotesColumnLayout.qml`, `CodeBlock.qml`, `ColorBlockquote.qml`, `LinkPreviewCard.qml`, `ScrapWidget.qml`, `CollectionBlock.qml`, `MediaWidget.qml`) directly inline inside the live editor canvas, bound to real `dataController` / `synapse-core` persistence (zero hardcoded demo strings).
3. **Contextual Floating Chrome (Zero Persistent Top Toolbar)**:
   - Remove the persistent top `NotesEditorFormattingToolbar.qml`.
   - Use **Floating Bubble Menus**:
     - `FloatingToolbar`: Appears above text selections with Bold, Italic, Underline, Strike, Inline Code, Spoiler, Color & Highlight Palette (10 text colors + 10 highlight swatches), Page Reference (`[[`), and AI Assistant (`Sparkles`).
     - `TableToolbar` & `TableExcelGrips`: Appears on tables with Excel column headers (`A`, `B`, `C`...), row handles (`1`, `2`, `3`...), typed columns (`text`, `number`, `date`, `select`, `checkbox`), cell overlays, column filtering, and interactive column width resizing.
     - `BlockHandle` (`⋮⋮`): Appears in the left gutter on block hover with click menu (Move Up, Move Down, Add Line Below, Color submenu, Delete) and drag-to-reorder / drag-into-columns (`ColumnGroup`).
4. **All 31 Slash Commands & 12 Modals**:
   - Every item in `NotesRichSlashCommandMenu.qml` must either insert the live block directly or open its dedicated setup/selection modal (`FocusSetupModal`, `AlarmSetupModal`, `CalendarEventModal`, `HabitSelectModal`, `FileUploadModal` / `FileSelectModal`, `DocumentBundleModal`, `MediaSelectModal`, `QuestionCreateModal`, `ScrapInputModal`, `AiPromptModal`).

---

## 3. App Shell, Multi-Tab Isolation & Design System Parity

1. **Per-Tab Isolated State (`AuthenticatedApplication.qml` & `AppTopTabBar.qml`)**:
   - Each tab entry in `tabsList` must preserve `{ id, module, title, pageId, bookId, bookTitle, moduleState, isPinned, scrollY }`.
   - Opening multiple Notes tabs or switching between tabs must preserve each tab's active `pageId`, reader `bookId`, sub-tab `moduleState`, and scroll position.
   - Notes tabs display the active page's emoji icon (`📄`, `🚀`, etc.). Tabs support drag-and-drop reordering and middle-click close.
2. **Sidebar & Context Menus (`AppSidebar.qml`)**:
   - Module list order and clean styling (no numerical count badges) must match `apps/web-react/src/config/modules.config.ts`.
   - Sidebar sub-sections (Finance 4 sections, Settings 10 tabs, Vault categories, Habits sub-views, Notes page tree) drive the active tab's `pageId`/`moduleState`.
   - Notes sidebar items support clicking the page emoji to open `AppEmojiPopover`, double-clicking to open `RenamePageModal`, hover `[+]` and `[•••]` buttons, pagination (`+10`), and full right-click context menu (`Abrir em nova aba`, `Criar subpágina`, `Importar subpágina`, `Exportar página`, `Compartilhar página`, `Fixar/Desafixar`, `Renomear`, `Mover para...`, `Mover para lixeira`).
3. **Design System Tokens (`Theme.qml` & `AppIcon.qml`)**:
   - Strictly match `.agents/skills/design-system/SKILL.md`: `#0f0e17` canvas (`bgDarkBg`), `#161524` surface (`bgDarkCard`), `#1e1c30` elevated (`bgElevated`), `#8b5cf6` brand violet (`brand500`), `#fffffe` primary text, `#a7a9be` secondary subtext, `#14ffffff` whisper-thin borders, and 1:1 Lucide vector paths in `AppIcon.qml` (`strokeWidth: 2`, round caps/joins).

---

## 4. Verification Protocol

Before marking any parity task complete, execute:
1. **Build & C++ / Rust FFI Verification**:
   ```bash
   cmake --build apps/desktop-qt/build --parallel
   ```
2. **Qt Automated Test Suite**:
   ```bash
   ctest --test-dir apps/desktop-qt/build --output-on-failure
   ```
3. **QML Static Analysis**:
   - Run `qmllint` on all modified `.qml` files and verify zero runtime QML/JS console warnings (`ReferenceError`, binding loops, or unconnected signals).
4. **Side-by-Side Visual & Interactive Verification**:
   - Compare every modified view side-by-side against `apps/web-react/` for layout spacing, typography, hover interactions, modal transitions, and data persistence in SQLite.
