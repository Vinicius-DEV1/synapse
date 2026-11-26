# 🤝 Contributing to Synapse

Thank you for your interest in contributing to **Synapse**! Synapse is a local-first personal knowledge and study platform with several web and native app targets. Vault and encrypted-media protections cover selected flows; do not claim that all user data is encrypted at rest. See the [encryption coverage guide](./docs/security/encryption-coverage.md) and [documentation status index](./docs/documentation-status.md).

By participating in this project, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

---

## 🧭 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Architecture & Guiding Principles](#architecture--guiding-principles)
- [Development Environment Setup](#development-environment-setup)
- [Quality Gates & Testing Guidelines](#quality-gates--testing-guidelines)
  - [Sub-Second Targeted Testing (Vitest)](#sub-second-targeted-testing-vitest)
  - [Strict Type Contract Verification (TypeScript)](#strict-type-contract-verification-typescript)
  - [Static Analysis & Linting](#static-analysis--linting)
- [Coding Standards & Prohibitions](#coding-standards--prohibitions)
- [Git Workflow & Conventional Commits](#git-workflow--conventional-commits)
- [Submitting a Pull Request](#submitting-a-pull-request)

---

## 🏛️ Architecture & Guiding Principles

1. **Strict Functional & Visual Parity**:
   - Internal refactorings, optimizations, or bug fixes must maintain **100% functional and visual parity**.
   - Never alter the UI design, dark canvas theme (`#0f0e17` / `zinc-950`), micro-animations, or keyboard shortcuts without explicit design approval.
2. **SOLID Architecture**:
   - Presentation components render UI; custom hooks coordinate state; domain services handle business logic; and infrastructure adapters handle storage and IPC.
3. **Security Coverage and Honest Claims**:
   - Follow the cryptography skill and the current encryption coverage guide when changing protected data flows. Do not add plaintext transmission or persistence to a flow that promises encryption, and do not imply that existing unprotected fields are covered.

---

## 🛠️ Development Environment Setup

### 1. Prerequisites
- **Node.js**: `v20.x` or `v22.x` LTS
- **Package Manager**: `npm` (v9+)
- **Rust Toolchain**: `1.77.2+` (Required for Desktop/Tauri development; install via [rustup.rs](https://rustup.rs/))
- **Platform Dependencies**:
  - **Linux**: `libwebkit2gtk-4.1-dev`, `build-essential`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`
  - **Windows**: Microsoft C++ Build Tools & Evergreen WebView2 Runtime
  - **macOS**: Xcode Command Line Tools

### 2. Quick Start
```bash
# 1. Clone the repository
git clone https://github.com/Vinicius-DEV1/synapse.git
cd synapse

# 2. Install dependencies
npm install

# 3. Configure environment variables (optional for local offline use)
cp apps/web-react/.env.example apps/web-react/.env

# 4. Launch Web development server (runs on port 35174)
npm run dev

# 5. Or launch Desktop development with Tauri v2 + Rust
npm run tauri -- dev
```

---

## 🧪 Quality Gates & Testing Guidelines

To maintain elite engineering standards and productive development velocity, contributors must follow these testing protocols:

### Sub-Second Targeted Testing (Vitest)
> [!IMPORTANT]
> **Do not run the full test suite (`npm test`) on every small change.** The complete suite may take substantial time; check the current package scripts and run focused tests first.
> **Always use Targeted Testing**:
```bash
# Test a specific module or test file (~1-2 seconds)
npm run test -- src/services/crypto.test.ts

# Test a specific directory
npm run test -- src/api/

# Run tests related to modified/uncommitted files
npm run test:related -- src/services/crypto.ts
```

### Strict Type Contract Verification (TypeScript)
Always verify type safety across all frontend and IPC boundaries without running heavy DOM harnesses:
```bash
npm run typecheck
```

### Static Analysis & Linting
```bash
npm run lint
```

---

## 🚫 Coding Standards & Anti-Pattern Prohibitions

1. **Zero `any` Violations**:
   - Untyped payloads, unchecked type assertions (`as any`), and `as unknown as Type` are strictly forbidden.
   - Use **Discriminated Unions**, explicit return types, and typed type guards (`value is Type`).
2. **No Silent Error Swallowing**:
   - Empty `catch {}` blocks are prohibited. Log errors with contextual metadata and provide defensive fallback UX.
3. **No Direct State Mutation**:
   - Always perform immutable state updates (`[...array]`, `{ ...obj }`).
4. **No Raw Browser Dialogs**:
   - Never use raw `window.confirm()` or `window.alert()`. Use the application's built-in confirmation dialogs or notification toasts.
5. **Memory Hygiene & Lifecycle Cleanup**:
   - Always clean up event listeners, timers, and abort in-flight asynchronous operations (`AbortController`) in `useEffect` unmount hooks.
6. **English Only for Code & Documentation**:
   - All code comments, docstrings, and technical documentation must be written strictly in **English**.

---

## 🌿 Git Workflow & Conventional Commits

1. **Branch Naming**:
   - Features: `feat/feature-name`
   - Bug Fixes: `fix/bug-description`
   - Documentation: `docs/documentation-topic`
   - Performance: `perf/optimization-target`
2. **Atomic Commits**:
   - Keep commits small, cohesive, and focused on a single logical change.
3. **Conventional Commit Messages**:
   - Format: `<type>(<scope>): <short summary in English>`
   - Examples:
     - `feat(notes): add LaTeX formula preview in TipTap editor`
     - `fix(drive): resolve OAuth PKCE token exchange fallback`
     - `docs(api): document window.api storage contract methods`
     - `test(vault): add entropy evaluation unit test`

---

## 🚀 Submitting a Pull Request

1. Create a descriptive PR title following the conventional commit format.
2. Fill out the PR description explaining **what** was changed and **why**.
3. Confirm that:
   - `npm run typecheck` passes with **0 errors**.
   - Targeted unit tests pass: `npm run test:related -- <modified_files>`.
   - `npm run lint` passes without style violations.
   - 100% functional and visual parity is preserved.
