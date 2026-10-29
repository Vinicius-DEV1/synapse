# Changelog

All notable changes to **Synapse** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-10-29

### Added
- **Reproducible Performance Benchmark Suite**:
  - Automated benchmark harness (`scripts/benchmark.mjs` / `npm run benchmark`) measuring Vite build times, bundle sizing, cryptographic primitives (PBKDF2, AES-GCM), Base64 throughput, state cascade traversals, and search filtering across 5 measured iterations.
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
  - Migrated `vite.config.ts` path resolution to native modern ESM `import.meta.dirname`.
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
  - Zero-Knowledge End-to-End Encryption (E2EE) with PBKDF2-HMAC-SHA256 (600,000 iterations) and AES-256-GCM.
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
  - Mobile companion application shell powered by Expo SDK 54 (`caderno-mobile-webview`).
