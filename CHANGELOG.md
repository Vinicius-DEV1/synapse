# Changelog

All notable changes to **Synapse** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Historical release notes describe the mechanisms introduced at those releases; they are not a statement of current repository-wide security coverage. See the [native encryption audit](./docs/security/native-encryption-audit.md) for current status.

---

## [Unreleased]

### Changed & Performance
- **Desktop Tauri Concurrency & SQLite WAL Read Pool (`apps/web-react/src-tauri/`, `core/synapse-core/`)**:
  - Replaced single global SQLite connection mutex with a dedicated writer connection and a 4-connection read-only WAL pool (`SQLITE_OPEN_READ_ONLY | SQLITE_OPEN_NO_MUTEX`) with `cache_size = -64000`, `temp_store = MEMORY`, and `mmap_size = 268435456`.
  - Migrated 231 Tauri commands from synchronous main-thread handlers to `async fn` handlers backed by `tokio::task::spawn_blocking`.
  - Upgraded `encrypted://` custom protocol to `register_asynchronous_uri_scheme_protocol` with strong `ETag` and `304 Not Modified` support gated by active vault unlock verification.
- **Metadata-First Notes Hydration & Focus Isolation (`core/synapse-core/src/domain/notes/`, `apps/web-react/src/`)**:
  - `getAllPages` / `notes_get_all_pages` now loads lightweight page metadata only; full page bodies and Yjs CRDT states are loaded on demand via `getPageContent(pageId)` with in-flight request deduplication.
  - Eliminated full-table reloads on `window.focus` and gated editor/dashboard listeners by active tab visibility (`isActive`).
- **React Store Selector Isolation & Context Splitting**:
  - Migrated all 43 former monolithic `useStore()` consumers to granular `useStoreSelector`, `usePages`, `useStoreDispatch`, and `getStoreState` hooks.
  - Isolated 1Hz Pomodoro countdown ticks into `FocusTimerTickContext` and split `TaskStateContext` / `TaskActionsContext`.
- **Editor Hot-Path, Sync Batching & -82% Boot Preload Reduction**:
  - Added $O(1)$ non-table transaction bailout in `useTableCellValidation`, automated Yjs snapshot compaction for >128 KB documents, transactional batch upserts (`sync_upsert_rows_batch` / `upsertRowsBatch`), and SQLite / IndexedDB v29 timestamp indexes.
  - Replaced eager 190-language `highlight.js` bundle with on-demand language grammar imports and `createLazyLowlightPlugin`, reducing initial preloaded JS in `dist/index.html` from **~3.4 MB to ~616.3 KB (-82%)**.
- **Documentation Reorganization & Hygiene**:
  - Added canonical [Performance & Benchmarks Guide](./docs/guides/performance-and-benchmarks.md) and [Testing & Quality Assurance Guide](./docs/guides/testing-and-quality.md).
  - Reorganized module documentation under `docs/modules/`, removed obsolete root benchmark/archive dumps, and synchronized [Documentation Ownership and Current Status](./docs/documentation-status.md).

### Security
- Qt first-time vault setup stages and migrates referenced media inside the managed files, library, and videos folders using a persistent recovery journal. Unlock resumes pending records before exposing the vault.
- The native encryption audit remains open: sensitive business-table fields, some metadata, unmanaged assets, and complete cross-client recovery are not yet covered.

## [1.2.0] - 2026-10-29

### Added
- **Production Performance Budget Gate (`apps/web-react/scripts/check-perf-budgets.mjs`)**:
  - Automated CI quality gate asserting total bundle size, CSS size, `react-vendor` chunk, `main` entry chunk, and heavy chunks stay within strictly defined thresholds.
  - Added `npm run check:budgets` script integrated into GitHub Actions CI pipeline.
- **High-Volume Scale & Hardware Emulation Benchmarks**:
  - Extended benchmark suite with 10x (20k items) and 100x (200k items) search dataset scaling, 10x page cascade traversals, keystroke interaction latencies, 4x CPU throttle mobile simulation, and multi-cycle memory leak retention profiling.

### Changed & Performance
- **Granular Vendor Chunking & Code-Splitting**:
  - Refined `manualChunks` in `apps/web-react/vite.config.ts` to strictly isolate core React runtime (`/node_modules/(react|react-dom|scheduler)/`), shrinking `react-vendor` from **1,275.10 KB down to 182.04 KB (-85.7%)**.
  - Isolated `@xenova/transformers` and `onnxruntime-web` into a dedicated `'transformers'` chunk, shrinking `CultureView` from **1,094.08 KB down to 261.46 KB (-76.1%)**.
  - Dynamic `lazy()` code-splitting of `GlobalSearchModal`, `SyncErrorModal`, `RenamePageModal`, and workspace modals, shrinking `main` entry chunk from **262.57 KB down to 196.98 KB (-25.0%)**.
  - Eradicated `[INEFFECTIVE_DYNAMIC_IMPORT]` warning in `SidebarItem`.
- **Search Pre-Indexing & Bounded Memory Hygiene**:
  - Pre-indexed normalized page titles, paths, and ancestor arrays on modal open, eliminating string transformations and array allocations on every keystroke.
  - Replaced unbounded `plainTextCache` with bounded `LruMap` (1,000 entries) with explicit cache invalidation tests.
  - Improved 100x scale search scan latency from **170.86 ms down to 140.22 ms (-17.9%)** and keystroke typing latency to **0.23 ms**.
- **DOM Bloat Prevention in Long Lists (Rule 9.10)**:
  - Added native CSS `content-visibility: auto` with intrinsic container sizing to card rows in `CardListView`, `CardGridView`, and `VaultItemList`.
  - Optimized question battery accuracy calculations in `BatteryTreeItem` to a single-pass $O(N)$ counter without intermediate array allocations.
- **Sync Memory Discipline & Zero-Allocation Parser**:
  - Added explicit `ydoc.destroy()` in `sync-pull-merge.ts` within `try...finally` to immediately release ephemeral CRDT structures.
  - Replaced `new Date(s).getTime()` with `Date.parse(s)` in `sync-utils.ts` to eliminate object allocations during batch sync processing.

---

## [1.1.0] - 2026-10-29

### Added
- **Reproducible Performance Benchmark Suite**:
  - Automated benchmark harness (`apps/web-react/scripts/benchmark.mjs` / `npm run benchmark`) measuring Vite build times, bundle sizing, cryptographic primitives (PBKDF2, AES-GCM), Base64 throughput, state cascade traversals, and search filtering across 5 measured iterations.
  - Dedicated non-blocking performance benchmarking job in GitHub Actions CI pipeline (`.github/workflows/ci.yml`).
  - Comprehensive performance documentation with methodology, hardware specs, and comparative tables in `docs/DESEMPENHO.md`.
  - Comprehensive 4-tier architectural specification and Mermaid diagram in `docs/ARQUITETURA.md`.

### Changed & Performance
- **Sync Pipeline Base64 Serialization**:
  - Replaced manual 8KB chunking and `String.fromCodePoint.apply` with zero-allocation pre-computed lookup tables (`uint8ArrayToBase64`), achieving a **32x speedup** (55.96 ms down to 1.72 ms).
- **Batch Sync Decompression**:
  - Optimized compressed sync payload ingestion with direct native ArrayBuffer stream piping (`DecompressionStream`), yielding a **5.6x speedup** (8.15 ms down to 1.45 ms).
- **Bundle & Code Splitting**:
  - Converted static book enricher imports in `BookEditModal` and `BookInfoModal` into dynamic `import()`, reducing the `LibraryView` chunk size by **-7.65%** (-9.82 KB) and resolving Vite bundler warnings.
  - Migrated `apps/web-react/vite.config.ts` path resolution to native modern ESM `import.meta.dirname`.
- **In-Memory Search Optimization**:
  - Reduced entity filtering and search query scan latency by **-54.36%** (3.90 ms down to 1.78 ms).

### Fixed
- **Phantom Dependency Elimination**:
  - Replaced undeclared `@radix-ui/react-dialog` in `WebVersionModal.tsx` with standard accessible `Modal` primitive, eliminating build break risk while preserving exact visual styling and behavior.
- **Type Safety & Robustness**:
  - Formalized `setAppIcon?: (type: 'normal' | 'zzz') => Promise<void>` on canonical `ICadernoAPI['focus']` interface, eliminating local type monkey-patching in `useFocusTimer`.
  - Removed redundant `sessionId as unknown as number` type assertion.
  - Hardened procedural focus audio with safe `isSoundGloballyEnabled()` try/catch wrapper for privacy-restricted browser environments.

---

## [1.0.0] - 2026-10-17

### Added
- **Core Architecture**:
  - Offline-first hybrid runtime powered by **Tauri v2 + Rust** (Desktop) and **React 19 + TypeScript + Vite** (Web/PWA).
  - Multiplatform persistence layer supporting local SQLite with Write-Ahead Logging (`rusqlite`) and IndexedDB (`idb`).
  - Master-key derivation and selected AES-256-GCM key-envelope and content-protection flows. Current entity coverage is documented in the security audit.
  - Two-Tier Keychain hierarchy separating user Master Password derivation from individual module keys.
- **Synapse Notes (Rich-Text Second Brain)**:
  - ProseMirror/TipTap v3 block writing engine with LaTeX math formulas, callouts, task checklists, and code highlighting (`lowlight`).
  - Conflict-free real-time collaborative state powered by **Yjs CRDTs**.
  - Visual revision history with granular word-level diffing via `htmldiff-js`.
  - Nested hierarchical page tree with drag-and-drop organization (`@dnd-kit`).
- **Security & Password Vault**:
  - High-entropy credential manager with field-level encryption.
  - Have I Been Pwned (HIBP) breach checking via k-Anonymity SHA-1 prefix API.
  - Cryptographically secure password and passphrase generator.
- **Cognitive Study & Spaced Repetition (Anki Engine)**:
  - Free Spaced Repetition Scheduler (FSRS) implementation using the modern DSR (Difficulty, Stability, Retrievability) cognitive model (`ts-fsrs` v5).
  - Deck management, tag filtering, retention forecast metrics, and review heatmaps.
  - Contextual AI flashcard synthesis powered by Google Gemini.
- **Interactive Question Batteries & Focus Exam Solver**:
  - Full-canvas distraction-free question solving environment.
  - Keyboard-first rapid navigation (`A`, `B`, `C`, `D`, `Enter`, `Esc`).
  - Instant explanations, performance scoring, and mistake review.
- **Digital Library & Document Reader**:
  - Dual-page EPUB book engine (`epubjs`) and high-fidelity PDF reader (`pdfjs-dist`).
  - On-device Optical Character Recognition (OCR) powered by `tesseract.js`.
  - Reading progress tracking, bookmarks, and margin highlights.
- **Culture & Encrypted Video Study Studio**:
  - Proprietary **ENC1** chunked media container format enabling instant random-access seeking without loading full files into RAM.
  - Local loopback streaming server via Tokio and Axum on Desktop; Service Worker (`sw.js`) decryption pipeline on Web.
  - Subtitle parser (`.vtt`, `.srt`) with synchronized vocabulary lookup.
  - Integrated YouTube downloading and audio extraction via `yt-dlp` and `ffmpeg`.
- **Language Immersion Practice**:
  - Voice and text conversational simulation with Google Gemini.
  - Persistent Core Memory extraction for contextual recall across sessions.
- **Infinite Whiteboard & Diagrams**:
  - Spatial conceptual whiteboard powered by **Tldraw** v5.
- **Focus Studio & Lo-Fi Audio**:
  - Customizable Pomodoro productivity timer synchronized with desktop notifications.
  - Multi-track ambient sound generator (rain, vinyl, synth, cafe).
- **Encrypted Cloud Drive**:
  - Client-side encrypted file storage with resumable Google Drive chunked transfers (OAuth2 PKCE).
- **Personal Finance Ledger**:
  - Expense and income tracking with categorization, budgeting, and SVG charts (`recharts`).
- **DevOps & Packaging**:
  - Multi-stage `Dockerfile` and `docker-compose.yml` for self-hosted container deployments.
  - Native desktop bundle generation for Linux (`.AppImage`, `.deb`), Windows (`.msi`, `.exe`), and macOS (`.dmg`, `.app`).
  - Mobile companion application shell powered by Expo SDK 54 (`apps/mobile-webview`).
