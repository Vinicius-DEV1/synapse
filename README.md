# Synapse

<div align="center">

**Personal Knowledge Management, Cognitive Study Station & Zero-Knowledge Vault**

[![Platform](https://img.shields.io/badge/Platform-Desktop%20%7C%20Web%20%7C%20Mobile-blue?style=for-the-badge)](https://github.com/Vinicius-DEV1/synapse)
[![Tauri](https://img.shields.io/badge/Tauri-v2-FFC131?style=for-the-badge&logo=tauri&logoColor=black)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-2021_Edition-orange?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: BSL 1.1](https://img.shields.io/badge/License-BSL_1.1-indigo?style=for-the-badge)](./LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

<p align="center">
  A high-performance second brain and cognitive acceleration platform engineered with <strong>Zero-Knowledge end-to-end encryption</strong>, <strong>local-first data durability</strong>, and <strong>seamless multi-platform ubiquity</strong> across Linux, Windows, macOS, Web, and Mobile.
</p>

[🇧🇷 Leia a documentação em Português](./README.pt-BR.md) • [📚 Technical Documentation Hub](./docs/README.md) • [🤝 Contributing Guide](./CONTRIBUTING.md)

</div>

---

## 📑 Table of Contents

- [Vision & Core Philosophy](#-vision--core-philosophy)
- [Multi-Platform Support Matrix](#-multi-platform-support-matrix)
- [System Architecture Overview](#-system-architecture-overview)
- [Zero-Knowledge Security Architecture](#-zero-knowledge-security-architecture)
- [Proprietary ENC1 Video Streaming Architecture](#-proprietary-enc1-video-streaming-architecture)
- [Core Feature Modules](#-core-feature-modules)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Quick Start](#installation--quick-start)
  - [Running in Web Mode](#running-in-web-mode)
  - [Running in Desktop Mode (Tauri v2)](#running-in-desktop-mode-tauri-v2)
  - [Running with Docker (Self-Hosting)](#running-with-docker-self-hosting)
  - [Running the Mobile Companion](#running-the-mobile-companion)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Security & Responsible Disclosure](#-security--responsible-disclosure)
- [Community & Support](#-community--support)
- [Author & License](#-author--license)

---

## 💡 Vision & Core Philosophy

Modern personal knowledge management applications frequently force a compromise between **convenience** and **privacy**, or between **speed** and **rich features**. Synapse eliminates this trade-off based on five non-negotiable architectural pillars:

1. **Absolute Privacy & Zero-Knowledge by Default**: Your data belongs solely to you. All user content (notes, passwords, finance records, flashcards, uploaded media) is encrypted client-side using industry-standard **AES-256-GCM** before ever leaving your device. Cloud relays (Firebase / Google Drive) act strictly as blind storage relays—they never possess the decryption keys or view plaintext data.
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

---

## 🏛️ System Architecture Overview

Synapse is built upon a strict **4-tier layered architecture** (Presentation, Orchestration, Domain, and Platform Infrastructure) ensuring complete decoupling and multi-platform interchangeability:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SYNAPSE ARCHITECTURE                            │
├────────────────────────────────────────────────────────────────────────┤
│  PRESENTATION LAYER                                                    │
│  React 19  •  TypeScript 6.0  •  TailwindCSS  •  Radix UI  •  Lucide   │
├────────────────────────────────────────────────────────────────────────┤
│  RICH TEXT & COLLABORATION ENGINE                                      │
│  TipTap v3  •  ProseMirror  •  Yjs CRDTs  •  Lowlight  •  Mermaid.js    │
├────────────────────────────────────────────────────────────────────────┤
│  MULTI-PLATFORM ADAPTATION LAYER                                       │
│  window.api Contract  •  Platform Detector  •  Web / Desktop Bridge    │
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

For the comprehensive architectural blueprint and runtime boundary specifications, consult [**`docs/architecture/overview.md`**](./docs/architecture/overview.md).

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

For security policies and vulnerability reporting procedures, refer to [**`SECURITY.md`**](./SECURITY.md).

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
2. **Desktop Implementation (Tauri + Rust)**: An internal asynchronous **Axum HTTP server** listens on a local loopback port, decrypts requested byte ranges on the fly, and streams `Bytes` with zero RAM accumulation.
3. **Web Implementation (PWA + Service Worker)**: When running in a browser, `sw.js` intercepts video fetch requests, fetches encrypted byte ranges from Google Drive, decrypts them with the native **Web Crypto API**, and streams chunks directly via a `ReadableStream`.

For complete byte calculation mathematics and container specifications, see [**`docs/protocols/enc1-streaming.md`**](./docs/protocols/enc1-streaming.md).

---

## 📦 Core Feature Modules

### 1. 📝 Synapse Notes (Rich-Text Writing & Second Brain Engine)
- Full-featured TipTap v3 / ProseMirror block editor with rich text, code syntax highlighting (`lowlight`), dynamic LaTeX math formulas, tables, and task checklists.
- Dynamic hierarchical note tree with drag-and-drop reorganization (`@dnd-kit`) and bidirectional link graphing.
- Conflict-free real-time collaboration and multi-device synchronization powered by **Yjs CRDTs**.
- Visual version history with granular revision diffing (`htmldiff-js`).

### 2. 🔐 Vault (Zero-Knowledge Credentials & Passwords)
- Military-grade password and credential vault secured with zero-knowledge AES-256-GCM.
- High-entropy password and passphrase generator with Shannon entropy evaluation.
- Breached credential verification via Have I Been Pwned (HIBP) k-Anonymity API integration.

### 3. 🧠 Anki & Spaced Repetition (FSRS Engine)
- Modern Free Spaced Repetition Scheduler (`ts-fsrs` v5) calculating cognitive memory stability and retrievability curves.
- Deck management with tag filtering, review scheduling, and performance retention analytics.
- Automated AI flashcard generation directly from lecture notes or video transcripts.

### 4. 🎯 Interactive Question Batteries & Focus Exam Solver
- Zen full-canvas distraction-free question solving environment designed for deep cognitive focus.
- Keyboard-first navigation (`A`, `B`, `C`, `D`, `Enter`, `Esc`) for zero-mouse fatigue.
- In-depth answer explanations, gabarito toggles, and instant feedback.

### 5. 📚 Digital Library & Document Reader (PDF & EPUB)
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
- Integrated ambient Lo-Fi audio player (rain, vinyl, synth waves) for immersive flow-state work.

### 10. 📁 Cloud Drive & Encrypted File Vault
- Personal cloud drive interface for arbitrary documents, images, and archives, encrypted before leaving the client.

### 11. 💰 Personal Finance Tracker
- Clean expense and income registry with categorical budgeting.
- Interactive financial charts and spending trends powered by **Recharts**.

For full module details, domain models, and key assignments, explore [**`docs/modules/index.md`**](./docs/modules/index.md).

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `18.0+` (Node 20 or 22 LTS recommended)
- **Package Manager**: `npm` (v9+)
- **Rust Toolchain**: `1.77.2+` (Required only for Desktop/Tauri development; install via [rustup.rs](https://rustup.rs/))
- **Docker**: Docker Engine 24+ & Docker Compose v2 (Optional, for containerized self-hosting)

---

### Installation & Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Vinicius-DEV1/synapse.git
   cd synapse
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables (Optional)**:
   ```bash
   cp .env.example .env
   ```
   *Note: Synapse functions 100% offline without any API keys or configuration.*

---

### Running in Web Mode

Launches the web client with instant Vite Hot Module Replacement (HMR):
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

### Running in Desktop Mode (Tauri v2)

Make sure you have installed the Rust toolchain and platform build dependencies (e.g. `build-essential`, `libwebkit2gtk-4.1-dev` on Linux).

```bash
# Run in desktop development mode with live reload
npm run tauri dev

# Compile an optimized native desktop binary
npm run tauri build
```

Installers are generated in `src-tauri/target/release/bundle/` (`.deb`, `.AppImage`, `.msi`, `.exe`, `.dmg`).

---

### Running with Docker (Self-Hosting)

Synapse includes a multi-stage `Dockerfile` and `docker-compose.yml` for self-hosting on homelabs, VPS, or NAS:

```bash
# Build and run the production container in the background
docker compose up -d --build

# View container logs
docker compose logs -f

# Stop the container
docker compose down
```

Once running, access Synapse Web at `http://localhost:8080`. For advanced configuration, consult [**`docs/guides/docker-self-hosting.md`**](./docs/guides/docker-self-hosting.md).

---

### Running the Mobile Companion

Synapse includes an Expo-powered mobile companion shell in `caderno-mobile-webview`:

```bash
cd caderno-mobile-webview
npm install

# Start Expo development server
npm run start

# Launch on Android Emulator or connected device
npm run android
```

---

## 🧪 Testing & Quality Assurance

Synapse enforces strict software engineering principles (SOLID, strict type safety, zero `any`) verified through automated tests:

```bash
# Run fast targeted tests (sub-second feedback)
npx vitest run src/services/crypto.test.ts

# Run tests related to modified files
npx vitest related --run src/services/crypto.ts

# Verify strict TypeScript type integrity without emitting code
npx tsc -b --noEmit

# Lint code style and best practices
npm run lint
```

For testing standards and PR guidelines, consult [**`CONTRIBUTING.md`**](./CONTRIBUTING.md).

---

## 🛡️ Security & Responsible Disclosure

Security vulnerabilities and cryptographic concerns should be reported through our private advisory channels. See [**`SECURITY.md`**](./SECURITY.md) for full disclosure policies and response SLAs.

---

## 💬 Community & Support

- **Bug Reports & Issues**: [GitHub Issues](https://github.com/Vinicius-DEV1/synapse/issues)
- **Feature Requests & Ideas**: [GitHub Discussions](https://github.com/Vinicius-DEV1/synapse/discussions)
- **Release History**: [CHANGELOG.md](./CHANGELOG.md)

---

## 👤 Author & License

Developed and engineered with precision by **Vinicius Calado** ([@Vinicius-DEV1](https://github.com/Vinicius-DEV1)).

Licensed under the **Business Source License 1.1 (BSL 1.1)**.
Free for all non-commercial personal knowledge management, study, research, and non-commercial self-hosted personal use. Commercial deployment, SaaS resale, and proprietary closed-source redistribution are strictly prohibited without an explicit commercial license. Converts to **GNU General Public License v3.0 or later (GPL-3.0-or-later)** on 2030-01-01.

See the [**`LICENSE`**](./LICENSE) file for complete terms and conditions.

Copyright (c) 2026 Vinicius Calado ([@Vinicius-DEV1](https://github.com/Vinicius-DEV1)). All rights reserved.
