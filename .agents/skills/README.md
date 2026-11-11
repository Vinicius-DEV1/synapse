# 🛠️ Synapse Engineering Skills & Architecture Playbooks

Welcome to the **Synapse Engineering Skills** repository. These playbooks document the architectural patterns, security standards, design system tokens, and automated quality protocols governing the Synapse codebase.

These playbooks apply across the four app targets: React Web/Tauri (`apps/web-react/`), native Qt Desktop (`apps/desktop-qt/`), native Kotlin/Compose Android (`apps/mobile-android/`), and Expo/WebView Android (`apps/mobile-webview/`). Shared Rust logic lives in `core/synapse-core/` and `bridges/`.

---

## 🧭 Skills Directory & Competency Matrix

| Skill | Category | Primary Focus & Deliverables | Core Standards |
| :---- | :------- | :--------------------------- | :------------- |
| [**`code-quality-refactoring`**](./code-quality-refactoring/SKILL.md) | Architecture | Modularization of monolithic components, SRP decomposition, custom hook extraction, algorithmic indexing ($O(1)$ lookups), and zero-regression refactoring. | SOLID Principles, RFC 5861 (SWR), Clean Architecture |
| [**`cryptography-vault`**](./cryptography-vault/SKILL.md) | Security & Cryptography | Cryptographic design requirements for the Two-Tier Keychain, PBKDF2 key derivation, AES-256-GCM, and ENC1 media. Consult the separate implementation audit for actual coverage. | NIST SP 800-132, Web Crypto API, AES-GCM 256 |
| [**`design-system`**](./design-system/SKILL.md) | Design & UI Engineering | Comprehensive visual design tokens, `brand-*` violet palette, whisper-thin borders, atomic component variants, Lucide icon standards, and GPU-accelerated micro-animations. | Design Tokens, Tailwind CSS, GPU Compositing |
| [**`immersive-minimalist-ux`**](./immersive-minimalist-ux/SKILL.md) | UX & Ergonomics | Zen canvas architecture (`zinc-950` full-viewport overlay), keyboard-first navigation engine (`useImmersiveKeyboard`), semantic feedback colors, and reading column ergonomics. | Ergonomic Typography, Distraction-Free UX |
| [**`module-bug-audit`**](./module-bug-audit/SKILL.md) | Quality Assurance | Rigorous 4-phase audit protocol for race conditions, memory leaks, unmounted state updates, Rust `.unwrap()` panic paths, and SQL parameterization. | Static Analysis, Diagnostic Tracing |
| [**`full-module-review`**](./full-module-review/SKILL.md) | Quality Orchestration | Comprehensive 6-dimension health scorecard (Correctness, Architecture, Type Safety, Performance, Security, Design) with prioritized remediation roadmaps. | Multi-Dimensional QA, Health Scoring |
| [**`parallel-swarm-audit`**](./parallel-swarm-audit/SKILL.md) | Multi-Agent DevOps | Orchestration engine for parallel worker swarms across isolated Git Worktrees (3-Agent or 4-Agent Quad-Swarm), automated multi-way merge, and type reconciliation. | Git Worktrees, Multi-Agent Concurrency |
| [**`security-audit`**](./security-audit/SKILL.md) | AppSec & Penetration Defense | 8-pillar threat modeling covering WebView sandboxing, Tauri CSP, command/SQL injection defense, path traversal containment, and dependency CVE auditing. | OWASP Top 10, CWE Classification |
| [**`type-safety-hardening`**](./type-safety-hardening/SKILL.md) | TypeScript & Reliability | Zero-`any` enforcement, discriminated unions with exhaustiveness checks (`assertNever`), type guards, runtime schema validation (Zod), and branded domain types. | Compile-Time Safety, Strict TypeScript |

---

## 🏛️ Core Architectural Pillars

### 1. Strict Functional & Visual Parity
Refactoring, bug fixes, and internal optimizations must maintain **100% functional and visual parity**. Performance enhancements and structural cleanups preserve all user interactions, keyboard shortcuts, animations, and edge-case handling.

### 2. Multi-App Architecture
- **React Web + Tauri (`apps/web-react/`)**: The original React app runs in browsers and in the Tauri v2 shell; the Tauri backend provides Rust IPC and SQLite.
- **Native Qt Desktop (`apps/desktop-qt/`)**: Qt Quick/QML and C++ use the Rust C-ABI bridge and native media rendering.
- **Native Android (`apps/mobile-android/`)**: Kotlin/Compose connects to shared Rust capabilities through UniFFI.
- **Expo/WebView Shell (`apps/mobile-webview/`)**: A separate React Native package hosts the React web app and integrates Android system APIs.
- **Shared Code**: Platform-neutral domain logic belongs in `core/synapse-core/`; `bridges/` adapts it to Qt, Android, and WebAssembly.

### 3. Big Tech Performance Engineering
- **0ms Perceived Latency**: Optimistic UI transitions and Stale-While-Revalidate (RFC 5861) caching.
- **Zero-Rerender Visual Interactions**: Offloading hover and active states 100% to GPU CSS compositing (`group-hover`, `:hover`, `focus-within`).
- **Layout Thrashing Prevention**: Batching DOM geometry reads before writes and guarding `requestAnimationFrame` loops.
- **Algorithmic Efficiency**: Pre-indexing collections into hash maps (`Map`, `Set`) to guarantee $O(1)$ constant-time lookup performance regardless of vault scale.

### 4. Vault and Cryptographic Requirements
The cryptography skill defines target behavior; it is not proof that every client or entity implements it:
- **Master Key**: Current local derivation uses PBKDF2-HMAC-SHA256 (600,000 iterations) with a compatibility-bound salt.
- **Two-Tier Keychain**: Dedicated module keys are sealed in encrypted envelopes where the client implements that flow.
- **Coverage and Residuals**: Protection is partial across local database fields and metadata. Some buffers are wiped, but zero residual plaintext has not been proven. Read the [native encryption audit](../../docs/security/native-encryption-audit.md) before making security claims.

## Current Implementation Status

The [documentation status index](../../docs/documentation-status.md) identifies authoritative project documents. The [native desktop parity matrix](../../docs/native-desktop-parity.md) and [native encryption audit](../../docs/security/native-encryption-audit.md) remain the sources of truth for their respective scopes. Skill instructions describe required practice, not completion status.

---

## 🚀 Tooling & Automation Commands

```bash
# Type contract verification across entire codebase
npm run typecheck

# Run targeted fast tests (sub-second feedback)
npm run test -- src/services/crypto.test.ts

# Launch automated Git Worktrees for parallel multi-agent audit
npm run swarm:setup

# Merge and reconcile parallel audit branches with automated validation
npm run swarm:merge
```
