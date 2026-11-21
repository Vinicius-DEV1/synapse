# Documentation Ownership and Current Status

**Last reviewed:** 2026-11-21

This page identifies the current sources of truth across the repository. Older audit snapshots and design proposals may contain historical estimates, test totals, file paths, or completion checkboxes; do not use historical records as proof of current implementation status without revalidating against the codebase.

## Current Sources of Truth

| Topic | Current document | What it governs |
| --- | --- | --- |
| Repository and app ownership | [Repository layout](./architecture/repository-layout.md) | Product directories, build owners, and shared-code boundaries |
| Cross-app module inventory | [Module structure](./architecture/module-structure.md) | Canonical module IDs, source locations, and current route presence per client |
| System architecture | [Architecture overview](./architecture/overview.md) | Runtime responsibilities, unified Rust core boundaries, and SQLite WAL concurrency |
| Performance & bundle budgets | [Performance and benchmarks guide](./guides/performance-and-benchmarks.md) | Tauri async IPC, SQLite WAL pool, metadata-first notes loading, React selector isolation, and bundle budget gates |
| Testing & quality gates | [Testing and quality guide](./guides/testing-and-quality.md) | Targeted Vitest, Cargo, Qt CTest, and Android instrumentation workflows |
| Build and setup commands | [Setup and build guide](./guides/setup-and-build.md) | Current build commands and platform prerequisites |
| Qt desktop feature parity | [Native desktop parity matrix](./native-desktop-parity.md) | Verified Qt coverage and remaining React parity gaps |
| Native Android Finance | [Android Finance module](./modules/mobile-android-finance.md) | Compose UI, UniFFI API, local SQLite persistence, verification, and explicit cloud/encryption gaps |
| Synchronization engine | [Sync Engine Architecture](./architecture/sync-engine.md) | Cloud synchronization, transactional batch upserts, indexed delta queries, and table sync inventory |
| Firebase integrity audit | [Firebase sync integrity audit](./audits/firebase-sync-integrity-2026-11-17/README.md) | Current local schema, Firestore ID reconciliation, security findings, and resolution checklist |
| Potential bug audits | [Native Android audit (2026-11-20)](./audits/potential-bug-audit-android-2026-11-19.md), [native Qt audit (2026-11-19)](./audits/potential-bug-audit-qt-2026-11-19.md), [sync audit (2026-11-19)](./audits/potential-bug-audit-2026-11-19.md), [prior audit (2026-11-18)](./audits/potential-bug-audit-2026-11-18.md) | Targeted Android ABI and lifecycle findings, Qt cloud-account placeholder fix, sync concurrency, local-origin checks, and Yjs equal-timestamp convergence |
| Qt vault and encryption coverage | [Native encryption audit](./security/native-encryption-audit.md) | Implemented protection, test evidence, and open encryption risks |
| Cloud account key migration | [Cloud account encryption migration](./security/cloud-account-encryption-migration.md) | React/Tauri/WebView migration flow, client coverage, quota footprint, and safe legacy-removal gates |
| Repository hygiene and safe cleanup | [Repository hygiene audit](./maintenance/repository-hygiene-audit-2026-11-18.md) | Tracked/untracked inventory, generated-file cleanup, intentionally retained compatibility files, and deletion gates |
| Engineering rules | [Root AGENTS.md](../AGENTS.md) and app-level `AGENTS.md` files | Required code, testing, documentation, and ownership rules |
| Skill specifications | [Engineering skills index](../.agents/skills/README.md) | Agent playbooks; specifications are not implementation evidence |

## Verified Project Status

- **Multi-Target Repository**: Contains React Web/Tauri (`apps/web-react/`), native Qt desktop (`apps/desktop-qt/`), native Kotlin/Compose Android (`apps/mobile-android/`), and an Expo/WebView Android shell (`apps/mobile-webview/`). The root npm workspace delegates to `apps/web-react/`; other app targets use their own build systems.
- **Unified Domain Core (`core/synapse-core/`)**: Serves as the Single Source of Truth for canonical domain models, SQLite schema/migrations, repository persistence, and business calculations across native clients, eliminating raw SQL construction in C++ controllers and Tauri commands.
- **React Web & Tauri Desktop Performance Architecture (2026-11-21)**:
  - **Tauri Backend Concurrency**: Replaced the single global SQLite mutex with a dedicated writer connection and a 4-connection read-only WAL pool (`SQLITE_OPEN_READ_ONLY | SQLITE_OPEN_NO_MUTEX`) with `cache_size = -64000`, `temp_store = MEMORY`, and `mmap_size = 268435456`. Converted 231 Tauri commands to non-blocking `async fn` handlers backed by `tokio::task::spawn_blocking`. Migrated `encrypted://` to `register_asynchronous_uri_scheme_protocol` with strong `ETag` and `304 Not Modified` support (gated by active vault unlock validation).
  - **Lightweight Notes Metadata & Focus Isolation**: `getAllPages` / `notes_get_all_pages` now fetches lightweight metadata only, hydrating `content`, `encrypted_content`, and `crdt_state` on demand via `getPageContent(pageId)` with in-flight request deduplication. Removed full-table reloads on `window.focus` and gated editor/dashboard listeners by `isActive`.
  - **React Store & Context Isolation**: Migrated all 43 former monolithic `useStore()` consumers to fine-grained `useStoreSelector`, `usePages`, `useStoreDispatch`, and `getStoreState`. Isolated 1Hz Pomodoro countdown ticks into `FocusTimerTickContext` and separated `TaskStateContext` from `TaskActionsContext`.
  - **Sync Engine & Bundle Reduction**: Added transactional batch upserts (`sync_upsert_rows_batch` / `upsertRowsBatch`), SQLite and IndexedDB v29 timestamp indexes (`updated_at`, `created_at`, `deleted_at`), on-demand Highlight.js/Lowlight language loading, and Yjs snapshot compaction (>128 KB). Initial boot preloaded JS in `dist/index.html` dropped from **~3.4 MB to ~616.3 KB (-82%)**, passing all 7 CI budgets in `npm run check:budgets`.
- **Qt Desktop Feature Parity**: The React client remains the visual and functional reference. The habits feature is an embedded editor widget (`/habito` slash command and interactive widget) in both React and Qt rather than a standalone sidebar route.
- **Cloud Synchronization**: Scoped reconciliation and authenticated decrypted readback are complete according to the [Firebase audit](./audits/firebase-sync-integrity-2026-11-17/README.md) (5,005 scoped sync documents verified, zero missing or remote-only IDs). A fresh React Web account sign-in and full sync pull also completed after the latest Hosting release (5,030 app-recorded reads, 5 writes, no sync error or emergency stop). Source-root documents, archives, and rollback snapshots remain preserved pending separate retention gates.
- **Native Vault & Encryption Coverage**: Partial coverage. Qt setup migrates referenced media inside managed directories with an atomic recovery journal, and React/Tauri/WebView support Firebase account password key rewrapping. However, sensitive business-data columns in several SQLite tables (Finance, Calendar, Habits, Culture, Anki, Questions, Focus, Notifications, Tutor) and metadata fields remain plaintext at rest. The [native encryption audit](./security/native-encryption-audit.md) remains open.
- **Native Android Status**: Gradle builds and packages the UniFFI Rust bridge for `arm64-v8a`, `x86_64`, and `armeabi-v7a`. Native Android Finance uses typed core APIs and local SQLite persistence; other Android modules, Firebase account/key migration, cloud sync, encrypted Finance storage, and encrypted-video playback remain open. See the [Android Finance guide](./modules/mobile-android-finance.md) and [Android UI modularization record](./audits/android-ui-modularization-plan-2026-11-20.md).

## Documentation Update Rules

1. Write technical documentation in English. Keep `README.pt-BR.md` as the localized Portuguese README.
2. Use paths relative to the Markdown file for repository links. Do not add machine-specific `file://` links or personal database locations.
3. Update the relevant source-of-truth document in the same change as a feature, migration, performance, or security change.
4. Use `Partial`, `Missing`, or `Unverified` when acceptance evidence is incomplete. Avoid `100%`, `Production`, or fixed test totals unless reproducible current evidence supports the claim.
5. Validate links, commands, paths, and code references against the checked-out repository before reporting completion.
