# Architecture and Core Findings

## Intended boundary

Qt app guidance says QML renders and dispatches, C++ controllers are thin orchestrators, and canonical domain models, queries, and calculations belong in synapse-core via typed bridge-qt operations. Current source does not fully meet that boundary.

## Generic SQL is still exposed

- [synapse_controller.h](../../../apps/desktop-qt/src/synapse_controller.h#L114) exposes executeSql as Q_INVOKABLE, making arbitrary SQL reachable from QML.
- The shared controller declares generic executeQuery, executeQueryPrepared, and executeSqlPrepared methods and wraps generic bridge database functions.
- Generic bridge SQL methods are described as deprecated in the parity tracker, yet the application wrapper still uses them.
- This weakens typed contracts and conflicts with [apps/desktop-qt/AGENTS.md](../../../apps/desktop-qt/AGENTS.md).

## SQL-containing app files

Static scan found SQL in the following files:

- [synapse_controller.cpp](../../../apps/desktop-qt/src/synapse_controller.cpp) — generic query/execute wrappers and keychain count.
- [database_prepared_controller.cpp](../../../apps/desktop-qt/src/controllers/platform/database_prepared_controller.cpp) — generic prepared query/execute wrapper.
- [system_controller.cpp](../../../apps/desktop-qt/src/controllers/platform/system_controller.cpp) — PRAGMA maintenance and SQLite diagnostics.
- [vault_setup_controller.cpp](../../../apps/desktop-qt/src/controllers/vault/vault_setup_controller.cpp) — key migration transaction and selected legacy migration.
- [vault_setup_assets_controller.cpp](../../../apps/desktop-qt/src/controllers/vault/vault_setup_assets_controller.cpp) — asset inventory/migration.
- [vault_asset_migration_controller.cpp](../../../apps/desktop-qt/src/controllers/vault/vault_asset_migration_controller.cpp) — managed asset migration.
- [vault_auth_controller.cpp](../../../apps/desktop-qt/src/controllers/vault/vault_auth_controller.cpp) — local vault/keychain handling.
- [vault_password_controller.cpp](../../../apps/desktop-qt/src/controllers/vault/vault_password_controller.cpp) — password migration.
- [vault_removal_controller.cpp](../../../apps/desktop-qt/src/controllers/vault/vault_removal_controller.cpp) — vault removal/re-encryption migration.

These statements have different risk profiles. Diagnostics and atomic recovery migrations may need narrow low-level operations. The goal is not to break vault recovery; it is to remove generic feature SQL and document/test infrastructure exceptions.

## Core/bridge checklist

- [ ] Inventory every Q_INVOKABLE that persists data or calculates domain values.
- [ ] Link each method to the typed bridge export and Core operation.
- [ ] Classify remaining queries as domain logic, diagnostics, or migration.
- [ ] Move domain reads/writes/calculations to atomic, tested Core APIs without changing schemas or behavior.
- [ ] Replace QVariantMap/List with typed DTOs where stable and practical.
- [ ] Remove generic SQL from QML once all callers use typed operations.
- [ ] Add bridge contract tests for null, malformed, stale, and unsupported payloads.
- [ ] Keep Core and bridge files cohesive and within size guidance.

## Controller concentration

The global [synapse_controller.h](../../../apps/desktop-qt/src/synapse_controller.h) is 526 lines. Static search found 194 unique QML dataController method references. This large dynamic surface makes ownership and contract drift difficult to inspect.

- [ ] Group declarations/implementations by module while preserving stable QML behavior.
- [ ] Keep cross-module composition, app lifecycle, and platform functions at app level.
- [ ] Introduce module-scoped typed façades where useful.
- [ ] Add a static inventory check for QML-to-controller references.
- [ ] Document ownership of each property, signal, method, and DB lifecycle.

## File-size inventory

| Layer | Files above 300 lines | Examples |
| --- | ---: | --- |
| QML | 38 | VaultItemDetails.qml, PracticeView.qml, NotesRichTextInput.qml, NotesEditorView.qml, AnkiDeckBrowserModal.qml, AuthenticatedApplication.qml, VideoDictionaryDialog.qml |
| C++ source/header | 11 | synapse_controller.h, synapse_controller.cpp, Notes rich-text controllers, library_reader_controller.cpp, vault_setup_controller.cpp |
| Tests | 13 | native_notes_test.cpp and large Notes QML suites |

Counts indicate areas to inspect, not quality by themselves. Map ownership, events, serialization, and tests before splitting.

- [ ] Capture current size inventory before/after each refactor.
- [ ] Split one cohesive responsibility at a time.
- [ ] Preserve QML object names, signals, properties, keyboard scopes, serialization, and undo/redo.
- [ ] Keep business rules out of QML and app controllers.
- [ ] Run focused Qt tests/QML lint after each structural pass.

## Diagram contract risk

Qt uses a custom JSON shapes array; React loads Tldraw snapshots. Collect fixtures/version metadata before conversion. Preserve unsupported records rather than destructively rewriting them. See DESK-PAR-014.

## Architecture completion gate

- [ ] No arbitrary SQL invocation is reachable from QML.
- [ ] Feature persistence and calculations use typed Core APIs except documented infrastructure/migration operations.
- [ ] Every exception has an owner, rationale, and test.
- [ ] Controller responsibilities are module-scoped and reviewable.
- [ ] Contracts report explicit errors rather than empty/default success.
- [ ] New work does not introduce domain duplication or controller monoliths.

