# Caderno Project Rules & Guidelines

This document defines the mandatory architectural, code quality, design integrity, and engineering standards for the **Caderno** project. The AI agent must strictly follow these rules across all sessions, tasks, and code modifications.

---

## 1. Core Rule: Strict Functional and Visual Parity

> [!IMPORTANT]
> **FUNCTIONAL AND VISUAL PARITY IS SACRED**
> - **NEVER** simplify, downgrade, or remove existing features without explicit user authorization.
> - **NEVER** alter existing UI design, layouts, visual styles (CSS/Tailwind), animations, or UX flows unless the user explicitly requests a visual change.
> - Internal improvements, optimizations, refactorings, or bug fixes must maintain **100% functional and visual parity**.
> - If code appears complex, understand why (e.g., TipTap ProseMirror schema intricacies, Yjs CRDT real-time sync, Tauri IPC vs Web multiplatform fallbacks, IndexedDB indexing) before proposing changes. Do not "simplify" by stripping edge-case handling.

---

## 2. Architecture & Tech Stack

Caderno is a hybrid Desktop and Web application built with:
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Lucide Icons, Radix UI / Floating UI.
- **Editor**: TipTap (ProseMirror) with rich custom extensions and real-time collaboration via **Yjs / y-prosemirror**.
- **Desktop Backend**: Tauri v2 (Rust) with filesystem, dialogs, and shell plugins.
- **Persistence / Offline**: IndexedDB (`idb`), Firebase/Firestore for web synchronization and cloud backup.
- **Media & Utilities**: FFmpeg, PDF.js, EpubJS, Tesseract OCR, Tldraw, Canvas Confetti.

### Layered Architecture Boundaries
Code must adhere to a strict 4-tier layer separation:
1. **Presentation Layer (`src/components/`)**: Pure UI rendering, event dispatching, and styling. Avoid embedding raw business calculations, storage I/O, or direct IPC calls directly inside UI views.
2. **Orchestration Layer (`src/hooks/`, `src/store/`)**: State management, lifecycle binding, memoization, and coordination between UI and services.
3. **Domain & Business Layer (`src/services/`, `src/utils/`)**: Pure domain logic, algorithms (e.g., FSRS spacing, text diffing, OCR extraction, audio/video transformation), decoupled from React UI.
4. **Infrastructure & Platform Layer (`src/api/`, `src/services/storage/`)**: Multiplatform abstraction (Tauri IPC vs Web Browser / IndexedDB / Firestore), network clients, and persistent drivers.

---

## 3. SOLID Principles in Practice

Every module, class, hook, and function must embody the **SOLID** software engineering principles:

### 3.1. Single Responsibility Principle (SRP)
- **No Monolithic Files ("God" Components)**: A file must have a single reason to change. Separate large files (>300 lines) into focused sub-components, container hooks, and domain services.
- **Split UI and Logic**: Presentation components render UI; custom hooks (`use...`) orchestrate state and side effects; services handle data persistence and platform operations.
- **Micro-Components**: Break complex modals, sidebars, and editor panels into atomic, cohesive sub-components located in dedicated subdirectories (e.g., `src/components/<feature>/modals/`, `src/components/<feature>/ui/`).

### 3.2. Open / Closed Principle (OCP)
- **Extensible via Abstraction**: Design components and services to be open for extension but closed for modification.
- **Registry & Strategy Patterns**: Prefer registries and strategy maps (e.g., `ViewFactory`, editor node extensions, custom formatters) over massive, hard-coded `switch/case` statements that require modifying core files when adding new variants.

### 3.3. Liskov Substitution Principle (LSP)
- **Interchangeable Platform Adapters**: All platform implementations (e.g., `TauriStorageService` and `WebStorageService`) must strictly adhere to the same contract interface (`IStorageService`).
- Subtypes and adapter implementations must not throw unexpected exceptions, violate method signatures, or alter the expected contract behavior when substituted in different environments (Web vs Tauri).

### 3.4. Interface Segregation Principle (ISP)
- **Fine-Grained Contracts**: Avoid bloated "fat" interfaces that force callers to implement or depend on methods and properties they do not use.
- Break large interfaces into focused, cohesive sub-interfaces (e.g., separate `ReadableStorage`, `WritableStorage`, and `SearchableStorage` instead of a single giant interface).

### 3.5. Dependency Inversion Principle (DIP)
- **Depend on Abstractions, Not Concretions**: High-level UI and business modules must depend on abstract interfaces, not direct concrete implementations (e.g., UI components should consume a storage hook/interface rather than importing raw Tauri IPC or IndexedDB functions).
- Isolate platform-specific dependencies behind clean adapter factories or dependency injection hooks.

---

## 4. Strict Code Quality & Anti-Pattern Prohibitions

### 4.1. Zero `any` & Strict Type Safety
- **Forbidden**: `any`, `as any`, `(value as any).field`, unchecked type assertions (`as unknown as Type`).
- **Required**:
  - Use **Discriminated Unions** for multi-state payloads and action dispatchers.
  - Use **Type Guards** (`value is Type`) and type narrowing for dynamic data.
  - Use `unknown` with runtime validation (or schema validators) for external data (APIs, IPC, IndexedDB).
  - Explicit return types on all exported functions, hooks, and services.
  - Strict generic constraints (`<T extends Record<string, unknown>>`).

### 4.2. Anti-Monolith & Structural Organization
- **Maximum File Length**: Keep files concise and focused (target < 300 lines). If a file grows excessively, extract sub-components, custom hooks, or utility helpers.
- **Colocation & Grouping**: Group related components, sub-views, dedicated hooks, types, and test files within coherent subdirectories rather than scattering loose files across parent directories.
- **Single Source of Truth**: Keep shared types centralized in `src/types/` or co-located in cohesive module-specific `types.ts` files with clear barrel exports.

### 4.3. Anti-Patterns Catalog (Strictly Prohibited)
1. **Silent Error Swallowing**: Empty `catch {}` blocks are strictly forbidden. All errors must be logged with contextual metadata and provide fallback UX or user feedback.
2. **Async Memory Leaks & Stale Closures**:
   - Always cancel unmounted asynchronous operations (`AbortController`, mounted flags, or subscription teardown in `useEffect`).
   - Keep dependency arrays in `useEffect`, `useCallback`, and `useMemo` strictly accurate and exhaustive.
3. **Prop Drilling**: Avoid passing props through more than 2 intermediate components. Use React Context, Zustand/Store, or component composition.
4. **Magic Values & Hardcoded Strings**:
   - Extract raw constants, numeric thresholds, timeout intervals, and action keys into well-named constants or `const` enums.
5. **Direct State Mutations**:
   - Never mutate state objects or arrays in-place (`array.push()`, `obj.field = ...`). Always use immutable updates (`[...array]`, `{ ...obj }`).
6. **Premature Complexity vs Algorithmic Inefficiency**:
   - Use $O(1)$ lookups (`Map`, `Set`, lookup tables) when handling large datasets (notes, tags, flashcards) inside frequent render or search loops.

---

## 5. Safe Multiplatform Handling (Tauri vs Web)

- **Native Availability Check**: Always verify the availability of native Tauri APIs before calling them and provide clean, resilient fallbacks for Web/IndexedDB environments.
- **Isolated IPC Layers**: Never make direct `invoke()` or `@tauri-apps/plugin-*` calls inside UI presentation components. Route all platform communication through `src/api/` or `src/services/` adapters.
- **Cross-Platform Path Resolution**: Handle path separators, URI encoding, and special characters safely across Linux, macOS, and Windows.

---

## 6. Language & Documentation Standard (Agent-Friendly & English Only)

- **Source Code Comments**: All code comments (`//`, `/* */`, JSDoc, docstrings) must be written **strictly in English**.
  - Comments must be concise, objective, and explain the **rationale** (*why*), concurrency nuances, or complex integration edge cases (e.g., TipTap/Yjs/Tauri), avoiding obvious statements.
- **Obsolete Comment Cleanup**: Stale comments, outdated notes, dead commented-out code, or remarks that no longer reflect actual behavior must **always be cleaned up and removed** during file maintenance.
- **Technical Documentation**: All project documentation (`docs/`, architecture markdowns, manuals, guides, and specifications) must be written **strictly in English**.
- **Agent-Friendly Readability**: Explanations and documentation must be structured, direct, and easy for AI agents and developers to digest quickly.

---

## 7. Testing Standards

- **Meaningful and Well-Elaborated Tests**: All tests must validate actual business logic, state changes, UI interactions, error recovery, and component integrations using Vitest and React Testing Library.
- **Avoid Useless Tests**: Do not write excessive, redundant, or shallow tests that serve no practical purpose (e.g., trivially asserting a static `div` renders without validating behavior). Tests must provide genuine confidence in application resilience.
- **Mocking Platform Boundaries**: Mock external boundaries (Tauri IPC, IndexedDB, Firebase, FFmpeg, Tesseract) cleanly at the adapter interface level without polluting tests with brittle DOM implementation details.

---

## 8. Task Execution Workflow

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
