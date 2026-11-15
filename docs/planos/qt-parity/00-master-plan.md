# Qt Desktop Parity — Master Plan

> **Goal**: Bring `apps/desktop-qt/` to full feature parity with `apps/web-react/src/`, preserving every user-facing feature, every interaction, and every visual detail — without losing anything.

---

## Architecture Recap

```
apps/web-react/       → React 19 + Tauri v2 (reference implementation, ~195k lines)
apps/desktop-qt/      → Qt 6 / QML / C++17 / Rust FFI (~62k lines, partial parity)
apps/mobile-android/  → Kotlin / Jetpack Compose / UniFFI (separate target)
core/synapse-core/    → Rust SSOT: domain entities, business logic, SQLite, migrations
bridges/bridge-qt/    → Rust FFI exposing typed domain APIs to C++ (synapse_<module>_*)
bridges/bridge-uniffi/→ UniFFI bindings for Android
```

---

## Mandatory Rules For The Agent

> [!CAUTION]
> These rules are NON-NEGOTIABLE. Violating them means the work must be redone.

### Architecture Rules
1. **Controllers are THIN orchestrators** — `Q_PROPERTY`, `Q_INVOKABLE`, `emit signals`. They MUST NOT:
   - Assemble raw SQL strings
   - Calculate business metrics (balances, streaks, scores, FSRS scheduling)
   - Implement domain logic that belongs in `synapse-core`
2. **All domain logic** goes through `bridges/bridge-qt/` → `core/synapse-core/`
3. **QML views** handle ONLY presentation — no database calls, no business calculations
4. **Theme.qml** centralizes all design tokens (colors, spacing, typography). Use `Theme.*` properties.
5. **Same canonical module IDs** — React `components/finance/` → Qt `qml/finance/` + `src/controllers/finance/`

### File Organization
6. **QML views**: `apps/desktop-qt/qml/<module>/<ComponentName>.qml`
7. **C++ controllers**: `apps/desktop-qt/src/controllers/<module>/<name>_controller.cpp`
8. **Tests**: `apps/desktop-qt/tests/<module>/`
9. **Update CMakeLists.txt** whenever files are added or removed
10. **Max ~300 lines per file** — decompose into sub-components

### Quality Gates
11. **Build must pass**: `cmake --build apps/desktop-qt/build --target synapse-desktop -j$(nproc)`
12. **Tests must pass**: `ctest --test-dir apps/desktop-qt/build -R '^native-' --output-on-failure`
13. **QML lint must pass**: `qmllint` on all new/modified QML files
14. **No raw `window.confirm` equivalents** — use styled dialogs
15. **All comments in English**

### Parity Rules
16. **Read the React source file FIRST** before implementing its Qt equivalent
17. **Every user-visible feature** must have a Qt counterpart — empty states, loading states, error states, keyboard shortcuts, context menus
18. **Do NOT simplify or strip features** — if React has it, Qt must have it
19. **Update `docs/native-desktop-parity.md`** when closing a gap
20. **Update `docs/security/native-encryption-audit.md`** when vault/crypto changes

---

## Module Status Overview

| # | Module | Status | Missing Features | Complexity | Priority | Plan File |
|---|--------|--------|-----------------|------------|----------|-----------|
| 1 | **Notes & Editor** | ✅ Complete | None — 100% parity | 🔴 Critical | P0 | [01-notes-editor.md](./01-notes-editor.md) |
| 2 | **Anki (Flashcards)** | ✅ Complete | None — 100% parity | 🟠 High | P1 | [02-anki.md](./02-anki.md) |
| 3 | **Questions (Quiz)** | ✅ Complete | None — 100% parity | 🟠 High | P1 | [03-questions.md](./03-questions.md) |
| 4 | **Finance** | ✅ Complete | None — 100% parity | 🟡 Medium | P2 | [04-finance.md](./04-finance.md) |
| 5 | **Habits** | ✅ Complete | None — 100% parity | 🟡 Medium | P2 | [05-habits.md](./05-habits.md) |
| 6 | **Calendar** | ✅ Complete | None — 100% parity | 🟡 Medium | P2 | [06-calendar.md](./06-calendar.md) |
| 7 | **Video** | ✅ Complete | None — 100% parity | 🟡 Medium | P2 | [07-video.md](./07-video.md) |
| 8 | **Library** | ✅ Complete | None — 100% parity | 🟡 Medium | P2 | [08-library.md](./08-library.md) |
| 9 | **Files** | ✅ Complete | None — 100% parity | 🟡 Medium | P2 | [09-files.md](./09-files.md) |
| 10 | **Vault** | ✅ Complete | None — 100% parity | 🟠 High | P1 | [10-vault.md](./10-vault.md) |
| 11 | **Focus** | ✅ Complete | None — 100% parity | 🟡 Medium | P3 | [11-focus.md](./11-focus.md) |
| 12 | **Diagrams** | ✅ Complete | None — 100% parity | 🟠 High | P3 | [12-diagrams.md](./12-diagrams.md) |
| 13 | **Culture** | ✅ Complete | None — 100% parity | 🟠 High | P2 | [13-culture.md](./13-culture.md) |
| 14 | **Home** | ✅ Complete | None — 100% parity | 🟢 Low | P3 | [14-17-home-settings-trash-notifications.md](./14-17-home-settings-trash-notifications.md) |
| 15 | **Settings** | ✅ Complete | None — 100% parity | 🟡 Medium | P2 | ↑ same file ↑ |
| 16 | **Trash** | ✅ Complete | None — 100% parity | 🟢 Low | P3 | ↑ same file ↑ |
| 17 | **Notifications** | ✅ Complete | None — 100% parity | 🟢 Low | P3 | ↑ same file ↑ |
| 18 | **Layout & Shell** | ✅ Complete | None — 100% parity | 🟠 High | P1 | [18-layout-shell.md](./18-layout-shell.md) |
| 19 | **Workspace & Auth** | ✅ Complete | None — 100% parity | 🟡 Medium | P3 | [19-workspace-auth.md](./19-workspace-auth.md) |
| 20 | **Practice** | ✅ Complete | None — 100% parity | 🟠 High | P3 | [20-21-practice-ai-sidebar.md](./20-21-practice-ai-sidebar.md) |
| 21 | **AI Sidebar** | ✅ Complete | None — 100% parity | 🟡 Medium | P3 | ↑ same file ↑ |

---

## Recommended Execution Order

### Phase 1 — Core Structure & Shell (P0-P1)
Complete the app shell first so all modules have a stable home:
1. **Layout & Shell** — sidebar, tabs, global navigation
2. **Vault** — encryption must work before any data-sensitive module
3. **Notes & Editor** — the biggest module; start with missing editor extensions

### Phase 2 — Study Core (P1)
The primary study features:
4. **Anki** — flashcards with all card types and study session
5. **Questions** — quiz system with focus mode
6. **Practice** — aggregates anki + quiz

### Phase 3 — Data Modules (P2)
Feature modules with CRUD + visualization:
7. **Finance** — transactions, charts, export
8. **Habits** — streaks, heatmap
9. **Calendar** — events, agenda
10. **Culture** — media tracking, recommendations
11. **Video** — gallery, upload, YouTube
12. **Library** — books, PDF viewer
13. **Files** — file browser
14. **Settings** — app preferences

### Phase 4 — Polish & Extras (P3)
15. **Home** — dashboard refinement
16. **Focus** — timer, audio
17. **Diagrams** — whiteboard
18. **Trash** — recycling
19. **Notifications** — notification center
20. **Workspace & Auth** — multi-workspace
21. **AI Sidebar** — chat interface

---

## Build & Verification Commands

```bash
# Build the desktop app
cmake --build apps/desktop-qt/build --target synapse-desktop -j$(nproc)

# Run all native tests
ctest --test-dir apps/desktop-qt/build -R '^native-' --output-on-failure --parallel 2

# QML lint a specific module
find apps/desktop-qt/qml/<module>/ -name "*.qml" -exec qmllint {} +

# Type-check the Rust core and bridges
cd core/synapse-core && cargo check
cd bridges/bridge-qt && cargo check

# Verify the React reference (to understand what to build)
cd apps/web-react && npm run typecheck
```

---

## How To Use This Plan

1. **Pick a module file** (e.g., `02-anki.md`)
2. **Read the React reference files** listed in the plan
3. **Implement the missing features** following the spec in the plan
4. **Verify**: build passes, tests pass, qmllint passes
5. **Update** `docs/native-desktop-parity.md` with the completed work
6. **Move to the next module**

Each module file is self-contained — the agent can work on one module at a time without needing context from other files.
