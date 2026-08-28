# Caderno Project Rules & Guidelines

This document defines the mandatory development, architectural, quality, and code integrity rules for the **Caderno** project. The AI agent must strictly follow these guidelines across all sessions and tasks.

---

## 1. Core Rule: Strict Functional and Visual Parity

> [!IMPORTANT]
> **FUNCTIONAL AND VISUAL PARITY IS SACRED**
> - **NEVER** simplify or remove existing features without explicit user authorization.
> - **NEVER** alter existing UI design, layouts, visual styles (CSS/Tailwind), or UX flows unless the user explicitly requests a visual change.
> - Internal improvements, optimizations, refactorings, or bug fixes must maintain **100% functional and visual parity**.
> - If code appears complex, understand why (e.g., TipTap edge cases, Yjs real-time sync, Tauri vs Web multiplatform support, IndexedDB indexing) before proposing changes. Do not "simplify" by removing edge-case handling.

---

## 2. Architecture & Tech Stack

Caderno is a hybrid Desktop and Web application built with:
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Lucide Icons, Radix UI / Floating UI.
- **Editor**: TipTap (ProseMirror) with rich custom extensions and real-time collaboration via **Yjs / y-prosemirror**.
- **Desktop Backend**: Tauri v2 (Rust) with filesystem, dialogs, and shell plugins.
- **Persistence / Offline**: IndexedDB (`idb`), Firebase/Firestore for web synchronization and storage.
- **Media & Utilities**: FFmpeg, PDF.js, EpubJS, Tesseract OCR, Tldraw, Canvas Confetti.

---

## 3. Code Quality Standards

### 3.1. Strict TypeScript
- Avoid `any` or unsafe type assertions (`as unknown as ...`). Use discriminated unions, type guards (`is ...`), and strict return types.
- Preserve and adhere to existing data interfaces in `src/types/` or service layers (`src/services/`, `src/api/`).

### 3.2. Safe Multiplatform Handling (Tauri vs Web)
- Always verify the availability of native Tauri APIs before calling them (provide clean, resilient fallbacks for Web/IndexedDB environments).
- Isolate IPC/Tauri calls through adapters and service layers (`src/api/tauri/`, `src/api/web/`, `src/services/storage/`).

### 3.3. State, Lifecycle, and Reactivity
- Prevent state updates on unmounted components (proper cleanup in `useEffect`).
- Maintain stable references in callbacks and hooks to avoid unnecessary re-renders and infinite sync loops with Yjs/TipTap.
- Always handle asynchronous errors gracefully (`try/catch` blocks, contextual logging, and user-friendly fallbacks).

### 3.4. Language & Documentation Standard (Agent-Friendly & English Only)
- **Source Code Comments**: All code comments (`//`, `/* */`, JSDoc, docstrings) must be written **strictly in English**.
  - Comments must be concise, objective, and explain the **rationale** (*why*), concurrency nuances, or complex integration edge cases (e.g., TipTap/Yjs/Tauri), avoiding obvious statements.
- **Obsolete Comment Cleanup**: Stale comments, outdated notes, dead commented-out code, or remarks that no longer reflect actual behavior must **always be cleaned up and removed** during file maintenance.
- **Technical Documentation**: All project documentation (`docs/`, architecture markdowns, manuals, guides, and specifications) must be written **strictly in English**.
- **Agent-Friendly Readability**: Explanations and documentation must be structured, direct, and easy for AI agents and developers to digest quickly.

### 3.5. Testing Standards
- **Meaningful and Well-Elaborated Tests**: All tests must be carefully designed to validate actual business logic, state changes, UI interactions, and component integrations.
- **Avoid Useless Tests**: Do not write excessive, redundant, or shallow tests that serve no practical purpose (e.g., trivially testing that a div renders without asserting useful behavior). Tests must provide genuine value and confidence in the application's resilience.

---

## 4. Task Execution Workflow

1. **Investigate Before Modifying**:
   - Read full context and related dependencies before modifying any file.
   - Trace how consumer modules interact with target code.
2. **Dual-Pass Analysis Loop**:
   - For bug audits and mitigation plans, always perform a thorough primary scan followed by a cross-review pass before concluding.
3. **Non-Regression Verification**:
   - Validate types and run automated test suites (`npm test` / `vitest`) after making changes.
4. **Atomic & Well-Commented Commits**:
   - **Atomic Scope**: Whenever committing modifications, split changes into self-contained, atomic commits representing a single logical change (e.g., isolating a bug fix, refactoring a single helper, or updating a type interface). Avoid giant, monolithic multi-purpose commits.
   - **Descriptive Messages (English Only)**: Write clear, meaningful commit messages (following conventional commits: `fix(...)`, `feat(...)`, `refactor(...)`, `perf(...)`, `test(...)`), including a concise summary title and a well-elaborated body detailing the *why* and *what* whenever necessary.
