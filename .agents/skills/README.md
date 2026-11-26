# 🛠️ Synapse Engineering Skills & Architecture Playbooks

Welcome to the **Synapse Engineering Skills** repository. These playbooks document architecture, security boundaries, design tokens, and quality workflows for the Synapse codebase. Each skill states the clients and layers it covers; implementation coverage must be verified against current code.

These playbooks cover three product clients—React Web/Tauri (`apps/web-react/`), native Qt Desktop (`apps/desktop-qt/`), and native Kotlin/Compose Android (`apps/mobile-android/`)—plus the Expo/WebView Android shell (`apps/mobile-webview/`), which hosts React. Shared Rust domain behavior lives in `core/synapse-core/` and is exposed through typed platform bridges. Similar feature behavior does not imply identical implementation or complete capability coverage; verify each client and document gaps.

Keep cross-client structure aligned by canonical module ID, feature vocabulary, semantic counterpart names, action names, payload meaning, and test scenarios. Keep physical trees idiomatic to React/Tauri, Qt/QML/C++, and Kotlin/Compose; do not add empty mirror folders or wrapper files. The active canonical mapping is [`docs/architecture/module-structure.md`](../../docs/architecture/module-structure.md), and the shared workflow is [`cross-platform-module-parity`](./cross-platform-module-parity/SKILL.md).

---

## 🧭 Skills Directory & Competency Matrix

| Skill | Category | Primary Focus & Deliverables | Core Standards |
| :---- | :------- | :--------------------------- | :------------- |
| [**`code-quality-refactoring`**](./code-quality-refactoring/SKILL.md) | Architecture | Atomic refactoring across React, QML/C++, and Compose; SRP decomposition, native orchestration boundaries, indexing, and zero-regression changes. | SOLID Principles, Clean Architecture |
| [**`cross-platform-module-parity`**](./cross-platform-module-parity/SKILL.md) | Multi-Client Architecture | Canonical module IDs, counterpart naming, typed contracts, Core SSOT routing, and atomic files across React/Tauri, Qt, and Compose. | Feature Maps, Native Layer Boundaries, Contract Parity |
| [**`android-native-parity`**](./android-native-parity/SKILL.md) | Native Android | Compose/ViewModel parity through UniFFI, Android lifecycle, navigation/back, insets, permissions, localization, and capability-aware UX. | Kotlin, Jetpack Compose, UniFFI, Android APIs |
| [**`cryptography-vault`**](./cryptography-vault/SKILL.md) | Security & Cryptography | Cryptographic design requirements for the Two-Tier Keychain, PBKDF2 key derivation, AES-256-GCM, and ENC1 media. Consult the consolidated encryption coverage guide for implementation status. | NIST SP 800-132, Web Crypto API, AES-GCM 256 |
| [**`design-system`**](./design-system/SKILL.md) | Design & UI Engineering | Comprehensive visual design tokens, `brand-*` violet palette, modal/dialog parity, atomic component variants, Lucide icon standards, and GPU-accelerated micro-animations. | Design Tokens, Tailwind CSS, GPU Compositing |
| [**`immersive-minimalist-ux`**](./immersive-minimalist-ux/SKILL.md) | UX & Ergonomics | Focused canvas principles adapted to web, Qt Quick, and Compose; desktop keyboard navigation, mobile touch and Back behavior, semantic feedback colors, and readable study layouts. | Ergonomic Typography, Distraction-Free UX |
| [**`module-bug-audit`**](./module-bug-audit/SKILL.md) | Quality Assurance | Rigorous cross-client audit for React effects, Qt object/signal lifetimes, Android coroutine/Flow lifecycles, Rust errors, races, and Core-owned persistence. | Static Analysis, Diagnostic Tracing |
| [**`firebase-sync-integrity`**](./firebase-sync-integrity/SKILL.md) | Data Integrity | Account-scoped comparison and reconciliation of local SQLite/IndexedDB with encrypted Firebase rows, chunking, conflict resolution, and guarded cleanup. | Firestore Rules, Encryption, Idempotent Migrations |
| [**`full-module-review`**](./full-module-review/SKILL.md) | Quality Orchestration | Comprehensive 6-dimension health scorecard (Correctness, Architecture, Type Safety, Performance, Security, Design) with prioritized remediation roadmaps. | Multi-Dimensional QA, Health Scoring |
| [**`security-audit`**](./security-audit/SKILL.md) | AppSec & Penetration Defense | Threat modeling across browser/Tauri, Qt QML/FFI, Android UniFFI and OS grants, and WebView shell boundaries, with injection, path, and supply-chain checks. | OWASP Top 10, CWE Classification |
| [**`type-safety-hardening`**](./type-safety-hardening/SKILL.md) | TypeScript & Reliability | React/Tauri TypeScript hardening plus cross-language field semantics and Rust/C++/Kotlin FFI boundary checks. | Compile-Time Safety, Runtime Validation, Typed IPC/FFI |
| [**`desktop-qt-parity`**](./desktop-qt-parity/SKILL.md) | React-to-Qt Parity | Native Qt implementation and acceptance workflow for matching React Web/Tauri while retaining QML/C++ and Rust Core boundaries. | Qt 6 Quick/QML, Rust Core SSOT, Visual Parity |

---

## 🏛️ Core Architectural Pillars

Shared behavior means aligned domain outcomes, contracts, persisted meaning, and supported user actions—not identical UI frameworks or complete feature availability. React/Tauri, Qt, and native Android use native presentation and platform adapters. The WebView shell reuses React rather than duplicating product features. Audit the actual client call path before claiming parity.

### 1. Strict Functional & Visual Parity
Refactoring, bug fixes, and internal optimizations must maintain **100% functional and visual parity**. Performance enhancements and structural cleanups preserve all user interactions, keyboard shortcuts, animations, and edge-case handling.

### 2. Multi-App Architecture & Unified Rust Core
- **Unified Rust Core (`core/synapse-core/`)**: Single Source of Truth (SSOT) for all canonical domain entities, business logic (balances, streaks, quiz stats, FSRS), SQLite schema/migrations, and repository persistence.
- **React Web + Tauri (`apps/web-react/`)**: React app runs in browsers and the Tauri v2 shell; Tauri commands in `src-tauri/` act as thin pass-through wrappers calling `synapse-core`. Pure domain algorithms in the browser run via WebAssembly (`bridges/bridge-wasm/`).
- **Native Qt Desktop (`apps/desktop-qt/`)**: Qt Quick/QML with thin C++ controllers exposing `Q_PROPERTY` and signals. Controllers delegate all SQL queries and domain calculations to `core/synapse-core/` via high-level typed domain functions in `bridges/bridge-qt/`.
- **Native Android (`apps/mobile-android/`)**: Kotlin/Compose connects ViewModels to `core/synapse-core/` through UniFFI (`bridges/bridge-uniffi/`).
- **Expo/WebView Shell (`apps/mobile-webview/`)**: A separate React Native package hosts the React web app and integrates shell-only Android APIs such as safe areas and Back navigation; it must not duplicate native Compose modules.

### 3. Big Tech Performance Engineering
- **0ms Perceived Latency**: Optimistic UI transitions and Stale-While-Revalidate (RFC 5861) caching.
- **Zero-Rerender Visual Interactions**: Offloading hover and active states 100% to GPU CSS compositing (`group-hover`, `:hover`, `focus-within`).
- **Layout Thrashing Prevention**: Batching DOM geometry reads before writes and guarding `requestAnimationFrame` loops.
- **Algorithmic Efficiency**: Pre-indexing collections into hash maps (`Map`, `Set`) to guarantee $O(1)$ constant-time lookup performance regardless of vault scale.

### 4. Vault and Cryptographic Requirements
The cryptography skill defines target behavior; it is not proof that every client or entity implements it:
- **Master Key**: Current local derivation uses PBKDF2-HMAC-SHA256 (600,000 iterations) with a compatibility-bound salt.
- **Two-Tier Keychain**: Dedicated module keys are sealed in encrypted envelopes where the client implements that flow.
- **Coverage and Residuals**: Protection is partial across local database fields and metadata. Some buffers are wiped, but zero residual plaintext has not been proven. Read the [encryption coverage guide](../../docs/security/encryption-coverage.md) before making security claims.

## Current Implementation Status

The [documentation status index](../../docs/documentation-status.md) identifies authoritative project documents. Skill authors must keep each playbook scoped to its target client(s), list real platform-specific boundaries, and link to the relevant parity skill rather than implying that matching names prove implementation parity. The [native desktop parity guide](../../docs/native-desktop-parity.md) and [encryption coverage guide](../../docs/security/encryption-coverage.md) remain the consolidated sources for their scopes. Active evidence and checklists live in repository-root `audits/`; skill instructions describe required practice, not completion status.

---

## 🚀 Tooling & Automation Commands

Use focused work with the repository instructions and review workflows. Parallel swarm orchestration and its npm commands have been retired.

```bash
# React/TypeScript contract verification
npm run typecheck

# Run focused React tests
npm run test -- src/services/crypto.test.ts
```
