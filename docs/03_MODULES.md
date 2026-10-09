# 🧩 System Modules & Domain Architecture Reference

This document provides a comprehensive technical overview of the functional modules composing **Caderno**. Each module operates with clear architectural boundaries, dedicated domain models, and decoupled cryptographic keys while leveraging shared core infrastructure.

---

## 1. Module Capability & Security Matrix

| # | Module | Primary Responsibility | Encryption Key | Persistence Layer | External Engines |
| :- | :----- | :--------------------- | :------------- | :---------------- | :--------------- |
| **1** | **Notes & Editor** | Rich text writing, blocks, collaborative CRDT | `notes_key` | SQLite / IDB `pages` | TipTap, ProseMirror, Yjs |
| **2** | **Password Vault** | Credentials, passwords, card data | `vault_key` | SQLite / IDB `vault_items` | Web Crypto API, HIBP API |
| **3** | **Digital Library** | E-books, PDF research, highlights | `files_key` | SQLite / IDB `books` | EpubJS, PDF.js |
| **4** | **Culture & Media** | Cinema tracker, encrypted video player | `culture_key` | SQLite / Filesystem | FFmpeg, yt-dlp, Axum |
| **5** | **Anki & Flashcards** | Spaced repetition study decks | `anki_key` | SQLite / IDB `anki_cards` | FSRS-4.5 Algorithm, Gemini AI |
| **6** | **AI Language Practice** | Conversational voice/chat study | `core_key` | SQLite / IDB `practice` | Gemini 2.0 Flash, Web Audio |
| **7** | **Focus & Lofi** | Ambient study environment, Pomodoro | `core_key` | SQLite / IDB `habits` | Web Audio API, Canvas |
| **8** | **Encrypted Files** | Zero-Knowledge cloud drive backups | `masterKey` | Google Drive (`.enc`) | Google Drive API, PKCE OAuth |
| **9** | **Finance Ledger** | Expense tracking, budgeting, cash flow | `finance_key` | SQLite / IDB `finance` | Chart rendering |

---

## 2. In-Depth Module Specifications

### 2.1. Notes & Rich Text Editor Engine
- **Source Paths**: `src/components/Editor.tsx`, `src/components/editor/`, `src/components/editor-extensions/`
- **Core Technology**: TipTap v3 (ProseMirror toolkit), `y-prosemirror`, Yjs CRDTs.
- **Architectural Highlights**:
  - **Custom ProseMirror Nodes**: Dynamic task lists, syntax-highlighted code blocks (`lowlight`), interactive tables, callouts, and mathematical formulas.
  - **Collaborative CRDT Document Model**: Multi-device synchronization without merge conflicts, powered by Yjs state vectors.
  - **Visual Revision History**: Snapshot diffing via `htmldiff-js`, allowing users to inspect word-level additions and deletions across historical versions.

---

### 2.2. Password & Credential Vault
- **Source Paths**: `src/components/vault/`, `src-tauri/src/cmd_vault.rs`
- **Core Technology**: Field-level AES-256-GCM encryption, Web Crypto API, k-Anonymity API.
- **Architectural Highlights**:
  - **Field-Level Isolation**: Sensitive fields (`password`, `notes`, `totp_secret`) are encrypted individually before database insertion.
  - **HIBP Compromise Detection**: Queries the *Have I Been Pwned* API using **k-Anonymity** (only the first 5 characters of the SHA-1 password hash are transmitted), preserving 100% credential privacy.
  - **Password Generator**: Cryptographically random generator (`crypto.getRandomValues`) with customizable character sets and Shannon entropy scoring.

---

### 2.3. Digital Library & Document Reader
- **Source Paths**: `src/components/library/`, `src/components/files/`
- **Core Technology**: EpubJS, PDF.js, Web Workers.
- **Architectural Highlights**:
  - **Multi-Format Support**: Seamless rendering of EPUB publications and PDF documents.
  - **Reading State Preservation**: Accurate Canonical Fragment Identifier (CFI) tracking for EPUBs and page indices for PDFs.
  - **Contextual Annotations**: Text selection anchors, multi-color highlighting, and inline note creation with cross-module search indexing.

---

### 2.4. Culture Tracker & Encrypted Cinema
- **Source Paths**: `src/components/video-player/`, `src/components/culture/`, `src-tauri/src/cmd_stream.rs`
- **Core Technology**: Proprietary ENC1 format, Axum loopback streaming, Service Worker, FFmpeg.
- **Architectural Highlights**:
  - **Chunked Video Streaming**: Encrypted 4K media playback with sub-second seek times using HTTP 206 byte-range chunk decryption (see [`04_VIDEO_STREAMING.md`](./04_VIDEO_STREAMING.md)).
  - **Dual-Platform Engine**: Axum internal HTTP server on Tauri Desktop; Service Worker (`sw.js`) pipeline on Web PWA.
  - **Subtitle Engine**: Real-time parser for `.vtt` and `.srt` subtitles with styling controls and audio track synchronization.

---

### 2.5. Spaced Repetition (Anki Engine)
- **Source Paths**: `src/components/anki/`, `src/services/fsrs.ts`
- **Core Technology**: Free Spaced Repetition Scheduler (FSRS-4.5) algorithm, Gemini AI.
- **Architectural Highlights**:
  - **Modern Cognitive Scheduling**: Implements FSRS-4.5, outperforming traditional SM-2 by optimizing memory stability ($S$) and retrievability ($R$).
  - **AI Deck Synthesis**: Integrates Google Gemini to automatically transform notes and web clippings into structured question-answer flashcard decks.
  - **Review Analytics**: Visual heatmap, retention curves, and daily forecast metrics.

---

### 2.6. AI Conversational Language Practice
- **Source Paths**: `src/components/practice/`, `src/services/gemini/`
- **Core Technology**: Google Gemini 2.0 Flash, Web Audio API, Push-to-Talk.
- **Architectural Highlights**:
  - **Real-Time Voice & Chat Interaction**: Dynamic foreign language conversational practice tailored to user proficiency levels.
  - **Long-Term Memory Extraction**: Background extraction of linguistic errors, vocabulary strengths, and personal facts to personalize subsequent sessions.
  - **Instant Feedback**: Grammar corrections, phonetic IPA transcriptions, and idiomatic collocation tips.

---

### 2.7. Focus & Ambient Productivity
- **Source Paths**: `src/components/focus/`, `src/services/lofi-manager.ts`
- **Core Technology**: Web Audio API, HTML5 Canvas, System Notification API.
- **Architectural Highlights**:
  - **Lofi Soundscapes**: Multi-track ambient sound generator (rain, cafe, vinyl, synth waves) with independent volume equalization.
  - **Pomodoro Cycles**: Customizable work/rest interval timer synchronized with the OS window title and native desktop notifications.

---

### 2.8. Encrypted Files & Cloud Storage
- **Source Paths**: `src/services/drive/`, `src/components/files/`
- **Core Technology**: Google Drive REST API, OAuth 2.0 PKCE, Chunked AES-GCM.
- **Architectural Highlights**:
  - **Zero-Knowledge Cloud Backup**: Encrypted locally before transmission. Google Drive receives only encrypted blobs (`.enc`) and has zero access to encryption keys.
  - **Resumable Chunked Transfers**: Efficient multi-megabyte uploads and downloads designed to tolerate transient network drops.

---

### 2.9. Personal Finance Ledger
- **Source Paths**: `src/components/finance/`
- **Core Technology**: Double-entry ledger schema, reactive category aggregation.
- **Architectural Highlights**:
  - **Structured Ledgers**: Income, expense, and transfer records with tags, recurrent intervals, and attachment receipts.
  - **Interactive Analytics**: Monthly burn rate, category breakdowns, and historical net-worth charts.
  - **Privacy Guarantee**: Encrypted on disk using the dedicated `finance_key`.

---

## 3. Cross-Module Communication & Event Bus

Modules remain loosely coupled by communicating through centralized store selectors (Zustand) and strongly typed custom events:

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
