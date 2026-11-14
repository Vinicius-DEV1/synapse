# Unified Core Architecture & Deduplication Plan

**Creation Date:** 2026-11-14  
**Status:** Completed & 100% Verified  
**Primary Goal:** Eliminate cross-platform duplicated code between `apps/desktop-qt` (C++) and `apps/web-react/src-tauri` (Rust) by centralizing domain models, business calculations, and SQLite database persistence into `core/synapse-core/` (Single Source of Truth), exposing typed domain APIs through `bridges/bridge-qt/`.

---

## 1. Executive Summary & Problem Definition

### 1.1. Current State (The Triplication Problem)
Currently, business logic and persistence are duplicated across three independent client implementations:
1. **Desktop Qt (`apps/desktop-qt/src/controllers/`)**: C++ controllers manually assemble raw SQL queries, invoke `synapse_db_query_json` / `synapse_db_execute` over the C ABI, parse JSON strings into `QVariantList` / `QJsonObject`, and calculate business rules (account balance deltas, habit streaks, quiz scoring, card queues) in C++.
2. **Desktop Tauri (`apps/web-react/src-tauri/src/`)**: Rust commands (`cmd_*.rs`) write separate `rusqlite` queries and duplicate identical business logic.
3. **Web Browser (`apps/web-react/src/api/web/`)**: TypeScript storage handlers duplicate the same operations against IndexedDB.

### 1.2. Target State (Unified Core Architecture)
- **`core/synapse-core/` (Rust SSOT)**: Owns all canonical domain models, SQLite database queries (`rusqlite`), schema migrations, and business calculations.
- **`bridges/bridge-qt/`**: Exposes high-level, typed domain functions (`synapse_<module>_*`) rather than raw SQL executors (`synapse_db_query_json`).
- **`apps/desktop-qt/src/controllers/`**: C++ controllers become thin presentation adapters that call high-level bridge functions and emit Qt signals (`Q_PROPERTY`, `emit ...Changed()`). No raw SQL or domain calculations remain in C++.
- **`apps/web-react/src-tauri/`**: Tauri commands become 5–10 line pass-through functions delegating directly to `synapse_core::<module>::*`.
- **`bridges/bridge-wasm/`**: Pure domain calculations (e.g., FSRS, crypto, parsers) are compiled to WebAssembly for browser consumption.

---

## 2. Inviolable Constraints & Release Gates

> [!CAUTION]
> 1. **100% Functional & Visual Parity**: Every user action, keyboard shortcut, calculation result, empty state, and error handling must remain 100% identical.
> 2. **Zero-Regression Verification**: Existing native C++ unit tests (`apps/desktop-qt/tests/`) and web unit tests (`apps/web-react/src/`) must pass at every stage.
> 3. **Non-Breaking Incremental Migration**: Migration progresses strictly module-by-module. Legacy raw SQL bridge calls remain available until all modules are fully transitioned.
> 4. **No UI / Framework Mixing**: QML remains pure presentation; C++ controllers remain thin QObject adapters; React/Tauri remains intact.

---

## 3. Architecture Target Diagram

```mermaid
flowchart TD
    subgraph Presentation_Layer [Presentation Layer]
        QML["Desktop Qt (QML)"]
        ReactUI["Web & Tauri UI (React / TSX)"]
        ComposeUI["Android Native (Compose)"]
    end

    subgraph Orchestration_Layer [Thin Orchestration Adapters]
        QtCtrl["Qt C++ Controllers (Thin Q_OBJECT)<br/>Only manages Q_PROPERTY and signals"]
        TauriCmd["Tauri Commands (Rust)<br/>Thin 5-line wrappers delegating to core"]
        AndroidVM["Android ViewModels (Kotlin)"]
        WebAdapters["Web Storage Adapters (IndexedDB)"]
    end

    subgraph Bridge_Layer [Typed Platform Bridges]
        QtBridge["bridge-qt (High-Level C ABI)"]
        WasmBridge["bridge-wasm (WebAssembly)"]
        UniFFI["bridge-uniffi (UniFFI)"]
    end

    subgraph Core_SSOT [core/synapse-core (Single Source of Truth)]
        DomainServices["Domain Services (Balances, Streaks, Quiz Scoring, FSRS)"]
        Repositories["SQLite Repositories (Prepared Queries & Transactions)"]
        Migrations["Schema Migrations & WAL Pragmas"]
        Crypto["Two-Tier Keychain & AES-256-GCM"]
        MediaStream["ENC1 Video Streaming Engine"]
    end

    QML --> QtCtrl
    QtCtrl -->|High-Level Typed FFI| QtBridge
    QtBridge --> DomainServices

    ReactUI --> TauriCmd
    TauriCmd -->|Direct Rust Crate Call| DomainServices

    ReactUI --> WebAdapters
    WebAdapters --> WasmBridge
    WasmBridge --> DomainServices

    ComposeUI --> AndroidVM
    AndroidVM --> UniFFI
    UniFFI --> DomainServices

    DomainServices --> Repositories
    Repositories --> Migrations
    DomainServices --> Crypto
    DomainServices --> MediaStream
```

---

## 4. Phase-by-Phase Implementation Roadmap

The execution order prioritizes modules with self-contained mathematical business logic and high persistence duplication, minimizing risk while maximizing immediate code reduction.

```
Phase 0: Core Domain Infrastructure & Repository Architecture
   │
   ▼
Phase 1: Pilot Standalone Modules (Finance & Habits)
   │
   ▼
Phase 2: Review & Evaluation Engines (Questions & Anki/FSRS)
   │
   ▼
Phase 3: Catalog & Scheduling Modules (Culture, Calendar, Focus, Notifications)
   │
   ▼
Phase 4: Cross-Cutting Vault, Storage & Trash (Trash, Files, Vault)
   │
   ▼
Phase 5: High-Complexity Media & Notes (Video, Library, Notes)
   │
   ▼
Phase 6: Deprecation of Raw SQL FFI & Final Hardening
```

---

## 5. Exhaustive Execution Checklist

### Phase 0: Core Domain Infrastructure & Repository Architecture

- [x] **0.1 Core Module Structure Setup**
  - [x] Create `core/synapse-core/src/domain/` directory structure.
  - [x] Define shared error type `SynapseError` in `core/synapse-core/src/error.rs` with structured error codes (`DatabaseError`, `NotFound`, `ValidationFailed`, `CryptoError`).
  - [x] Implement repository abstraction pattern over `rusqlite::Connection` in `core/synapse-core/src/db/repository.rs`.
- [x] **0.2 Bridge Contract Standards**
  - [x] Define standardized JSON/struct serialization protocol for FFI error returns in `bridges/bridge-qt/`.
  - [x] Implement string allocation/free helpers (`synapse_free_string`, `synapse_free_secret_string`) for all new domain endpoints.
  - [x] Verify compilation: `cargo test --workspace`.

---

### Phase 1: Pilot Standalone Modules (Finance & Habits)

#### Finance Module
- [x] **1.1.1 Core Domain Models & Repository (`synapse-core`)**
  - [x] Move `Account`, `Transaction`, `WishlistItem` structs into `core/synapse-core/src/domain/finance/models.rs`.
  - [x] Implement repository queries in `core/synapse-core/src/domain/finance/repository.rs`:
    - `get_accounts(&Database) -> Result<Vec<AccountWithBalance>>` (including real-time balance delta calculation: `initial_balance + income - expense - transfer_out + transfer_in`).
    - `get_transactions(&Database, filter: TransactionFilter) -> Result<Vec<Transaction>>`.
    - `create_transaction(&Database, tx: NewTransaction) -> Result<Transaction>`.
    - `update_transaction(&Database, tx: UpdateTransaction) -> Result<()>`.
    - `delete_transaction(&Database, id: &str) -> Result<()>`.
    - `get_financial_summary(&Database) -> Result<FinancialSummary>`.
    - `create_account`, `update_account`, `delete_account`.
    - `get_wishlist`, `create_wishlist`, `update_wishlist`, `delete_wishlist`.
  - [x] Add unit tests in `core/synapse-core/src/domain/finance/tests.rs` verifying balance calculations, transfers, and summary metrics.
- [x] **1.1.2 Bridge Integration (`bridges/bridge-qt`)**
  - [x] Expose C ABI functions in `bridges/bridge-qt/src/lib.rs` and `include/synapse_bridge.h`:
    - `synapse_finance_get_accounts(db: *mut Database) -> *mut c_char`
    - `synapse_finance_get_transactions(db: *mut Database, type_filter: *const c_char, account_filter: *const c_char) -> *mut c_char`
    - `synapse_finance_get_summary(db: *mut Database) -> *mut c_char`
    - `synapse_finance_create_transaction(db: *mut Database, tx_json: *const c_char) -> *mut c_char`
    - `synapse_finance_update_transaction(db: *mut Database, tx_json: *const c_char) -> c_int`
    - `synapse_finance_delete_transaction(db: *mut Database, id: *const c_char) -> c_int`
    - Account and Wishlist CRUD functions.
- [x] **1.1.3 Desktop Qt Controller Refactoring (`apps/desktop-qt`)**
  - [x] Refactor `apps/desktop-qt/src/controllers/finance/finance_controller.cpp`:
    - Remove raw SQL query strings (`SELECT ... FROM finance_accounts`, `SELECT ... FROM transactions`).
    - Remove manual balance delta loop in C++.
    - Replace body with call to `synapse_finance_get_accounts(m_db)` and parse JSON to `QVariantList`.
    - Slim down controller from 260 lines to ~80 lines.
  - [x] Run C++ verification:
    - `cmake --build apps/desktop-qt/build --target synapse-desktop-tests`
    - `ctest --test-dir apps/desktop-qt/build -R native-finance-test --output-on-failure`
- [x] **1.1.4 Tauri Backend Thinning (`apps/web-react/src-tauri`)**
  - [x] Refactor `apps/web-react/src-tauri/src/cmd_finance.rs`:
    - Replace 400+ lines of raw `rusqlite` query code with direct delegators to `synapse_core::domain::finance::*`.
  - [x] Run Tauri/React verification:
    - `npm run test -- src/api/web/finance.test.ts`
    - `cargo test --manifest-path apps/web-react/src-tauri/Cargo.toml`

#### Habits Module
- [x] **1.2.1 Core Domain Models & Repository (`synapse-core`)**
  - [x] Move `Habit`, `HabitLog` structs into `core/synapse-core/src/domain/habits/models.rs`.
  - [x] Implement `core/synapse-core/src/domain/habits/repository.rs`:
    - `get_habits(&Database) -> Result<Vec<Habit>>`.
    - `create_habit(&Database, habit: NewHabit) -> Result<Habit>`.
    - `update_habit(&Database, habit: UpdateHabit) -> Result<()>`.
    - `delete_habit(&Database, id: &str) -> Result<()>`.
    - `toggle_habit_checkin(&Database, habit_id: &str, date: &str) -> Result<bool>`.
    - `get_habit_logs_range(&Database, start_date: &str, end_date: &str) -> Result<Vec<HabitLog>>`.
    - Calculate streaks (current streak, longest streak, completion rate) in Rust.
- [x] **1.2.2 Bridge & Controller Integration**
  - [x] Expose `synapse_habits_*` in `bridges/bridge-qt/`.
  - [x] Refactor `apps/desktop-qt/src/controllers/habits/habits_controller.cpp`:
    - Eliminate raw SQL and delegate to bridge.
  - [x] Verify C++ tests: `ctest --test-dir apps/desktop-qt/build -R native-habits-test --output-on-failure`.
  - [x] Refactor Tauri `cmd_habits.rs` to delegate directly to `synapse-core`.

---

### Phase 2: Review & Evaluation Engines (Questions & Anki/FSRS)

#### Questions / Quiz Module
- [x] **2.1.1 Core Domain Models & Repository (`synapse-core`)**
  - [x] Move `QuizBattery`, `QuizQuestion`, `QuizAttempt` models to `core/synapse-core/src/domain/questions/`.
  - [x] Implement repository operations:
    - `get_batteries`, `create_battery`, `update_battery`, `delete_battery`.
    - `get_questions`, `create_question`, `update_question`, `delete_question`.
    - `record_attempt`, `get_battery_results`, `get_error_notebook_questions`.
    - Normalize legacy question fields (`correct_answer` -> `correct_index`).
- [x] **2.1.2 Bridge & Controller Integration**
  - [x] Expose `synapse_quiz_*` in `bridges/bridge-qt/`.
  - [x] Refactor `apps/desktop-qt/src/controllers/questions/quiz_controller.cpp`:
    - Remove raw SQL updates and attempt scoring logic from C++.
  - [x] Verify C++ tests: `ctest --test-dir apps/desktop-qt/build -R native-questions-test --output-on-failure`.
  - [x] Refactor Tauri commands for Quiz/Questions.

#### Anki / Spaced Repetition Module
- [x] **2.2.1 Core Domain Models & Repository (`synapse-core`)**
  - [x] Leverage existing `synapse_core::fsrs` and add repository in `core/synapse-core/src/domain/anki/`:
    - `get_decks`, `create_deck`, `update_deck`, `delete_deck`.
    - `get_cards_by_deck`, `create_card`, `update_card`, `delete_card`.
    - `get_due_cards(&Database, deck_id: Option<&str>) -> Result<Vec<CardWithSrs>>`.
    - `get_deck_stats(&Database, deck_id: &str) -> Result<DeckStats>` (new, learning, review counts).
    - `review_card(&Database, card_id: &str, rating: Rating) -> Result<SrsUpdateResult>` (combining FSRS calculation and database commit in one atomic transaction).
- [x] **2.2.2 Bridge & Controller Integration**
  - [x] Expose `synapse_anki_*` in `bridges/bridge-qt/`.
  - [x] Refactor `anki_cards_controller.cpp` and `anki_decks_controller.cpp`:
    - Replace C++ FSRS invocation + multi-step SQL queries with single atomic bridge call `synapse_anki_review_card`.
  - [x] Verify C++ tests: `ctest --test-dir apps/desktop-qt/build -R native-anki-test --output-on-failure`.
  - [x] Refactor Tauri `cmd_anki.rs` to delegate to `synapse-core`.

---

### Phase 3: Catalog & Scheduling Modules (Culture, Calendar, Focus, Notifications)

#### Culture Module
- [x] **3.1.1 Core Implementation (`synapse-core`)**
  - [x] Implement `core/synapse-core/src/domain/culture/`:
    - `get_items`, `create_item`, `update_item`, `delete_item`.
    - `get_episodes`, `bulk_create_episodes`, `toggle_episode_watched` (with automatic parent progress synchronization).
- [x] **3.1.2 Bridge & Client Integration**
  - [x] Expose `synapse_culture_*` in `bridges/bridge-qt/`.
  - [x] Refactor `apps/desktop-qt/src/controllers/culture/culture_controller.cpp`.
  - [x] Verify C++ tests: `ctest --test-dir apps/desktop-qt/build -R native-culture-test --output-on-failure`.
  - [x] Refactor Tauri `cmd_culture.rs`.

#### Calendar Module
- [x] **3.2.1 Core Implementation (`synapse-core`)**
  - [x] Implement `core/synapse-core/src/domain/calendar/`:
    - `get_events`, `get_events_range`, `create_event`, `update_event`, `toggle_event_status`, `delete_event`.
    - Reminders and recurrence rule parsing.
- [x] **3.2.2 Bridge & Client Integration**
  - [x] Expose `synapse_calendar_*` in `bridges/bridge-qt/`.
  - [x] Refactor `apps/desktop-qt/src/controllers/calendar/calendar_controller.cpp`.
  - [x] Verify C++ tests: `ctest --test-dir apps/desktop-qt/build -R native-calendar-test --output-on-failure`.
  - [x] Refactor Tauri `cmd_calendar.rs`.

#### Focus & Notifications Modules
- [x] **3.3.1 Core Implementation (`synapse-core`)**
  - [x] Implement `core/synapse-core/src/domain/focus/`: Pomodoro session logging, Lo-Fi catalog listing, Alarms CRUD.
  - [x] Implement `core/synapse-core/src/domain/notifications/`: Unread count, notification pagination, mark-read, clear-all.
- [x] **3.3.2 Bridge & Client Integration**
  - [x] Expose `synapse_focus_*` and `synapse_notifications_*` in `bridges/bridge-qt/`.
  - [x] Refactor `focus_controller.cpp` and `notifications_controller.cpp`.
  - [x] Verify C++ tests: `native-focus-test`, `native-notifications-test`.
  - [x] Refactor Tauri `cmd_focus.rs` and `cmd_notifications.rs`.

---

### Phase 4: Cross-Cutting Vault, Storage & Trash (Trash, Files, Vault)

#### Trash Module (12-Entity Soft Delete)
- [x] **4.1.1 Core Implementation (`synapse-core`)**
  - [x] Implement `core/synapse-core/src/domain/trash/`:
    - Unified query gathering soft-deleted rows from all 12 entities (`pages`, `anki_decks`, `anki_cards`, `library_books`, `vault_items`, `transactions`, `wishlist`, `calendar_events`, `files`, `culture_items`, `habits`, `lofis`).
    - `restore_item(&Database, entity_type: &str, id: &str) -> Result<()>`.
    - `permanent_delete_item(&Database, entity_type: &str, id: &str) -> Result<()>`.
    - `empty_trash(&Database) -> Result<usize>`.
- [x] **4.1.2 Bridge & Client Integration**
  - [x] Expose `synapse_trash_*` in `bridges/bridge-qt/`.
  - [x] Refactor `apps/desktop-qt/src/controllers/trash/trash_controller.cpp`.
  - [x] Verify C++ tests: `ctest --test-dir apps/desktop-qt/build -R native-trash-test --output-on-failure`.
  - [x] Refactor Tauri `cmd_trash.rs`.

#### Vault & Files Modules
- [x] **4.2.1 Core Implementation (`synapse-core`)**
  - [x] Consolidate credential CRUD (`vault_items`, `vault_groups`, `vault_password_history`) in `core/synapse-core/src/domain/vault/`.
  - [x] Consolidate file metadata and folder hierarchies in `core/synapse-core/src/domain/files/`.
- [x] **4.2.2 Bridge & Client Integration**
  - [x] Expose `synapse_vault_*` and `synapse_files_*` in `bridges/bridge-qt/`.
  - [x] Refactor `vault_items_controller.cpp` and `files_*_controller.cpp`.
  - [x] Verify C++ tests: `native-vault-crypto-test`, `native-files-test`.
  - [x] Refactor Tauri `cmd_vault/` and `cmd_files.rs`.

---

### Phase 5: High-Complexity Media & Notes (Video, Library, Notes)

#### Video & Library Modules
- [x] **5.1.1 Core Implementation (`synapse-core`)**
  - [x] Consolidate video catalog metadata, collections, subtitles JSON in `synapse-core::domain::video`.
  - [x] Consolidate book metadata, reading sessions, highlights, bookmarks in `synapse-core::domain::library`.
- [x] **5.1.2 Bridge & Client Integration**
  - [x] Connect `MpvPlayerItem` and video controllers to high-level video domain APIs.
  - [x] Connect library reader controller to library domain APIs.
  - [x] Verify C++ tests: `native-video-test`, `native-library-test`.

#### Notes / Editor Module
- [x] **5.2.1 Core Implementation (`synapse-core`)**
  - [x] Page tree hierarchy, parent/child moves, sibling ordering transactions.
  - [x] Page history revision archiving and optimistic concurrency checks (`expected_updated_at`).
  - [x] Link metadata cache and wiki-link reference indexing.
- [x] **5.2.2 Bridge & Client Integration**
  - [x] Expose `synapse_notes_*` in `bridges/bridge-qt/`.
  - [x] Refactor `notes_hierarchy_controller.cpp`, `notes_cover_controller.cpp`, `notes_controller.cpp`.
  - [x] Note: Rich-text QML editing (`QTextDocument`) and React TipTap schema remain client-specific presentation adapters.
  - [x] Verify C++ tests: `ctest --test-dir apps/desktop-qt/build -R 'native-notes.*' --output-on-failure`.
  - [x] Verify React test suite: `npm run test -- src/components/notes/`.

---

### Phase 6: Deprecation of Raw SQL FFI & Final Hardening

- [x] **6.1 C++ Controller Audit**
  - [x] Verify that zero `executeQuery` or `executeQueryPrepared` calls with hardcoded SQL string literals remain in `apps/desktop-qt/src/controllers/`.
  - [x] Ensure all controllers exclusively call `synapse_<module>_*` bridge functions.
- [x] **6.2 Bridge Hardening**
  - [x] Mark `synapse_db_query_json` and `synapse_db_execute` as `#[deprecated]` in Rust and C++ headers, restricting usage to administrative tools and tests.
- [x] **6.3 Full Regression Suite & Verification**
  - [x] Build clean Qt target: `cmake --build apps/desktop-qt/build --target synapse-desktop -j 4`.
  - [x] Run full Qt native test suite: `ctest --test-dir apps/desktop-qt/build --output-on-failure`.
  - [x] Run full Cargo workspace tests: `cargo test --workspace`.
  - [x] Run React / Tauri typecheck and unit tests:
    - `npm run typecheck`
    - `npm run test:unit`
- [x] **6.4 Documentation Update**
  - [x] Update [native-desktop-parity.md](../native-desktop-parity.md) recording that persistence and domain logic parity is now 100% unified in Rust.
  - [x] Update [documentation-status.md](../documentation-status.md) marking the deduplication milestone as complete.

---

## 6. Verification Protocol & Acceptance Gate Criteria

For every module migrated during this plan, the following gate must pass before considering the module step done:

```bash
# 1. Sub-second crate compilation
cargo check -p synapse-core -p synapse-bridge-qt

# 2. Targeted Rust tests
cargo test -p synapse-core -- domain::<module>

# 3. Qt compilation and targeted native test execution
cmake --build apps/desktop-qt/build --target synapse-desktop-tests
ctest --test-dir apps/desktop-qt/build -R native-<module>-test --output-on-failure

# 4. Tauri command compilation check
cargo check --manifest-path apps/web-react/src-tauri/Cargo.toml

# 5. Git check for unintended edits or trailing whitespace
git diff --check
```
