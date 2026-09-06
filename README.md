# Synapse

<div align="center">

**Personal Knowledge Management, Cognitive Study Station & Zero-Knowledge Vault**

[![Platform](https://img.shields.io/badge/Platform-Desktop%20%7C%20Web%20%7C%20Mobile-blue?style=for-the-badge)](https://github.com/Vinicius-DEV1/synapse)
[![Tauri](https://img.shields.io/badge/Tauri-v2-FFC131?style=for-the-badge&logo=tauri&logoColor=black)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-2021_Edition-orange?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Firebase](https://img.shields.io/badge/Firebase-E2EE_Sync-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

<p align="center">
  A high-performance second brain and cognitive acceleration platform engineered with <strong>Zero-Knowledge end-to-end encryption</strong>, <strong>local-first data durability</strong>, and <strong>seamless multi-platform ubiquity</strong> across Linux, Windows, macOS, Web, and Mobile.
</p>

</div>

---

## 📑 Table of Contents

- [Vision & Core Philosophy](#-vision--core-philosophy)
- [Multi-Platform Support Matrix](#-multi-platform-support-matrix)
- [Technology Stack & Architectural Rationale](#-technology-stack--architectural-rationale)
  - [Frontend & User Interface](#1-frontend--user-interface)
  - [Editor & Collaboration Engine](#2-editor--collaboration-engine)
  - [Desktop Backend & Native Runtime (Tauri v2 + Rust)](#3-desktop-backend--native-runtime-tauri-v2--rust)
  - [Cloud, Persistence & Synchronization](#4-cloud-persistence--synchronization)
  - [Containerization & Self-Hosting (Docker)](#5-containerization--self-hosting-docker)
  - [Cognitive Learning, Media & AI Systems](#6-cognitive-learning-media--ai-systems)
- [Zero-Knowledge Security Architecture](#-zero-knowledge-security-architecture)
- [Proprietary ENC1 Video Streaming Architecture](#-proprietary-enc1-video-streaming-architecture)
- [Core Feature Modules](#-core-feature-modules)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Environment Setup](#installation--environment-setup)
  - [Running in Web Mode](#running-in-web-mode)
  - [Running in Desktop Mode (Tauri)](#running-in-desktop-mode-tauri)
  - [Running with Docker & Docker Compose](#running-with-docker--docker-compose)
  - [Running the Mobile Companion (Expo)](#running-the-mobile-companion-expo)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Author & License](#-author--license)

---

## 💡 Vision & Core Philosophy

Modern personal knowledge management applications frequently force a compromise between **convenience** and **privacy**, or between **speed** and **rich features**. Synapse eliminates this trade-off based on five non-negotiable architectural pillars:

1. **Absolute Privacy & Zero-Knowledge by Default**: Your data belongs solely to you. All user content (notes, passwords, finance records, flashcards, uploaded media) is encrypted client-side using industry-standard **AES-256-GCM** before ever leaving your device. Cloud servers (Firebase / Google Drive) act strictly as blind storage relays—they never possess the decryption keys or view plaintext data.
2. **Local-First & Offline Resilience**: The application reads and writes immediately to zero-latency local databases (**SQLite** on Desktop, **IndexedDB** on Web). You can work continuously without internet connectivity, and changes reconcile deterministically when reconnected.
3. **Microsecond Perceived Latency (Zero-Lag UI)**: Engineered following Stale-While-Revalidate (SWR) caching and GPU-accelerated CSS interactions, preventing unnecessary React re-renders and maintaining 60 FPS transitions across all workflows.
4. **Native Efficiency Over Web Bloat**: By leveraging **Tauri v2 and Rust** instead of heavyweight Electron wrappers, Synapse consumes a fraction of memory (~30–50 MB RAM vs 300+ MB) with binary sizes ~10x smaller.
5. **Cognitive Acceleration**: Integrated with the cutting-edge **FSRS** (Free Spaced Repetition Scheduler) algorithm and contextual **Google Gemini AI**, turning passive note-taking into an active learning powerhouse.

---

## 🌐 Multi-Platform Support Matrix

Synapse is architected with a unified codebase capable of running across desktop operating systems, standard web browsers, self-hosted containers, and mobile devices:

| Platform | Target Runtime | Persistence Engine | Native Capabilities | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Linux** (Desktop) | Tauri v2 / WebKitGTK / Rust | Native SQLite (`rusqlite`) | Direct filesystem, local HTTP streaming (`axum`), native FFmpeg / yt-dlp | **Production** |
| **Windows** (Desktop) | Tauri v2 / WebView2 / Rust | Native SQLite (`rusqlite`) | Direct filesystem, local HTTP streaming (`axum`), Windows shell integration | **Production** |
| **macOS** (Desktop) | Tauri v2 / WebKit / Rust | Native SQLite (`rusqlite`) | Direct filesystem, local HTTP streaming (`axum`), Apple Silicon native binary | **Production** |
| **Web / PWA** (Browser) | Modern Browsers (Chromium, Firefox, Safari) | IndexedDB (`idb`) | Service Worker (`sw.js`) on-the-fly streaming decryption, Web Crypto API | **Production** |
| **Docker / Self-Hosted** | Linux Containers (Alpine + Nginx) | IndexedDB + Cloud Sync | Completely self-contained static web hosting with custom security headers | **Production** |
| **Mobile Companion** | React Native 0.81 / Expo SDK 54 | IndexedDB + Offline Cache | Native haptics (`expo-haptics`), hardware back-button routing, Safe Area insets | **Active Beta** |
| **Mobile Native** | Tauri v2 Mobile (Android & iOS) | Native SQLite | Direct Rust compilation on iOS / Android via Tauri mobile toolchain | **Roadmap** |

---

## 🛠️ Technology Stack & Architectural Rationale

Every single technology in the Synapse ecosystem was deliberately selected to fulfill specific performance, security, and developer ergonomics criteria:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SYNAPSE ARCHITECTURE                            │
├────────────────────────────────────────────────────────────────────────┤
│  PRESENTATION LAYER                                                    │
│  React 19  •  TypeScript  •  TailwindCSS  •  Radix UI  •  Lucide Icons │
├────────────────────────────────────────────────────────────────────────┤
│  RICH TEXT & COLLABORATION ENGINE                                      │
│  TipTap v3  •  ProseMirror  •  Yjs CRDTs  •  Lowlight  •  Mermaid.js    │
├────────────────────────────────────────────────────────────────────────┤
│  MULTI-PLATFORM ADAPTATION LAYER                                       │
│  IStorageService  •  Platform Detector  •  Web / Desktop Polymorphism  │
├──────────────────────────────────┬─────────────────────────────────────┤
│  DESKTOP RUNTIME (Tauri v2)      │  WEB & PWA RUNTIME                  │
│  Rust 2021  •  Tokio  •  Axum    │  Vite 8  •  Service Worker (sw.js)  │
│  Rusqlite (SQLite)  •  PBKDF2    │  IndexedDB (idb)  •  WebCrypto API  │
│  AES-256-GCM  •  FFmpeg/yt-dlp   │  WebAssembly (FFmpeg / Tesseract)   │
├──────────────────────────────────┴─────────────────────────────────────┤
│  ZERO-KNOWLEDGE STORAGE & CLOUD BACKBONE                               │
│  Firebase Firestore (E2EE)  •  Google Drive API (Resumable OAuth2 PKCE)│
├────────────────────────────────────────────────────────────────────────┤
│  DEVOPS & CONTAINERIZATION                                             │
│  Docker  •  Docker Compose  •  Nginx Alpine Multi-Stage Build          │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Frontend & User Interface

- **React 19 (`^19.2.6`)**:
  - *Why Chosen*: Harnesses the newest React concurrent rendering engine, optimized transition hooks (`useTransition`, `useDeferredValue`), and seamless component lifecycle coordination, ensuring heavy UI state transitions (such as switching from a 2,000-block note to an interactive PDF reader) remain silky smooth without locking the main thread.
- **TypeScript (`~6.0.2` / `~5.9.2`)**:
  - *Why Chosen*: Zero tolerance for untyped or fragile code. The codebase enforces strict type safety with discriminated unions, explicit function return types, and typed IPC bridge contracts, eliminating entire categories of runtime errors before compile time.
- **Vite (`^8.0.12`)**:
  - *Why Chosen*: Sub-millisecond Hot Module Replacement (HMR) and an ultra-fast Rollup-based production bundler with granular manual chunk splitting (`react-vendor`, `tiptap`, `epub`, `yjs`, `recharts`, `firebase`) to guarantee optimal browser caching and fast initial page loads.
- **TailwindCSS (`^3.4.19`)**:
  - *Why Chosen*: Pure utility-first CSS that compiles into an ultra-lean stylesheet. Enables GPU-accelerated styling (`transform`, `opacity`), zero-rerender CSS hover states (`group-hover`, `:hover`), and a distraction-free dark canvas (`zinc-950`) without the runtime overhead of CSS-in-JS libraries.
- **Radix UI & Floating UI**:
  - *Why Chosen*: Accessible, unstyled UI primitives paired with `@floating-ui/react` for collision-aware, mathematically precise contextual popovers, dropdowns, and formatting menus.
- **DnD Kit (`@dnd-kit/core`, `@dnd-kit/sortable`)**:
  - *Why Chosen*: Modern, lightweight, accessible drag-and-drop toolkit powering the nested hierarchical page tree, card reordering, and modal task interactions.
- **Recharts (`^3.9.2`)**:
  - *Why Chosen*: Declarative SVG-based chart library powering intuitive financial tracking and cognitive learning velocity dashboards.

---

### 2. Editor & Collaboration Engine

- **TipTap v3 (`^3.27.1`) & ProseMirror**:
  - *Why Chosen*: TipTap provides a headless, extensible abstraction over the battle-tested ProseMirror document model. It powers custom nodes including collapsible callouts, dynamic LaTeX math, syntax-highlighted code blocks, interactive task lists, inline tables, and link preview cards.
- **Yjs (`^13.6.31`, `y-prosemirror`, `@tiptap/y-tiptap`)**:
  - *Why Chosen*: Conflict-free Replicated Data Types (CRDTs). Yjs enables real-time collaborative document editing and conflict-free multi-device synchronization. Unlike naive "last-write-wins" approaches, Yjs guarantees that concurrent edits on different devices resolve mathematically without data loss.
- **Lowlight (`^3.3.0`) & Highlight.js (`^11.11.1`)**:
  - *Why Chosen*: Blazing-fast client-side syntax highlighting across dozens of programming languages within code blocks.
- **Mermaid.js (`^12.0.0`)**:
  - *Why Chosen*: Native markdown-driven diagramming directly inside notes (flowcharts, sequence diagrams, mind maps, class charts) rendered on the fly.
- **DOMPurify (`^3.4.12`)**:
  - *Why Chosen*: Enterprise-grade sanitization preventing Cross-Site Scripting (XSS) when rendering external HTML, imported snippets, or user-supplied content.
- **HTMLDiff-js (`^1.0.5`)**:
  - *Why Chosen*: Granular semantic text diffing for inspecting note revision histories side-by-side.

---

### 3. Desktop Backend & Native Runtime (Tauri v2 + Rust)

- **Tauri v2 (`^2.11.3`)**:
  - *Why Chosen over Electron*:
    - **Resource Footprint**: Typical memory consumption is only ~30–50 MB RAM, compared to Electron's 200–500+ MB baseline.
    - **Installer & Binary Size**: Produces native binaries ~15 MB, avoiding the need to ship a bundled Chromium browser and Node.js runtime.
    - **Security by Design**: Hardened capability system and isolated IPC bridge prevent direct arbitrary shell or filesystem execution from the webview context.
    - **Native OS WebViews**: Leverages WebKitGTK on Linux, Microsoft Edge WebView2 on Windows, and WKWebView on macOS.
- **Rust (2021 Edition)**:
  - *Why Chosen*: Unmatched execution speed, zero-cost abstractions, memory safety without a garbage collector, and first-class concurrency. Rust powers all heavy operations in Synapse:
    - **`rusqlite` (v0.31 bundled SQLite)**: Embedded relational database for zero-latency local queries, transactions, and full-text searches.
    - **`tokio` (v1.52) & `axum` (v0.7)**: High-performance asynchronous HTTP micro-server running locally on desktop to serve encrypted video streams on-demand via byte-range requests.
    - **`aes-gcm` (v0.10) & `pbkdf2` (v0.12)**: Native cryptographic primitives executing encryption operations at raw hardware speeds.
    - **`tauri-plugin-fs`, `tauri-plugin-dialog`, `tauri-plugin-shell`**: Secure native dialogs and controlled OS-level integration.
    - **Dynamic yt-dlp & FFmpeg integration**: Seamless local video downloading, subtitle extraction, and audio conversion.

---

### 4. Cloud, Persistence & Synchronization

- **Dual-Storage Architecture (SQLite + IndexedDB)**:
  - *Why Chosen*: Follows the **Liskov Substitution Principle (LSP)** via a unified `IStorageService` interface. The application seamlessly detects whether it is running inside Tauri Desktop (using native SQLite) or inside a Web browser (using IndexedDB via `idb`), providing 100% feature parity with identical data models.
- **Firebase (Firestore & Firebase Auth)**:
  - *Why Chosen*: Provides instantaneous real-time document synchronization and offline mutation queues across devices.
  - *Zero-Knowledge Privacy*: All documents and metadata synced to Firestore are **encrypted client-side with AES-256-GCM** before transmission. The cloud database stores exclusively encrypted blobs and nonces; no unencrypted user notes ever touch Firebase.
- **Google Drive API (OAuth2 with PKCE)**:
  - *Why Chosen*: Serves as an affordable, high-capacity personal cloud storage backbone for heavy media (video courses, large PDF/EPUB textbooks, and automated database backups).
  - *Security*: Employs OAuth2 with Proof Key for Code Exchange (PKCE) for secure token negotiation without embedding client secrets. Media is encrypted into the proprietary **ENC1** format before upload.

---

### 5. Containerization & Self-Hosting (Docker)

- **Docker & Docker Compose**:
  - *Why Chosen*:
    - **Self-Hosting Sovereignty**: Empowers users who wish to run their private instance of Synapse Web on their own infrastructure (VPS, Homelab, Raspberry Pi, or NAS such as Synology/TrueNAS) with zero cloud vendor lock-in.
    - **Reproducible Multi-Stage Builds**: A multi-stage `Dockerfile` uses Node 22 Alpine to compile the web bundle and Nginx Alpine to serve it, resulting in an ultra-lightweight, hardened image (~25 MB).
    - **Hardened Production Nginx**: Includes built-in gzip compression, security headers (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`), long-term static asset caching, and SPA fallback routing.

---

### 6. Cognitive Learning, Media & AI Systems

- **FSRS (Free Spaced Repetition Scheduler - `ts-fsrs` & Rust `anki_fsrs.rs`)**:
  - *Why Chosen*: Replaces the legacy 1980s SM-2 algorithm (used by classic Anki) with the modern, mathematically superior DSR (Difficulty, Stability, Retrievability) cognitive model. FSRS drastically reduces daily review fatigue while maintaining target memory retention rates.
- **Google Gemini AI Integration**:
  - *Why Chosen*: Deep contextual AI assistance across learning workflows:
    - **Workspace Chat**: Answers questions using the context of your notes and flashcards.
    - **Video & Lecture Distiller**: Transcribes and analyzes videos, generating targeted multi-choice quizzes and flashcards automatically.
    - **Conversational Language Immersion**: Interactive audio/chat tutor with persistent **Core Memory Fact Extraction**, adapting continuously to user progress.
    - **Link Info Distiller**: Generates instantaneous TL;DR summaries, key takeaways, and metadata for external web references with 0ms perceived local caching.
- **PDF.js (`pdfjs-dist`) & EpubJS (`epubjs`)**:
  - *Why Chosen*: In-browser and native document readers supporting dual-page mode, progress tracking, color highlights, and cover extraction.
- **Tesseract.js (`^7.0.0`)**:
  - *Why Chosen*: Client-side Optical Character Recognition (OCR) that extracts text directly from scanned documents, book captures, and images without sending sensitive documents to third-party OCR APIs.
- **Tldraw (`^5.2.5`)**:
  - *Why Chosen*: Embedded infinite canvas whiteboard for spatial thinking, mind mapping, diagramming, and freehand conceptualization.

---

## 🔐 Zero-Knowledge Security Architecture

Synapse was built from the ground up around **Zero-Knowledge** cryptographic principles:

```
User Master Password
        │
        ▼ (PBKDF2-HMAC-SHA256 • 600,000 Iterations + Salt)
Ephemeral Master Key (Stored ONLY in volatile RAM / Zeroized on lock)
        │
        ├──▶ Decrypts Keychain ──▶ Module Keys (Notes, Vault, Finance, Files)
        │
        └──▶ AES-256-GCM (12-byte CSPRNG IV + 128-bit Auth Tag)
                 │
                 ├──▶ Local Storage (SQLite / IndexedDB) [Encrypted at Rest]
                 └──▶ Cloud Sync (Firebase / Google Drive) [Encrypted in Transit & Cloud]
```

### Cryptographic Standards

| Mechanism | Standard | Security Guarantee |
| :--- | :--- | :--- |
| **Key Derivation** | **PBKDF2-HMAC-SHA256** | 600,000 iterations with a cryptographically secure random salt, providing brute-force resistance exceeding OWASP recommendations. |
| **Symmetric Cipher** | **AES-256-GCM** | Authenticated encryption with associated data (AEAD) using unique 96-bit (12-byte) IVs generated by a CSPRNG for every encryption cycle. |
| **Data Integrity** | **128-bit Auth Tag** | Instant rejection and detection of any tampering or ciphertext corruption (*wire format*: `iv:auth_tag:ciphertext`). |
| **Two-Tier Keychain** | **Master + Module Keys** | Individual encryption keys per module (Notes, Passwords, Media, Finance) sealed by the Master Key in the keychain. |
| **Memory Hygiene** | **`auth_lock` / Zeroize** | All master cryptographic keys reside solely in volatile RAM (Rust memory or window memory) and are safely zeroed out upon session timeout or manual lock. |
| **XSS Defense** | **DOMPurify & Strict CSP** | Strict sanitization of all dynamic inputs and rigorous Content Security Policy in both Tauri desktop and Web builds. |

---

## 🎥 Proprietary ENC1 Video Streaming Architecture

Streaming multi-gigabyte encrypted study videos inside HTML5 `<video>` tags presents a massive challenge: standard decryption requires loading the entire file into RAM, which causes browser crashes on large files.

Synapse solves this via the custom **ENC1 Container Format**:

```
ENC1 File Format:
┌──────────────┬─────────────────────────┬─────────────────────────┬──────────────────────┐
│ Header (16B) │ Chunk 0 (IV + Cipher)   │ Chunk 1 (IV + Cipher)   │ Chunk N ...          │
│ Magic: "ENC1"│ 12B IV + AES-256-GCM    │ 12B IV + AES-256-GCM    │ 12B IV + AES-256-GCM │
│ Size: 8B     │ Tag: 16B • Data: ~1MB   │ Tag: 16B • Data: ~1MB   │ Tag: 16B • Data: ~1MB│
│ ChunkSz: 4B  │                         │                         │                      │
└──────────────┴─────────────────────────┴─────────────────────────┴──────────────────────┘
```

1. **Random-Access Seeking**: Because each ~1 MB chunk has an independent IV and authentication tag, the video player can seek (`Range: bytes=X-Y`) to any timestamp instantly without decrypting the entire file.
2. **Desktop Implementation (Tauri + Rust)**:
   - An internal asynchronous **Axum HTTP server** listens on a random local loopback port.
   - When the HTML5 video player requests a byte range, Rust reads the corresponding encrypted chunks from disk, decrypts them on the fly using `crypto_stream.rs`, and streams `Bytes` into the response body with zero RAM accumulation.
3. **Web Implementation (PWA + Service Worker)**:
   - When running in a web browser without Tauri, `sw.js` intercepts video fetch requests.
   - The Service Worker fetches encrypted byte ranges from Google Drive, decrypts them in chunks using the native **Web Crypto API** (`crypto.subtle.decrypt`), and streams plaintext chunks directly to the video element via a `ReadableStream`.

---

## 📦 Core Feature Modules

### 1. 📝 Caderno (Notes & Second Brain)
- Full-featured TipTap/ProseMirror block editor with rich text, code syntax highlighting, dynamic LaTeX math formulas, tables, and task checklists.
- Dynamic hierarchical note tree with drag-and-drop reorganization and bidirectional link graphing.
- Conflict-free real-time collaboration and synchronization powered by **Yjs CRDTs**.
- Visual version history with revision diffing (`htmldiff-js`).

### 2. 🔐 Vault (Zero-Knowledge Credentials & Passwords)
- Military-grade password and credential vault secured with zero-knowledge AES-256-GCM.
- High-entropy password and passphrase generator with security strength evaluation.
- Breached credential verification via Have I Been Pwned (HIBP) k-Anonymity API integration.

### 3. 🧠 Anki & Spaced Repetition (FSRS Engine)
- Modern Free Spaced Repetition Scheduler (FSRS) calculating cognitive memory stability and retrievability curves.
- Deck management with tag filtering, review scheduling, and performance retention analytics.
- Automated AI flashcard generation directly from lecture notes or video transcripts.

### 4. 🎯 Interactive Question Batteries & Focus Exam Solver
- Zen full-canvas distraction-free question solving environment designed for deep focus.
- Keyboard-first navigation (`A`, `B`, `C`, `D`, `Enter`, `Esc`) for zero-mouse fatigue.
- In-depth answer explanations and instant feedback.

### 5. 📚 Library & Document Reader (PDF & EPUB)
- Native-feeling PDF reader (`pdfjs-dist`) and EPUB book engine (`epubjs`).
- Dual-page view, reading progress tracking, colored margin highlights, and bookmarks.
- On-device text extraction from scanned documents and book captures using **Tesseract OCR**.

### 6. 🎬 Culture & Video Study Studio
- Encrypted ENC1 high-definition video player with subtitle synchronization (VTT/SRT).
- Integrated YouTube downloader and audio extractor (`yt-dlp` / `ffmpeg`).
- Interactive subtitle-based vocabulary acquisition with one-click flashcard extraction.

### 7. 🗣️ Language Immersion Practice (Gemini AI)
- Conversational foreign language simulation with speech and chat interfaces.
- **Core Memory Fact Extraction**: The AI dynamically recalls past user conversations, vocabulary struggles, and factual context.

### 8. 🎨 Infinite Diagrams & Whiteboard (Tldraw)
- Embedded infinite canvas powered by **Tldraw** for visual concept mapping, mind mapping, and architectural sketches.

### 9. ⏱️ Focus & Ambient Lo-Fi Studio
- Customizable Pomodoro and productivity countdown timers.
- Integrated ambient Lo-Fi audio player for immersive flow-state work.

### 10. 📁 Cloud Drive & Encrypted File Vault
- Personal cloud drive interface for arbitrary documents, images, and archives, encrypted before leaving the client.

### 11. 💰 Personal Finance Tracker
- Clean expense and income registry with categorical budgeting.
- Interactive financial charts and spending trends powered by **Recharts**.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `18.0+` (Node 22 LTS recommended)
- **Package Manager**: `npm` (v9+)
- **Rust Toolchain**: `1.77.2+` (Required only for Desktop/Tauri development)
- **Docker**: Docker Engine 24+ & Docker Compose v2 (Optional, for containerized self-hosting)

---

### Installation & Environment Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Vinicius-DEV1/synapse.git
   cd synapse
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Populate `.env` with your Firebase and Google Cloud credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_GOOGLE_DRIVE_CLIENT_ID=your_google_oauth_client_id
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```

---

### Running in Web Mode

Launches the web client with instant Vite HMR:
```bash
npm run dev
```
Navigate to `http://localhost:35174` in your browser.

To produce an optimized production web build:
```bash
npm run build:web
```
The output will be placed in the `dist-web` directory.

---

### Running in Desktop Mode (Tauri)

Make sure you have installed the Rust toolchain ([rustup.rs](https://rustup.rs/)) and standard platform build tools (`build-essential`, `libwebkit2gtk-4.1-dev`, etc. on Linux).

```bash
# Run in development mode with live reload
npm run tauri dev

# Compile an optimized native desktop binary
npm run tauri build
```

---

### Running with Docker & Docker Compose

Synapse includes a multi-stage `Dockerfile` and `docker-compose.yml` for zero-friction self-hosting:

```bash
# Build and run the production container in the background
docker compose up -d --build

# View container logs
docker compose logs -f

# Stop the container
docker compose down
```

Once running, access Synapse Web at `http://localhost:8080`.

---

### Running the Mobile Companion (Expo)

Synapse includes an Expo-powered mobile companion shell in `caderno-mobile-webview`:

```bash
cd caderno-mobile-webview
npm install

# Start the Expo development server
npm run start

# Launch on Android Emulator or connected device
npm run android

# Launch on iOS Simulator (macOS only)
npm run ios
```

---

## 🧪 Testing & Quality Assurance

The project enforces strict software engineering principles (SOLID, strict type safety, zero `any`) verified through automated tests:

```bash
# Run unit and integration tests (Vitest)
npm test

# Run tests for a specific module
npx vitest run src/services/crypto.test.ts

# Verify strict TypeScript type integrity without emitting code
npx tsc -b --noEmit

# Lint code style and best practices
npm run lint
```

---

## 👤 Author & License

Developed and engineered with precision by **Vinicius Calado** ([@Vinicius-DEV1](https://github.com/Vinicius-DEV1)).

*Private and proprietary. All rights reserved.*
