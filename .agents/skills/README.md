# 🛠️ Caderno Engineering Skills & Architecture Playbooks

Welcome to the **Caderno Engineering Skills** repository. These playbooks document the architectural patterns, security standards, design system tokens, and automated quality protocols governing the Caderno codebase.

Whether you are an engineering recruiter, tech lead, or contributor, this directory outlines the rigor and modern Big Tech engineering practices baked into Caderno's hybrid Desktop (Tauri v2 / Rust) and Web (React 19 / TypeScript / Vite) architecture.

---

## 🧭 Skills Directory & Competency Matrix

| Skill | Category | Primary Focus & Deliverables | Core Standards |
| :---- | :------- | :--------------------------- | :------------- |
| [**`code-quality-refactoring`**](./code-quality-refactoring/SKILL.md) | Architecture | Modularization of monolithic components, SRP decomposition, custom hook extraction, algorithmic indexing ($O(1)$ lookups), and zero-regression refactoring. | SOLID Principles, RFC 5861 (SWR), Clean Architecture |
| [**`cryptography-vault`**](./cryptography-vault/SKILL.md) | Security & Cryptography | Canonical reference for Two-Tier Keychain hierarchy, PBKDF2 (600,000 rounds) key derivation, AES-256-GCM encryption, chunked video streaming, and Zero-Knowledge cloud sync. | NIST SP 800-132, Web Crypto API, AES-GCM 256 |
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

### 2. Multiplatform Hybrid Architecture
- **Desktop (Tauri v2 + Rust)**: High-performance local SQLite storage, native filesystem access with strict canonicalization, and chunked AES-GCM video streaming protocol (`encrypted://`).
- **Web (React 19 + TypeScript + Vite)**: Progressive offline-first persistence via IndexedDB (`idb`), Web Crypto API, and optional real-time cloud synchronization via Firebase/Firestore.
- **Contract Adapters**: Platform implementations adhere strictly to the Liskov Substitution Principle (LSP) and Interface Segregation Principle (ISP), isolating platform-specific IPC behind clean storage abstractions.

### 3. Big Tech Performance Engineering
- **0ms Perceived Latency**: Optimistic UI transitions and Stale-While-Revalidate (RFC 5861) caching.
- **Zero-Rerender Visual Interactions**: Offloading hover and active states 100% to GPU CSS compositing (`group-hover`, `:hover`, `focus-within`).
- **Layout Thrashing Prevention**: Batching DOM geometry reads before writes and guarding `requestAnimationFrame` loops.
- **Algorithmic Efficiency**: Pre-indexing collections into hash maps (`Map`, `Set`) to guarantee $O(1)$ constant-time lookup performance regardless of vault scale.

### 4. Zero-Knowledge Cryptographic Vault
User data is secured client-side before touching disk or cloud:
- **Master Key**: Derived via PBKDF2-HMAC-SHA256 (600,000 iterations).
- **Two-Tier Keychain**: Dedicated module keys (notes, diagrams, vault passwords) are sealed inside an encrypted envelope in SQLite/IndexedDB.
- **Zero Residual Plaintext**: Plaintext columns are scrubbed upon setting a Master Password; keys are wiped from memory on lock.

---

## 🚀 Tooling & Automation Commands

```bash
# Type contract verification across entire codebase
npx tsc -b --noEmit

# Run targeted fast tests (sub-second feedback)
npx vitest run src/services/crypto.test.ts

# Launch automated Git Worktrees for parallel multi-agent audit
npm run swarm:setup

# Merge and reconcile parallel audit branches with automated validation
npm run swarm:merge
```
