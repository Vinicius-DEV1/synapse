# 📚 Synapse Technical Documentation Hub

Welcome to the **Synapse Engineering Documentation Hub**. This directory provides architectural blueprints, system specifications, development workflows, and protocol references for the Synapse platform.

Synapse is an offline-capable multi-app knowledge platform with React Web/Tauri, native Qt Desktop, native Kotlin/Compose Android, and an Expo/WebView Android shell. The repository includes Yjs collaboration, AES-256-GCM media streaming (ENC1), and an FSRS spaced-repetition engine. Local at-rest encryption is only partially implemented across modules; see the [native encryption audit](./security/native-encryption-audit.md) before making repository-wide E2EE claims.

Use [Documentation Ownership and Current Status](./documentation-status.md) to find authoritative status documents and distinguish them from historical plans and reports.

---

## 🗺️ Documentation Sitemap

| Category | Document | Title | Description | Target Audience |
| :------- | :------- | :---- | :---------- | :-------------- |
| **Architecture** | [**`architecture/repository-layout.md`**](./architecture/repository-layout.md) | **Repository Layout** | App ownership, shared-code boundaries, package manifests, and build commands for all four application targets. | All contributors and agents |
| **Architecture** | [**`documentation-status.md`**](./documentation-status.md) | **Documentation Ownership and Current Status** | Current status sources, historical report handling, and documentation maintenance rules. | All contributors and agents |
| **Architecture** | [**`native-desktop-parity.md`**](./native-desktop-parity.md) | **Native Desktop Parity Matrix** | Module-by-module native Qt coverage and remaining differences from the React reference. | Desktop feature contributors |
| **Roadmap & Plans** | [**`planos/README.md`**](./planos/README.md) | **Implementation Plans** | Active implementation and architectural plans for ongoing work streams. | Core contributors |
| **Security** | [**`security/native-encryption-audit.md`**](./security/native-encryption-audit.md) | **Native Encryption Audit** | Verified Qt encryption behavior, regression checks, and the remaining data-at-rest coverage gaps. | Security auditors and native contributors |
| **Architecture** | [**`architecture/overview.md`**](./architecture/overview.md) | **System Architecture Specification** | Four app targets, shared Rust boundaries, Two-Tier Keychain cryptographic hierarchy, and CRDT synchronization topology. | Architects, Tech Leads, Security Auditors |
| **Historical Analysis** | [**`architecture/multiuser-workspace-analysis.md`**](./architecture/multiuser-workspace-analysis.md) | **Multi-User Workspace Audit Snapshot** | Earlier analysis of singleton sync paths and proposed multi-tenant risks; revalidate findings before use. | Security Auditors, Cloud Engineers |
| **Proposal** | [**`architecture/multiuser-workspace-action-plan.md`**](./architecture/multiuser-workspace-action-plan.md) | **Multi-User Workspace Proposal** | Proposed scoped subcollections, Firebase Auth, RBAC, and key-sharing design; not a shipped-feature record. | Product and Security Engineers |
| **Architecture Notes** | [**`architecture/sync-engine.md`**](./architecture/sync-engine.md) | **React/Web Sync and Autosave Notes** | Design notes for web/Tauri sync flows, full table inventory, and tombstone propagation. | Cloud Engineers, Core Contributors |
| **Guides** | [**`guides/setup-and-build.md`**](./guides/setup-and-build.md) | **Setup, Build & Operations Guide** | Development environment prerequisites, multiplatform build steps (Linux/macOS/Windows), CI/CD verification gates, and production bundling. | Developers, DevOps, QA Engineers |
| **Guides** | [**`guides/docker-self-hosting.md`**](./guides/docker-self-hosting.md) | **Docker Self-Hosting Guide** | Complete manual for deploying containerized Synapse Web on homelabs, VPS, and cloud servers using Docker & Compose. | Homelabbers, DevOps, Self-Hosters |
| **Modules** | [**`modules/index.md`**](./modules/index.md) | **System Modules & Domain Architecture** | Domain/module reference. It describes product architecture and does not certify native client parity. | Feature Engineers, Core Contributors |
| **Modules** | [**`modules/notes.md`**](./modules/notes.md) | **Synapse Notes Architecture** | React TipTap schemas and supported web Yjs flows; Qt editor limitations and security scope are called out. | Frontend & Rich-Text Engineers |
| **Modules** | [**`modules/vault.md`**](./modules/vault.md) | **Password & Credential Vault** | Client-specific credential fields, password generator, HIBP k-anonymity flow, and current metadata/encryption limitations. | Security Engineers & Cryptographers |
| **Modules** | [**`modules/anki-fsrs.md`**](./modules/anki-fsrs.md) | **Spaced Repetition & FSRS Engine** | Modern DSR memory model, rating curves vs legacy SM-2, and Gemini AI automated card synthesis. | AI & Learning Specialists |
| **Protocols** | [**`protocols/enc1-streaming.md`**](./protocols/enc1-streaming.md) | **Encrypted Media Container (ENC1)** | Current 16-byte header, chunk layout, range math, integrity boundary, and client-specific readers. | Systems Engineers, Security Auditors |
| **RFCs** | [**`rfcs/RFC-001-contextual-vocabulary.md`**](./rfcs/RFC-001-contextual-vocabulary.md) | **RFC-001: Contextual Vocabulary Extraction** | Formal Request for Comments proposing database schemas, UI workflows, FSRS scheduling integration, and Gemini AI pipeline for vocabulary learning. | Product Engineers, AI Specialists |

> [!TIP]
> **Engineering Skills & Playbooks**: For security, refactoring, design, and audit specifications, explore the [`.agents/skills/`](../.agents/skills/README.md) directory. A skill describes required practice; it does not prove implementation coverage.

---

## 🏛️ High-Level System Architecture

The repository separates product applications from shared domain logic:

| Product | App directory | Main technologies |
| --- | --- | --- |
| React Web + Tauri Desktop | `apps/web-react/` | React 19, TypeScript, Vite, Tauri v2, Rust |
| Native Desktop | `apps/desktop-qt/` | Qt 6 Quick/QML, C++17, Rust FFI, libmpv |
| Native Android | `apps/mobile-android/` | Kotlin, Jetpack Compose, UniFFI |
| Android WebView Shell | `apps/mobile-webview/` | Expo, React Native, WebView |

The native clients and Tauri backend reuse Rust domain capabilities through `core/synapse-core/` and the adapters in `bridges/`. The WebView shell wraps the React web target and remains a separately installed Expo package. See [the repository layout guide](./architecture/repository-layout.md) for dependency ownership and build commands.

## 🔒 Core Engineering Principles

1. **Client-Side Data Protection**:
   - Master keys are derived locally using PBKDF2 with HMAC-SHA256 (600,000 iterations) and are not persisted raw in the covered flows.
   - Local vault protection currently covers selected fields and managed media. It does not encrypt every SQLite table, metadata field, or unmanaged asset. See the [native encryption audit](./security/native-encryption-audit.md) before making broader at-rest or zero-residual claims.
2. **100% Functional & Visual Parity**:
   - The React client is the visual and functional reference for native parity work. Qt module coverage and remaining differences are tracked per module in [the native desktop parity matrix](./native-desktop-parity.md); do not describe partial native modules as complete.
3. **Performance as a Design Goal**:
   - CSS-driven compositing and data indexing are used where appropriate, but each app's performance must be measured on its target runtime.
   - Historical web benchmarks do not certify Qt or Android latency. Use the performance guide for current measurement commands.
4. **Resilient Offline-First Synchronization**:
   - Offline behavior and synchronization vary by feature and adapter. React note collaboration uses Yjs in supported flows; do not infer universal CRDT behavior or encrypted cloud coverage.

---

## 🛠️ Technology Stack Matrix

| Product | UI / runtime | Persistence and domain |
| :----- | :------------ | :--------------------- |
| **React Web** | React 19, TypeScript 6, Vite 8, TailwindCSS, TipTap, Lucide | IndexedDB, Web Crypto, Firebase/Firestore, shared TypeScript services |
| **Tauri Desktop** | React frontend in Tauri v2 / Rust | SQLite WAL, Rust IPC, encrypted media protocol, shared Rust core |
| **Qt Desktop** | Qt 6 Quick/QML, C++17, libmpv | SQLite WAL and Rust C-ABI bridge to `synapse-core` |
| **Native Android** | Kotlin, Jetpack Compose, Media3 | Shared Rust core via UniFFI and Android persistence adapters |
| **Android WebView Shell** | Expo, React Native, WebView | Hosts the React app and supplies Android device integration |
| **Shared Rust** | `core/synapse-core/` plus `bridges/` | Domain rules, cryptography, persistence primitives, and platform adapters |
