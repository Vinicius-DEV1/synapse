# 📚 Caderno Technical Documentation Hub

Welcome to the **Caderno Engineering Documentation Hub**. This directory provides architectural blueprints, system specifications, development workflows, and protocol references for the Caderno platform.

Caderno is a privacy-first, offline-capable hybrid **Desktop (Tauri v2 / Rust)** and **Web (React 19 / TypeScript / Vite)** personal knowledge operating system. It features **End-to-End Encryption (E2EE)**, real-time **CRDT collaboration (Yjs)**, chunked **AES-256-GCM encrypted media streaming**, and an integrated **FSRS spaced repetition engine**.

---

## 🗺️ Documentation Sitemap

| Document | Title | Description | Target Audience |
| :------- | :---- | :---------- | :-------------- |
| [**`01_ARCHITECTURE.md`**](./01_ARCHITECTURE.md) | **System Architecture Specification** | 4-tier layered architecture, hybrid Tauri/Web runtime boundaries, Two-Tier Keychain cryptographic hierarchy, and CRDT synchronization topology. | Architects, Tech Leads, Recruiters |
| [**`02_SETUP_AND_BUILD.md`**](./02_SETUP_AND_BUILD.md) | **Setup, Build & Operations Guide** | Development environment prerequisites, multiplatform build steps (Linux/macOS/Windows), CI/CD verification gates, and production bundling. | Developers, DevOps, QA Engineers |
| [**`03_MODULES.md`**](./03_MODULES.md) | **System Modules & Domain Architecture** | Comprehensive architectural breakdown of all 9 core functional modules (Notes, Vault, Library, Culture, Anki, Practice, Focus, Files, Finance). | Feature Engineers, Core Contributors |
| [**`04_VIDEO_STREAMING.md`**](./04_VIDEO_STREAMING.md) | **Encrypted Media Streaming (ENC1 Protocol)** | Detailed specification of the proprietary ENC1 container format, HTTP 206 byte-range calculation mathematics, Axum Rust streaming, and Service Worker web pipelines. | Systems Engineers, Security Auditors |
| [**`05_IDEAS_VOCABULARY.md`**](./05_IDEAS_VOCABULARY.md) | **RFC-001: Contextual Vocabulary Extraction** | Formal Request for Comments (RFC) proposing the database schemas, UI workflows, FSRS scheduling integration, and Gemini AI pipeline for contextual vocabulary learning. | Product Engineers, AI Specialists |

> [!TIP]
> **Engineering Skills & Playbooks**: For automated multi-agent quality playbooks, security checklists, and refactoring guides, explore the [`.agents/skills/`](../.agents/skills/README.md) directory.

---

## 🏛️ High-Level System Architecture

Caderno employs a **Zero-Knowledge, Multiplatform Hybrid Model** designed to run either as a standalone native Desktop application or as a Progressive Web Application (PWA):

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER (REACT 19)                       │
│  TailwindCSS Design System  │  TipTap (ProseMirror)  │  Radix UI  │  Lucide   │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼────────────────────────────────────────┐
│                        ORCHESTRATION & STATE MANAGEMENT                       │
│      Zustand Global Stores      │     Custom Domain Hooks    │    Yjs CRDT    │
└──────────────────┬────────────────────────────────────────┬───────────────────┘
                   │                                        │
┌──────────────────▼──────────────────┐  ┌──────────────────▼───────────────────┐
│     DESKTOP ENGINE (TAURI V2 / RUST) │  │         WEB PWA RUNTIME (BROWSER)    │
├─────────────────────────────────────┤  ├──────────────────────────────────────┤
│ • Local SQLite with WAL mode        │  │ • IndexedDB (`idb`) Local Database   │
│ • Custom `encrypted://` Protocol    │  │ • Native Web Crypto API (Subtle)     │
│ • Native FFmpeg & yt-dlp Processors │  │ • Service Worker (`sw.js`) Streaming │
│ • Axum Ephemeral Streaming Server   │  │ • Firebase Firestore Web Sync        │
│ • AES-256-GCM / PBKDF2 (Rust)       │  │ • Google Drive REST API (PKCE OAuth) │
└─────────────────────────────────────┘  └──────────────────────────────────────┘
```

---

## 🔒 Core Engineering Principles

1. **Zero-Knowledge Privacy at Rest & in Flight**:
   - Plaintext data never touches remote cloud servers or unencrypted disks when vault protection is active.
   - Master Keys are derived locally using PBKDF2 with HMAC-SHA256 (600,000 iterations) and are **never** persisted to storage.
2. **100% Functional & Visual Parity**:
   - The user interface, keyboard shortcuts, animations, and feature parity are identical across Desktop and Web surfaces.
3. **Sub-16ms Frame Budgets & Big Tech Performance**:
   - CSS-driven GPU compositing for hover/active states prevents JavaScript render thrashing.
   - Algorithmic pre-indexing ($O(1)$ Hash Maps) ensures zero slowdowns even with tens of thousands of notes and flashcards.
4. **Resilient Offline-First Synchronization**:
   - Local operations succeed immediately without network roundtrips. Changes synchronize via Conflict-Free Replicated Data Types (Yjs CRDTs) and Google Drive encrypted archives.

---

## 🛠️ Technology Stack Matrix

| Domain | Desktop Environment | Web / PWA Environment |
| :----- | :------------------ | :-------------------- |
| **Language** | Rust 2021 + TypeScript 5.8 | TypeScript 5.8 |
| **UI Framework** | React 19 + Vite | React 19 + Vite |
| **Styling** | TailwindCSS + CSS GPU Compositing | TailwindCSS + CSS GPU Compositing |
| **Rich Text Engine** | TipTap v3 (ProseMirror) + Yjs | TipTap v3 (ProseMirror) + Yjs |
| **Persistence** | SQLite (`rusqlite`) | IndexedDB (`idb` v8) |
| **Cryptography** | `aes-gcm 0.10`, `pbkdf2 0.12`, `sha2 0.10` | Web Crypto API (`crypto.subtle`) |
| **Media Engine** | FFmpeg / yt-dlp native binaries | `@ffmpeg/ffmpeg` WebAssembly |
| **Platform Shell** | Tauri v2 (`@tauri-apps/api`) | Browser Modern Standards / Service Worker |
| **Spaced Repetition** | Free Spaced Repetition Scheduler (FSRS) | Free Spaced Repetition Scheduler (FSRS) |
| **AI Integration** | Google Gemini API (Flash 2.0 / Pro) | Google Gemini API (Flash 2.0 / Pro) |
