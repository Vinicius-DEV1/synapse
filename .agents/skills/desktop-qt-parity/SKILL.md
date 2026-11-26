---
name: desktop-qt-parity
description: Canonical engineering workflow, visual/functional parity standards, hybrid WYSIWYG block-editor architecture, and Core SSOT delegation rules for bringing Desktop Qt (apps/desktop-qt/) to 100% parity with React Web (apps/web-react/).
---

# Desktop Qt Parity (`apps/desktop-qt/` vs `apps/web-react/`)

Use this skill whenever auditing, implementing, refactoring, or verifying feature, visual, widget, or architectural parity between the React Web reference client (`apps/web-react/`) and the Native Desktop Qt 6 / QML / C++ client (`apps/desktop-qt/`).

---

## 1. Golden Rules of React-to-Qt Parity

1. **`apps/web-react/` is the Immutable Behavior and Visual Reference**:
   - **NEVER** change, downgrade, or simplify React features, layout, styling, animations, or user flows to make Qt parity easier.
   - Make functional and visual parity changes in `apps/desktop-qt/` (QML views, thin C++ controllers, and `bridges/bridge-qt/` bindings to `core/synapse-core/`). A coordination-only React rename or file move is allowed when the user explicitly authorizes naming/organization alignment; it must preserve all web behavior and rendering and update every import/test in the same atomic stage.
2. **100% Native, Lightweight, GPU-Accelerated Execution**:
   - Do not embed a heavy Chromium WebEngineView for the application shell or notes editor. Keep `desktop-qt` 100% native Qt 6 Quick / QML + C++17 + Rust `synapse-core` + `libmpv` (`MpvPlayerItem`).
3. **Zero Cross-Client Domain Duplication (Rust Core SSOT)**:
   - All domain models, business calculations (financial summaries, FSRS spaced repetition, habit streaks, quiz scoring, text/block diffing, quiz markdown parsing, diagram schema normalization, vault security health scoring), and SQLite queries MUST reside in `core/synapse-core/` and be exposed via `bridges/bridge-qt/`.
   - C++ controllers in `apps/desktop-qt/src/controllers/` and QML/JS files in `apps/desktop-qt/qml/` MUST NOT construct raw SQL queries or duplicate domain algorithms.
4. **Anti-Monolith File Limit (< 300 Lines)**:
   - Every QML component, C++ controller file, and Rust module file must remain focused, atomic, and strictly under **250–300 lines**.
5. **Keep Cross-Client Feature Names and Atomic Counterparts Aligned**:
   - Use the same canonical module IDs, feature vocabulary, public action names and typed payload meaning across React/Tauri, Qt and Compose. Pair corresponding files by stable semantic name (for example `TableColumnFilterSection`, `PageHistoryModal`, `FileAttachmentWidget`, and `SlashMenu`) and keep module-local subfolders aligned where the same responsibility exists.
   - Preserve framework-native physical roots: React components/hooks/services/API, Qt `qml/<module>/` plus `src/controllers/<module>/`, and Compose `features/<module>/ui/` with optional ViewModels. Do not create empty mirror directories or wrapper files just to copy another framework's tree. The Android WebView shell reuses React and must not duplicate product modules.
   - Public action names and typed payload fields should match exactly when they expose the same operation. If a framework or language needs a different symbol, document the direct mapping in the cross-client feature map in `docs/architecture/module-structure.md`.
   - Read [`cross-platform-module-parity`](../cross-platform-module-parity/SKILL.md) for shared naming/structure rules; this skill defines the Qt-specific implementation and acceptance workflow.
6. **No Extraneous "Invented" Chrome in Qt**:
   - Do not add permanent KPI headers, top formatting toolbars, extra sidebar search boxes, numerical module count badges, or unrequested help buttons in Qt where React Web intentionally uses a cleaner, minimalist layout (such as hover-revealed headers, floating `BubbleMenu` toolbars, or sidebar-driven sub-tabs).

---

## 2. Caderno (`notes`) React-to-Qt Parity Workflow

React is the behavioral and visual reference. Desktop Qt is the target. Inspect the current worktree before following historical notes: Qt Notes is being reorganized around a native block AST editor, and older source/preview-mode descriptions may no longer match current files. The active Notes comparison is [`audits/desktop-qt-parity/notes/README.md`](../../../audits/desktop-qt-parity/notes/README.md); consolidated architecture belongs in `docs/platforms/` and `docs/modules/`.

1. **Trace the full React behavior first**:
   - Compare `apps/web-react/src/components/Editor.tsx`, `notes/hooks/`, `notes/components/`, `editor-extensions/`, and `page-view/` with the Qt presentation, controller, bridge, and Core call chain.
   - Include creation, edit, cancellation, keyboard behavior, errors, save/restore, undo, nested blocks, and cross-client HTML round-trip. A matching component name is not evidence of parity.
2. **Keep the Qt implementation native**:
   - Use Qt Quick/QML, C++ Qt document adapters and `synapse-core`; do not embed WebEngine for the Notes editor.
   - Keep presentation in QML, lifecycle orchestration in thin controllers, shared Notes rules/persistence in Core, and platform APIs in adapters.
   - Preserve active cursor, selection, focus, undo history, stable block identity and all supported attributes while editing.
3. **Preserve the shared Notes schema**:
   - Canonical parser, serializer, HTML normalization, table behavior, hierarchy, history/diff, link rules and persistence belong in `core/synapse-core/src/domain/notes/`.
   - Current Rust sources are split into `block_ast/`, `html_normalizer/`, and `table_schema/` submodules alongside `diff_engine.rs`, `link_index.rs`, and page/history modules. Do not refer to removed monolithic `block_ast.rs` or `html_normalizer.rs` files as current paths.
   - Keep typed Qt FFI split into cohesive modules under `bridges/bridge-qt/src/domain/notes/`; do not add raw SQL or duplicate shared business logic in C++ or QML.
4. **Compare the full interaction inventory**:
   - Compare all 31 React slash commands, their aliases and nested behavior. Qt-only additions such as Mermaid must remain additive.
   - Compare text marks, headings, lists, callouts, code, tables, images, page references, file/bundle widgets, media, question/focus/alarm/calendar/habit widgets, toggles, collections, columns, link previews/groups, history and all modal states.
   - Inventory every React modal entry point, including nested dialogs and dialogs opened from widgets. Compare viewport-relative dimensions, anchoring, backdrop, sections, scroll behavior, controls, labels, validation, loading/empty/error states, action order, keyboard shortcuts, Escape/outside-click rules, focus entry/restoration and resize behavior. Record missing dialogs as explicit Qt findings; a similar primary screen does not imply modal parity.
   - Resolve differences in the native target. Never reduce React behavior or alter its layout to make parity easier.
5. **Protect content and async lifecycles**:
   - Treat filtered/editor-rendered HTML as a projection until a deliberate edit is committed; never save a display-only subset as canonical page content.
   - Test supplementary Unicode offsets, entities, unknown/legacy attributes, malformed input, multiple tables, nested blocks, failed save, page switch, vault lock, and external modification.
   - Cancel or disconnect timers, media, asynchronous imports and signal handlers when the native editor or widget is replaced.
6. **Keep structure maintainable**:
   - Keep the Qt `page-view/`, `notes/components/table/`, and `editor-extensions/` groupings aligned with React counterparts. Give direct counterparts stable semantic names and match test behavior names where practical. Preserve public QML type names and update `qmldir`/imports with moves.
   - Keep each file atomic and under the repository's <300-line target where practical. Split along presentation, orchestration, and shared-domain boundaries; do not fragment code into trivial wrappers for superficial file-name parity. Document any platform-only adapter or intentional counterpart difference.
7. **Use evidence-based status**:
   - Track each feature as `Partial`, `Missing`, or `Unverified` until its behavior, persistence/error states, accessibility, performance and same-viewport appearance have been checked.
   - Follow the focused verification and second-pass review plan in the active Notes audit under repository-root `audits/`. Do not copy historical passing test counts or mark full parity from source inspection alone.

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
   - Compare every modified view side-by-side against `apps/web-react/` at matching viewport dimensions and scale for layout spacing, typography, hover interactions, all modal states, modal transitions, keyboard/focus flow, and data persistence in SQLite.
