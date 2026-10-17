# Changelog

All notable changes to **Synapse** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
