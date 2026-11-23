# 📚 Synapse Technical Documentation Hub

Welcome to the **Synapse Engineering Documentation Hub**. This directory provides architectural blueprints, domain module specifications, security audits, operational guides, and protocol references for the **Synapse** platform.

Synapse is a local-first, multi-platform knowledge and study workstation spanning **React Web + Tauri v2 Desktop**, **Native Qt 6 Desktop**, **Native Kotlin/Compose Android**, and an **Expo/WebView Android Shell**, anchored by a unified Rust domain core (`core/synapse-core/`).

> [!IMPORTANT]
> **Authoritative Status & Audit Boundaries**: Local at-rest encryption and native client parity vary by target and data entity. Always consult [Documentation Ownership and Current Status](./documentation-status.md), the [Native Desktop Parity Matrix](./native-desktop-parity.md), and the [Native Encryption Audit](./security/native-encryption-audit.md) before making repository-wide completion or Zero-Knowledge claims.

---

## 🗺️ Documentation Directory & Sitemap

### 1. Core Governance & Status
| Document | Description | Audience |
| :--- | :--- | :--- |
| [**`documentation-status.md`**](./documentation-status.md) | **Documentation Ownership & Current Status** — Authoritative sources of truth, verified project status, and documentation maintenance rules. | All contributors & AI agents |
| [**`audits/mobile-android-parity/README.md`**](./audits/mobile-android-parity/README.md) | **React-to-Android Parity Checklist** — Current Compose coverage, shared Core/UniFFI boundary, detailed implementation queue, security gates, and next-agent handoff. | Android & Core contributors |
| [**`native-desktop-parity.md`**](./native-desktop-parity.md) | **Native Desktop Parity Matrix** — Module-by-module native Qt 6 coverage, verification evidence, and remaining differences vs. React. | Desktop & Qt contributors |

### 2. System Architecture (`docs/architecture/`)
| Document | Description | Audience |
| :--- | :--- | :--- |
| [**`architecture/overview.md`**](./architecture/overview.md) | **System Architecture Specification** — Four app targets, unified Rust core (`synapse-core`), platform bridges, WAL pool, and encryption boundaries. | Architects & Tech Leads |
| [**`architecture/repository-layout.md`**](./architecture/repository-layout.md) | **Repository Layout** — App ownership, shared-code boundaries, package manifests, and root build commands. | All contributors |
| [**`architecture/module-structure.md`**](./architecture/module-structure.md) | **Cross-Application Module Structure** — Canonical 18 module IDs, route inventory, and layer conventions across React, Qt, and Android. | Feature Engineers |
| [**`architecture/sync-engine.md`**](./architecture/sync-engine.md) | **Sync & Autosave Architecture** — Zero-locking autosave, transactional batch upserts, indexed delta queries, Yjs convergence, and table inventory. | Cloud & Core Engineers |
| [**`architecture/multiuser-workspace-action-plan.md`**](./architecture/multiuser-workspace-action-plan.md) | **Multi-User Workspace Proposal** — Proposed scoped subcollections, RBAC matrix, and key-sharing protocol (design proposal). | Product & Security Engineers |
| [**`architecture/multiuser-workspace-analysis.md`**](./architecture/multiuser-workspace-analysis.md) | **Historical Multi-User Workspace Audit** — 2026-11-17 snapshot analyzing legacy single-user sync assumptions. | Security Auditors |

### 3. Developer & Operations Guides (`docs/guides/`)
| Document | Description | Audience |
| :--- | :--- | :--- |
| [**`guides/setup-and-build.md`**](./guides/setup-and-build.md) | **Setup, Build & Operations Guide** — Prerequisites, multi-target build workflows (Web, Tauri, Qt 6, Android, WebView), and packaging. | Developers & DevOps |
| [**`guides/performance-and-benchmarks.md`**](./guides/performance-and-benchmarks.md) | **Performance Architecture & Benchmarking Guide** — SQLite WAL read pool, async IPC, bundle budgets (-82% boot preload), and benchmark commands. | Performance & Core Engineers |
| [**`guides/testing-and-quality.md`**](./guides/testing-and-quality.md) | **Testing & Quality Assurance Guide** — Sub-second targeted Vitest workflows, Cargo core/bridge test suites, Qt CTest, and Android instrumentation. | All Engineers & QA |
| [**`guides/docker-self-hosting.md`**](./guides/docker-self-hosting.md) | **Docker Self-Hosting Guide** — Multi-stage Nginx Alpine container deployment and reverse-proxy TLS configuration. | Self-Hosters & DevOps |

### 4. Domain Modules (`docs/modules/`)
| Document | Description | Audience |
| :--- | :--- | :--- |
| [**`modules/index.md`**](./modules/index.md) | **System Modules Catalog** — Overview of all 18 canonical product modules and their source locations across clients. | Feature Engineers |
| [**`modules/notes.md`**](./modules/notes.md) | **Synapse Notes Architecture** — TipTap v3 / ProseMirror schema, on-demand metadata hydration, lazy syntax highlighting, and Yjs CRDT compaction. | Frontend & Editor Engineers |
| [**`modules/anki-fsrs.md`**](./modules/anki-fsrs.md) | **Spaced Repetition & FSRS Engine** — Modern DSR cognitive memory model, review rating curves, and Gemini AI flashcard synthesis. | Learning & AI Engineers |
| [**`modules/vault.md`**](./modules/vault.md) | **Password & Credential Vault** — Two-Tier Keychain field encryption, Shannon entropy generator, and HIBP k-anonymity breach detection. | Security Engineers |
| [**`modules/mobile-android-finance.md`**](./modules/mobile-android-finance.md) | **Native Android Finance Module** — Jetpack Compose UI, UniFFI Rust bindings, local SQLite persistence, and explicit sync/encryption scope. | Android & Core Engineers |

### 5. Security, Protocols & RFCs (`docs/security/`, `docs/protocols/`, `docs/rfcs/`)
| Document | Description | Audience |
| :--- | :--- | :--- |
| [**`security/native-encryption-audit.md`**](./security/native-encryption-audit.md) | **Native Encryption Audit** — Verified cross-client encryption coverage, managed media recovery journal, and open plaintext data-at-rest gaps. | Security Auditors |
| [**`security/cloud-account-encryption-migration.md`**](./security/cloud-account-encryption-migration.md) | **Cloud Account Encryption Migration** — Firebase account sign-in, transactional key envelope rewrap, and safe legacy-removal gates. | Security & Cloud Engineers |
| [**`protocols/enc1-streaming.md`**](./protocols/enc1-streaming.md) | **Encrypted Media Container (ENC1)** — 16-byte header, 1 MiB AES-256-GCM chunk layout, random-access range math, and async protocol readers. | Systems Engineers |
| [**`rfcs/RFC-001-contextual-vocabulary.md`**](./rfcs/RFC-001-contextual-vocabulary.md) | **RFC-001: Contextual Vocabulary Extraction** — Formal proposal for one-click EPUB/PDF dictionary lookup to FSRS flashcard pipeline. | Product & AI Engineers |

### 6. Engineering Audits (`docs/audits/`)
| Document | Description | Audience |
| :--- | :--- | :--- |
| [**`audits/firebase-sync-integrity-2026-11-17/README.md`**](./audits/firebase-sync-integrity-2026-11-17/README.md) | **Firebase Sync Integrity Audit** — Scoped Firestore reconciliation (5,005 documents), decrypted readback verification, and SQLite migration checks. | Cloud & Data Auditors |

> [!TIP]
> **Agent Skills & Engineering Playbooks**: For operational playbooks covering refactoring, design system tokens, security audits, and type safety, see [`.agents/skills/README.md`](../.agents/skills/README.md) and the root [`AGENTS.md`](../AGENTS.md).

---

## 🏛️ High-Level System Architecture

| Product Target | App Directory | Primary Technology Stack | Persistence & Domain |
| :--- | :--- | :--- | :--- |
| **React Web + Tauri Desktop** | `apps/web-react/` | React 19, TypeScript 6, Vite 8, TailwindCSS, TipTap v3, Tauri v2 | SQLite WAL pool (1 writer + 4 readers) via `synapse-core` on Desktop; IndexedDB v29 + Firebase Firestore on Web |
| **Native Qt Desktop** | `apps/desktop-qt/` | Qt 6 Quick/QML, C++17 controllers, libmpv | SQLite WAL via `bridges/bridge-qt/` C-ABI to `synapse-core` |
| **Native Android** | `apps/mobile-android/` | Kotlin, Jetpack Compose, Media3 | Local SQLite and domain logic via `bridges/bridge-uniffi/` to `synapse-core` |
| **Android WebView Shell** | `apps/mobile-webview/` | Expo, React Native, WebView | Hosts the React web app and provides Android system integrations |
| **Unified Rust Core** | `core/synapse-core/` & `bridges/` | Rust 2021, `rusqlite`, `aes-gcm`, `pbkdf2` | Single Source of Truth (SSOT) for domain entities, calculations, migrations, and crypto primitives |
