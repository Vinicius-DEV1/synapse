# 📚 Synapse Technical Documentation Hub

Welcome to the **Synapse Engineering Documentation Hub**. This directory provides architectural blueprints, system specifications, development workflows, and protocol references for the Synapse platform.

Synapse is a privacy-first, offline-capable hybrid **Desktop (Tauri v2 / Rust)** and **Web (React 19 / TypeScript / Vite)** personal knowledge operating system. It features **Zero-Knowledge End-to-End Encryption (E2EE)**, real-time **CRDT collaboration (Yjs)**, chunked **AES-256-GCM encrypted media streaming (ENC1)**, and an integrated **FSRS spaced repetition engine**.

---

## 🗺️ Documentation Sitemap

| Category | Document | Title | Description | Target Audience |
| :------- | :------- | :---- | :---------- | :-------------- |
| **Architecture** | [**`architecture/overview.md`**](./architecture/overview.md) | **System Architecture Specification** | 4-tier layered architecture, hybrid Tauri/Web runtime boundaries, Two-Tier Keychain cryptographic hierarchy, and CRDT synchronization topology. | Architects, Tech Leads, Security Auditors |
| **Architecture** | [**`architecture/sync-engine.md`**](./architecture/sync-engine.md) | **Sync & Zero-Lock Autosave Engine** | Multiplatform synchronization architecture, zero-locking autosave pipeline, dirty-table targeted pushes, and mutex queueing. | Cloud Engineers, Core Contributors, Mobile Specialists |
| **Guides** | [**`guides/setup-and-build.md`**](./guides/setup-and-build.md) | **Setup, Build & Operations Guide** | Development environment prerequisites, multiplatform build steps (Linux/macOS/Windows), CI/CD verification gates, and production bundling. | Developers, DevOps, QA Engineers |
| **Guides** | [**`guides/docker-self-hosting.md`**](./guides/docker-self-hosting.md) | **Docker Self-Hosting Guide** | Complete manual for deploying containerized Synapse Web on homelabs, VPS, and cloud servers using Docker & Compose. | Homelabbers, DevOps, Self-Hosters |
| **Modules** | [**`modules/index.md`**](./modules/index.md) | **System Modules & Domain Architecture** | Comprehensive architectural breakdown of all 13 core functional modules (Synapse Notes, Vault, Library, Culture, Anki, Exam Solver, etc.). | Feature Engineers, Core Contributors |
| **Modules** | [**`modules/notes.md`**](./modules/notes.md) | **Synapse Notes Architecture** | TipTap v3 ProseMirror schemas, dynamic LaTeX, task lists, and Yjs CRDT real-time collaboration. | Frontend & Rich-Text Engineers |
| **Modules** | [**`modules/vault.md`**](./modules/vault.md) | **Password & Credential Vault** | Field-level AES-256-GCM encryption, Shannon entropy generator, and Have I Been Pwned k-Anonymity breach detection. | Security Engineers & Cryptographers |
| **Modules** | [**`modules/anki-fsrs.md`**](./modules/anki-fsrs.md) | **Spaced Repetition & FSRS Engine** | Modern DSR memory model, rating curves vs legacy SM-2, and Gemini AI automated card synthesis. | AI & Learning Specialists |
| **Protocols** | [**`protocols/enc1-streaming.md`**](./protocols/enc1-streaming.md) | **Encrypted Media Streaming (ENC1 Protocol)** | Detailed specification of the proprietary ENC1 container format, HTTP 206 byte-range calculation mathematics, Axum Rust streaming, and Service Worker pipelines. | Systems Engineers, Security Auditors |
| **RFCs** | [**`rfcs/RFC-001-contextual-vocabulary.md`**](./rfcs/RFC-001-contextual-vocabulary.md) | **RFC-001: Contextual Vocabulary Extraction** | Formal Request for Comments proposing database schemas, UI workflows, FSRS scheduling integration, and Gemini AI pipeline for vocabulary learning. | Product Engineers, AI Specialists |

> [!TIP]
> **Engineering Skills & Playbooks**: For automated multi-agent quality playbooks, security checklists, and refactoring guides, explore the [`.agents/skills/`](../.agents/skills/README.md) directory.

---

## 🏛️ High-Level System Architecture

Synapse employs a **Zero-Knowledge, Multiplatform Hybrid Model** designed to run either as a standalone native Desktop application or as a Progressive Web Application (PWA):

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER (REACT 19)                       │
│  TailwindCSS Design System  │  TipTap (ProseMirror)  │  Radix UI  │  Lucide   │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼────────────────────────────────────────┐
│                        ORCHESTRATION & STATE MANAGEMENT                       │
│    React Context + Reducers     │     Custom Domain Hooks    │    Yjs CRDT    │
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
3. **Sub-16ms Frame Budgets & Smooth Fluidity**:
   - CSS-driven GPU compositing for hover/active states prevents JavaScript render thrashing.
   - Algorithmic pre-indexing ($O(1)$ Hash Maps) ensures zero slowdowns even with tens of thousands of notes and flashcards.
4. **Resilient Offline-First Synchronization**:
   - Local operations succeed immediately without network roundtrips. Changes synchronize via Conflict-Free Replicated Data Types (Yjs CRDTs) and Google Drive encrypted archives.

---

## 🛠️ Technology Stack Matrix

| Domain | Desktop Environment | Web / PWA Environment |
| :----- | :------------------ | :-------------------- |
| **Language** | Rust 2021 + TypeScript 6.0 | TypeScript 6.0 |
| **UI Framework** | React 19 + Vite 8 | React 19 + Vite 8 |
| **Styling** | TailwindCSS + CSS GPU Compositing | TailwindCSS + CSS GPU Compositing |
| **Rich Text Engine** | TipTap v3 (ProseMirror) + Yjs | TipTap v3 (ProseMirror) + Yjs |
| **Persistence** | SQLite (`rusqlite`) | IndexedDB (`idb` v8) |
| **Cryptography** | `aes-gcm 0.10`, `pbkdf2 0.12`, `sha2 0.10` | Web Crypto API (`crypto.subtle`) |
| **Media Engine** | FFmpeg / yt-dlp native binaries | `@ffmpeg/ffmpeg` WebAssembly |
| **Platform Shell** | Tauri v2 (`@tauri-apps/api`) | Browser Modern Standards / Service Worker |
| **Spaced Repetition** | Free Spaced Repetition Scheduler (`ts-fsrs` v5) | Free Spaced Repetition Scheduler (`ts-fsrs` v5) |
| **AI Integration** | Google Gemini API (Flash 2.0 / Pro) | Google Gemini API (Flash 2.0 / Pro) |
