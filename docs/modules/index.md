# 🧩 Synapse System Modules & Domain Architecture Reference

This document provides a comprehensive technical overview of the functional modules composing **Synapse**. Each module operates with clear architectural boundaries, dedicated domain models, and decoupled cryptographic keys while leveraging shared core infrastructure.

---

## 1. Module Capability & Security Matrix

| # | Module | Primary Responsibility | Encryption Key | Persistence Layer | External Engines |
| :- | :----- | :--------------------- | :------------- | :---------------- | :--------------- |
| **1** | **Synapse Notes** | Rich text writing, blocks, collaborative CRDT | `notes_key` | SQLite / IDB `pages` | TipTap v3, ProseMirror, Yjs |
| **2** | **Password Vault** | Credentials, passwords, card data | `vault_key` | SQLite / IDB `vault_items` | Web Crypto API, HIBP API |
| **3** | **Digital Library** | E-books, PDF research, highlights, OCR | `files_key` | SQLite / IDB `books` | EpubJS, PDF.js, Tesseract.js |
| **4** | **Culture & Media** | Cinema tracker, encrypted video player | `culture_key` | SQLite / Filesystem | FFmpeg, yt-dlp, Axum |
| **5** | **Anki & Flashcards** | Spaced repetition study decks | `anki_key` | SQLite / IDB `anki_cards` | FSRS Algorithm (`ts-fsrs` v5), Gemini AI |
| **6** | **Question Batteries & Focus Exam Solver** | Distraction-free test simulator | `anki_key` | SQLite / IDB `questions` | Keyboard-first engine |
| **7** | **Language Immersion Practice** | Conversational voice/chat study | `core_key` | SQLite / IDB `practice` | Gemini 2.0 Flash, Web Audio |
| **8** | **Focus & Ambient Studio** | Ambient soundscapes, Pomodoro | `core_key` | SQLite / IDB `habits` | Web Audio API, Canvas |
| **9** | **Infinite Whiteboard & Diagrams** | Spatial mind-mapping, visual sketches | `diagram_key` | SQLite / IDB `diagrams` | Tldraw v5 |
| **10** | **Encrypted Cloud Files** | Zero-Knowledge cloud drive backups | `masterKey` | Google Drive (`.enc`) | Google Drive API, PKCE OAuth |
| **11** | **Personal Finance Ledger** | Expense tracking, budgeting, cash flow | `finance_key` | SQLite / IDB `finance` | Recharts SVG Engine |
| **12** | **Habits & Routines** | Habit frequency, consistency streaks | `core_key` | SQLite / IDB `habits` | Reactive analytics |
| **13** | **Calendar & Agenda** | Task scheduling, deadline tracking | `core_key` | SQLite / IDB `calendar` | Date-fns |

---

## 2. In-Depth Module Specifications

### 2.1. Synapse Notes (Rich-Text Writing & Second Brain Engine)
- **Source Paths**: `src/components/Editor.tsx`, `src/components/editor/`, `src/components/editor-extensions/`
- **Core Technology**: TipTap v3 (ProseMirror toolkit), `y-prosemirror`, Yjs CRDTs.
- **Architectural Highlights**:
  - **Custom ProseMirror Nodes**: Dynamic task lists, syntax-highlighted code blocks (`lowlight`), interactive tables, callouts, and mathematical formulas.
  - **Collaborative CRDT Document Model**: Multi-device synchronization without merge conflicts, powered by Yjs state vectors.
  - **Visual Revision History**: Snapshot diffing via `htmldiff-js`, allowing users to inspect word-level additions and deletions across historical versions.
  - **Hierarchical Organizing**: Nested tree structure with drag-and-drop reorganization (`@dnd-kit`).
- **Deep-Dive Specification**: See [**`docs/modules/notes.md`**](./notes.md) for ProseMirror schemas, custom node definitions, and Yjs synchronization details.

---

### 2.2. Password & Credential Vault
- **Source Paths**: `src/components/vault/`, `src-tauri/src/cmd_vault/`
- **Core Technology**: Field-level AES-256-GCM encryption, Web Crypto API, k-Anonymity API.
- **Architectural Highlights**:
  - **Field-Level Isolation**: Sensitive fields (`password`, `notes`, `totp_secret`) are encrypted individually before database insertion.
  - **HIBP Compromise Detection**: Queries the *Have I Been Pwned* API using **k-Anonymity** (only the first 5 characters of the SHA-1 password hash are transmitted), preserving 100% credential privacy.
  - **Password Generator**: Cryptographically random generator (`crypto.getRandomValues`) with customizable character sets and Shannon entropy scoring.
- **Deep-Dive Specification**: See [**`docs/modules/vault.md`**](./vault.md) for field-level encryption wire formats and k-Anonymity breach checking mechanics.

---

### 2.3. Digital Library & Document Reader
- **Source Paths**: `src/components/library/`, `src/components/files/`
- **Core Technology**: EpubJS, PDF.js, Tesseract.js, Web Workers.
- **Architectural Highlights**:
  - **Multi-Format Support**: High-performance rendering of EPUB publications and PDF documents.
  - **Reading State Preservation**: Accurate Canonical Fragment Identifier (CFI) tracking for EPUBs and page indices for PDFs.
  - **On-Device OCR**: Client-side text extraction from scanned textbook captures without external API calls.
  - **Contextual Annotations**: Text selection anchors, multi-color highlighting, and inline note creation.

---

### 2.4. Culture Tracker & Encrypted Cinema
- **Source Paths**: `src/components/video-player/`, `src/components/culture/`, `src-tauri/src/cmd_stream.rs`, `src-tauri/src/crypto_stream.rs`
- **Core Technology**: Proprietary ENC1 format, Axum loopback streaming, Service Worker, FFmpeg.
- **Architectural Highlights**:
  - **Chunked Video Streaming**: Encrypted 4K media playback with sub-second seek times using HTTP 206 byte-range chunk decryption (see [`docs/protocols/enc1-streaming.md`](../protocols/enc1-streaming.md)).
  - **Dual-Platform Engine**: Axum internal HTTP server on Tauri Desktop; Service Worker (`sw.js`) pipeline on Web PWA.
  - **Subtitle Engine**: Real-time parser for `.vtt` and `.srt` subtitles with styling controls and audio track synchronization.

---

### 2.5. Spaced Repetition (Anki Engine)
- **Source Paths**: `src/components/anki/`, `src/services/fsrs.ts`
- **Core Technology**: Free Spaced Repetition Scheduler (`ts-fsrs` v5) algorithm, Gemini AI.
- **Architectural Highlights**:
  - **Modern Cognitive Scheduling**: Implements FSRS (DSR model), outperforming traditional SM-2 by optimizing memory stability ($S$) and retrievability ($R$).
  - **AI Deck Synthesis**: Integrates Google Gemini to automatically transform notes and web clippings into structured flashcard decks.
  - **Review Analytics**: Visual heatmap, retention curves, and daily forecast metrics.
- **Deep-Dive Specification**: See [**`docs/modules/anki-fsrs.md`**](./anki-fsrs.md) for the mathematical DSR formulation, rating curves, and AI synthesis prompts.

---

### 2.6. Interactive Question Batteries & Focus Exam Solver
- **Source Paths**: `src/components/questions/`, `src/services/quiz/`
- **Core Technology**: Zen full-viewport distraction-free canvas, keyboard-first navigation engine.
- **Architectural Highlights**:
  - **Keyboard Fluidity**: Complete exam solving without cursor hunting (`A`, `B`, `C`, `D`, `Enter`, `Esc`).
  - **Cognitive Isolation**: Suppresses extraneous navigation bars and tags during active problem-solving sessions.

---

### 2.7. AI Conversational Language Practice
- **Source Paths**: `src/components/practice/`, `src/services/gemini/`
- **Core Technology**: Google Gemini 2.0/2.5 Flash, Gemini Multimodal Live (WebSocket), Web Audio API.
- **Architectural Highlights**:
  - **Hybrid Voice & Text Chat**: Real-time voice calls and written chat with keyboard fluidity.
  - **Pedagogical Language Coach**: Double-layer response providing conversational engagement in target language plus structured feedback cards.
  - **Long-Term Memory Extraction**: Background extraction of personal context and language progress across sessions.

---

### 2.8. Focus & Ambient Productivity Studio
- **Source Paths**: `src/components/focus/`, `src/services/lofi-manager.ts`
- **Core Technology**: Web Audio API, HTML5 Canvas, System Notification API.
- **Architectural Highlights**:
  - **Lo-Fi Soundscapes**: Multi-track ambient sound generator (rain, cafe, vinyl, synth waves) with independent volume equalization.
  - **Pomodoro Cycles**: Customizable work/rest interval timer synchronized with desktop notifications.

---

### 2.9. Infinite Whiteboard & Diagrams
- **Source Paths**: `src/components/diagrams/`
- **Core Technology**: Tldraw v5 infinite canvas.
- **Architectural Highlights**:
  - Spatial thinking, mind mapping, architectural sketches, and freehand drawing integrated with note references.

---

### 2.10. Encrypted Files & Cloud Storage
- **Source Paths**: `src/services/drive/`, `src/components/files/`
- **Core Technology**: Google Drive REST API, OAuth 2.0 PKCE, Chunked AES-GCM.
- **Architectural Highlights**:
  - **Zero-Knowledge Cloud Backup**: Encrypted locally before transmission (`.enc` files).
  - **Resumable Chunked Transfers**: Fault-tolerant multi-megabyte uploads and downloads.

---

### 2.11. Personal Finance Ledger
- **Source Paths**: `src/components/finance/`
- **Core Technology**: Double-entry ledger schema, reactive category aggregation, Recharts SVG.
- **Architectural Highlights**:
  - Income, expense, and transfer records with categories, recurrent intervals, and monthly burn rate charts.
  - Encrypted on disk using the dedicated `finance_key`.

---

## 3. Cross-Module Communication & Event Bus

Modules remain loosely coupled by communicating through centralized store selectors and strongly typed custom events:

```
┌────────────────────────────────────────────────────────┐
│               CENTRAL EVENT & ACTION BUS               │
└──────────────────────────────────┬─────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
   [ Note Action ]          [ Flashcard Due ]        [ Media Playback ]
  - Create Flashcard       - Trigger Review         - Update Watch Progress
  - Link to Library        - Update FSRS State      - Sync Subtitle Marker
```

High-level modules consume domain utilities through abstract interfaces, ensuring that refactoring or upgrading an internal module implementation never triggers cascading failures across neighboring features.
