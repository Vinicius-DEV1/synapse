# Synapse Project Rules & Guidelines

This document defines the mandatory architectural, code quality, design integrity, and engineering standards for the **Synapse** project (formerly Caderno). The AI agent must strictly follow these rules across all sessions, tasks, and code modifications.

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

Caderno is a multi-target application engineered for desktop, web, and high-performance native environments, centered around a unified Rust domain core:
- **Unified Domain Core (`core/synapse-core/`)**: Single Source of Truth (SSOT) in Rust for all canonical domain entities, business logic (balance aggregations, habit streaks, quiz scoring, FSRS spaced repetition), SQLite database schema/migrations, and repository persistence.
- **Hybrid Web & Desktop (Tauri)**: React 19, TypeScript, Vite, TailwindCSS, Lucide Icons, Radix UI / Floating UI, Tauri v2 (Rust). Tauri commands in `apps/web-react/src-tauri/` act as thin delegators directly calling `synapse-core`.
- **Native Desktop High-Performance (Qt 6 / C++ / Rust FFI)**: Qt 6 Quick/QML, thin C++17 controllers (`apps/desktop-qt/src/controllers/`) exposing `Q_PROPERTY` and signals, linked to `core/synapse-core/` via high-level typed domain APIs in `bridges/bridge-qt/`, native MPV hardware-accelerated media rendering (`MpvPlayerItem`), and direct SQLite WAL persistence.
- **Editor**: TipTap (ProseMirror) with rich custom extensions and real-time collaboration via **Yjs / y-prosemirror**.
- **Persistence / Offline**: Direct SQLite WAL on desktop via `core/synapse-core/src/db/`; IndexedDB (`idb`) and Firebase/Firestore for web synchronization.
- **Media & Utilities**: libmpv, FFmpeg, PDF.js, EpubJS, Tesseract OCR, Tldraw, Canvas Confetti.
- **End-to-End Cryptography**: PBKDF2-HMAC-SHA256 (600,000 iterations), AES-256-GCM Two-Tier Keychain envelopes, selected field protection, and encrypted media flows. Coverage differs by client and data entity; consult [`docs/security/encryption-coverage.md`](./docs/security/encryption-coverage.md) before claiming full local at-rest encryption.

### 2.1. Unified Domain Core SSOT & Zero Cross-Client Duplication

> [!IMPORTANT]
> **ZERO DOMAIN DUPLICATION & UNIFIED CORE SSOT**
> All canonical domain entities, business algorithms (balance deltas, habit streaks, quiz scoring, FSRS spaced repetition), database schemas, SQLite migrations, and persistence operations MUST reside strictly in `core/synapse-core/` as the Single Source of Truth (SSOT).
>
> - **Desktop Qt (`apps/desktop-qt/`)**: C++ controllers are thin presentation orchestrators exposing `Q_PROPERTY` and Qt signals. They MUST NOT assemble raw SQL query strings or implement business calculations in C++; they delegate to `bridges/bridge-qt/`.
> - **Desktop & Web React (`apps/web-react/`)**: Tauri IPC commands in `src-tauri/` are thin delegators calling `synapse-core` directly; presentation components consume abstract service interfaces.
> - **Mobile Android (`apps/mobile-android/`)**: Kotlin / Jetpack Compose ViewModels and data layers MUST NOT write custom Room/SQLite schemas or reimplement domain algorithms (FSRS, habit streaks, financial balances) in Kotlin; they delegate to `bridges/bridge-uniffi/` which exposes typed UniFFI bindings from `synapse-core`.
> - **Mobile WebView (`apps/mobile-webview/`)**: The Expo shell hosts the web application and must not grow duplicate product domains.
>
> **Anti-Monolith Rule for Core & Bridges**:
> Files in `core/synapse-core/` and `bridges/` MUST NOT become monoliths. Every domain module MUST be decomposed into atomic, cohesive sub-files (`models.rs`, `calculations.rs` / `logic.rs`, focused repository files, `mod.rs`, and `tests.rs`), with each file strictly targeted below 250–300 lines. Monolithic single-file domains (> 300 lines) are strictly prohibited.
Code must adhere to a strict 4-tier layer separation anchored by the shared core:
1. **Presentation Layer (`apps/web-react/src/components/`, `apps/desktop-qt/qml/`, `apps/mobile-android/.../ui/`)**: Pure UI rendering, event dispatching, and styling. Avoid embedding raw business calculations, storage I/O, or direct IPC calls directly inside UI views.
2. **Orchestration Layer (`apps/web-react/src/hooks/`, `apps/desktop-qt/src/controllers/`, `apps/web-react/src/store/`)**: State management, lifecycle binding, memoization, and coordination between UI and services. Controllers and hooks are thin adapters and must not reimplement business calculations or manual SQL queries.
3. **Domain & Business Layer (Unified Core SSOT - `core/synapse-core/`)**: Pure domain entities, algorithms (e.g., FSRS spacing, habit streaks, financial summary deltas, quiz scoring, text diffing), completely decoupled from frontend UI frameworks. Web-exclusive helpers remain in `apps/web-react/src/services/` and `src/utils/` only when unshared.
4. **Infrastructure & Platform Layer (`core/synapse-core/src/db/`, `bridges/`, `apps/web-react/src/api/`)**: SQLite WAL persistence, database migrations, typed platform bridges (`bridge-qt`, `bridge-uniffi`, `bridge-wasm`), and multiplatform web storage abstractions.

### 2.2. Cross-Client Module, Naming, and Atomic File Parity

To make feature work easy to locate and compare across React/Tauri, native Qt, and native Android, every client MUST use the same canonical module IDs, feature vocabulary, user-action names, and typed operation contracts. Keep files atomic and organize equivalent responsibilities in matching module-local subdirectories where each framework has that responsibility.

- **Canonical Module IDs**: Use the module IDs in [`docs/architecture/module-structure.md`](./docs/architecture/module-structure.md) in React component/service roots, Qt QML/controller/test roots, and Android feature/test packages. Do not introduce aliases for new source directories; preserve legacy route, database, IPC, and serialized identifiers unless a separately reviewed migration requires changing them.
- **Logical Structure Parity**: Pair corresponding feature files by responsibility and stable semantic name (for example `TableColumnFilterSection`, `PageHistoryModal`, `FileAttachmentWidget`, and `SlashMenu`). Use each framework's conventional file extension and presentation suffix (`.tsx`, `.qml`, `Screen.kt`) while retaining the shared feature name. Keep module-owned subdirectories such as `components/table/`, `modals/`, `hooks/`, or `ui/` aligned when the equivalent responsibility exists.
- **Framework-Correct Physical Layout**: Do not force React, QML/C++, and Compose into identical physical trees, create empty mirror folders, or add wrapper files solely to imitate another language. React keeps its established `components/`, `hooks/`, `services/`, and `api/` roots; Qt keeps `qml/<module>/` and `src/controllers/<module>/`; Android keeps `features/<module>/ui/` and adds `viewmodel/` or data packages only when needed. The Expo WebView shell hosts React and must not duplicate product modules.
- **Shared Action and Contract Names**: Equivalent public actions and typed payload fields MUST use the same semantic names and behavior across clients. Prefer the same callable name where the contract is exposed in each language. If a language or framework convention requires a different symbol, keep it a direct, documented mapping in the module parity map; do not allow concepts or payload meaning to drift.
- **Shared Domain Implementation**: Cross-client business rules and persistence remain in `core/synapse-core/`, exposed through typed Tauri, Qt, WASM, and UniFFI adapters. Do not duplicate a Core-owned function under matching names in app code; client adapters translate presentation events to the shared operation.
- **Atomic Files**: A file should have one cohesive reason to change and a clear counterpart when a client implements that same responsibility. Keep files focused and near the existing <300-line target; split along domain/UI/orchestration boundaries, not into trivial one-function fragments. Match test names and module grouping so the same behavior can be found in every client.
- **Parity Map**: When adding or reorganizing a shared feature, update the cross-client mapping in [`docs/architecture/module-structure.md`](./docs/architecture/module-structure.md), including counterpart files, action/contract names, and intentional platform differences. Do not claim parity based only on matching names.
- **Workflow Skill**: Use [the cross-platform module parity skill](./.agents/skills/cross-platform-module-parity/SKILL.md) for shared structure/naming/contract work; use the [Desktop Qt parity skill](./.agents/skills/desktop-qt-parity/SKILL.md) for React-to-Qt implementation and visual acceptance.
- **Scope Boundaries**: If the user limits an audit or implementation to one module, keep source inspection, findings, fixes, and verification within that module. Read or change shared Core/bridge code only when the scoped feature requires it; do not inspect neighboring product modules as a substitute for scope control.

The canonical feature roots are:
- **React/Tauri**: `apps/web-react/src/components/<module>/`, plus feature-owned orchestration and service files in the established `hooks/`, `services/`, `store/`, and `api/` roots; Tauri remains a thin Rust adapter in `src-tauri/`.
- **Desktop Qt**: `apps/desktop-qt/qml/<module>/`, `src/controllers/<module>/`, and `tests/<module>/`.
- **Native Android**: `apps/mobile-android/app/src/main/java/com/synapse/features/<module>/ui/`, optional cohesive `viewmodel/` and data packages, and module-grouped JVM/instrumentation tests.
- **Android WebView**: `apps/mobile-webview/` owns shell integration only and reuses the React product implementation.

Qt's presentation subdirectories should align with React's canonical feature vocabulary when an equivalent exists:
  - `ai-sidebar/`, `anki/`, `auth/`, `calendar/`, `culture/`, `diagrams/`, `files/`, `finance/`, `focus/`, `habits/`, `home/`, `library/`, `notes/`, `notifications/`, `practice/`, `questions/`, `settings/`, `sharing/`, `trash/`, `vault/`, `video/`, `workspace/`.
  - `layout/`: Shell layout, sidebar navigation, top tab bar, command palette, global shortcuts, and `GlobalModalsHost.qml` (mirroring `apps/web-react/src/components/layout/`).
  - `ui/`: Design system tokens (`Theme.qml`), vector icons (`AppIcon.qml`), and common confirmation dialogs (`AppConfirmDialog.qml`) (mirroring `apps/web-react/src/components/ui/`).
  - Root `qml/`: Contains only root application entry points (`main.qml`, `AuthenticatedApplication.qml`, and `qmldir`).

---

## 3. SOLID Principles in Practice

Every module, class, hook, and function must embody the **SOLID** software engineering principles:

### 3.1. Single Responsibility Principle (SRP)
- **No Monolithic Files ("God" Components)**: A file must have a single reason to change. Separate large files (>300 lines) into focused sub-components, container hooks, and domain services.
- **Split UI and Logic**: Presentation components render UI; custom hooks (`use...`) orchestrate state and side effects; services handle data persistence and platform operations.
- **Micro-Components**: Break complex modals, sidebars, and editor panels into atomic, cohesive sub-components located in dedicated subdirectories (e.g., `apps/web-react/src/components/<feature>/modals/`, `apps/web-react/src/components/<feature>/ui/`).

### 3.2. Open / Closed Principle (OCP)
- **Extensible via Abstraction**: Design components and services to be open for extension but closed for modification.
- **Registry & Strategy Patterns**: Prefer registries and strategy maps (e.g., `ViewFactory`, editor node extensions, custom formatters) over massive, hard-coded `switch/case` statements that require modifying core files when adding new variants.

### 3.3. Liskov Substitution Principle (LSP)
- **Interchangeable Platform Adapters**: All platform implementations (e.g., `tauriApi` in `apps/web-react/src/tauri-api.ts` and `webApi` in `apps/web-react/src/services/web-api.ts`) must strictly adhere to the same contract interface (`window.api` typed in `apps/web-react/src/api/types.ts`).
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
- **Single Source of Truth**: Keep shared types centralized in `apps/web-react/src/types/` or co-located in cohesive module-specific `types.ts` files with clear barrel exports.

### 4.3. Anti-Patterns Catalog (Strictly Prohibited)
1. **Silent Error Swallowing**: Empty `catch {}` blocks are strictly forbidden. All errors must be logged with contextual metadata and provide fallback UX or user feedback.
2. **Async Memory Leaks & Stale Closures**:
   - Always cancel unmounted asynchronous operations (`AbortController`, mounted flags, or subscription teardown in `useEffect`).
   - Keep dependency arrays in `useEffect`, `useCallback`, and `useMemo` strictly accurate and exhaustive.
3. **Prop Drilling**: Avoid passing props through more than 2 intermediate components. Use React Context / Store reducers or component composition.
4. **Magic Values & Hardcoded Strings**:
   - Extract raw constants, numeric thresholds, timeout intervals, and action keys into well-named constants or `const` enums.
5. **Direct State Mutations**:
   - Never mutate state objects or arrays in-place (`array.push()`, `obj.field = ...`). Always use immutable updates (`[...array]`, `{ ...obj }`).
6. **Premature Complexity vs Algorithmic Inefficiency**:
   - Use $O(1)$ lookups (`Map`, `Set`, lookup tables) when handling large datasets (notes, tags, flashcards) inside frequent render or search loops.
7. **Raw Browser Confirms & Unconfirmed Deletions**:
   - Never use raw `window.confirm(...)` which freezes the WebView thread and breaks dark theme aesthetics. Route all confirmations through `window.api.app.showConfirm` or `ConfirmDialog`. Never execute destructive deletions without explicit, user-confirmed intent or fallback to silent approval.
8. **Unsandboxed Iframes**:
   - All embedded `<iframe>` elements (document previews, video frames, external media) must include explicit `sandbox` attributes (e.g., `sandbox="allow-scripts allow-forms"` or `sandbox="allow-scripts allow-presentation allow-same-origin"`) and descriptive `title` attributes for defense-in-depth against XSS and context escalation.
9. **Unprotected Double-Submissions**:
   - Asynchronous mutation actions (vault credential saving, page renaming, uploads) must track processing state (`isSaving` / `isSubmitting`), disable trigger buttons while running, and render spinners to prevent duplicate records or race conditions.
10. **Raw SQL Construction & Domain Duplication in UI/Controllers**:
    - Assembling raw SQL strings, executing unstructured database queries, or calculating business metrics (e.g. account balances, habit streaks, quiz scoring, flashcard queues) directly in C++ controllers, Tauri commands, or React hooks is strictly prohibited. All queries and domain logic must be housed in `core/synapse-core/` and consumed via typed bridge functions.

---

## 5. Safe Multiplatform Handling (Tauri vs Web)

- **Native Availability Check**: Always verify the availability of native Tauri APIs before calling them and provide clean, resilient fallbacks for Web/IndexedDB environments.
- **Isolated IPC Layers**: Never make direct `invoke()` or `@tauri-apps/plugin-*` calls inside UI presentation components. Route all platform communication through `apps/web-react/src/api/` or `apps/web-react/src/services/` adapters.
- **Cross-Platform Path Resolution**: Handle path separators, URI encoding, and special characters safely across Linux, macOS, and Windows.

---

## 6. Language & Documentation Standard (Agent-Friendly & English Only)

- **Source Code Comments**: All code comments (`//`, `/* */`, JSDoc, docstrings) must be written **strictly in English**.
  - Comments must be concise, objective, and explain the **rationale** (*why*), concurrency nuances, or complex integration edge cases (e.g., TipTap/Yjs/Tauri), avoiding obvious statements.
- **Obsolete Comment Cleanup**: Stale comments, outdated notes, dead commented-out code, or remarks that no longer reflect actual behavior must **always be cleaned up and removed** during file maintenance.
- **Technical Documentation**: All project documentation (`docs/`, architecture markdowns, manuals, guides, and specifications) must be written **strictly in English**.
- **Localized README**: `README.pt-BR.md` is the intentional Portuguese localization; other active technical documentation remains English.
- **Agent-Friendly Readability**: Explanations and documentation must be structured, direct, and easy for AI agents and developers to digest quickly.

### 6.1. Documentation Ownership and Status
- Use [`docs/documentation-status.md`](./docs/documentation-status.md) to identify current sources of truth and historical snapshots.
- Keep [`docs/native-desktop-parity.md`](./docs/native-desktop-parity.md) and [`docs/security/encryption-coverage.md`](./docs/security/encryption-coverage.md) synchronized with native feature and encryption changes.
- Plans, old test totals, benchmark snapshots, and checked boxes are not implementation evidence. Revalidate every completion claim against the current code and a reproducible command.
- Use relative repository links in Markdown. Do not include personal machine paths, local database locations, or `file://` links.

### 6.2. Documentation and Audit Separation
- Keep `docs/` as the home for consolidated, durable project documentation: architecture, platform guides, security boundaries, build instructions, and verified current status. Do not create an `audits/` subfolder inside `docs/`.
- Store active audit work at the repository root in `audits/<topic>/`. Use it for working comparisons, unresolved findings, source maps, evidence logs, and implementation checklists.
- When an audit is complete, move its durable conclusions and reproducible evidence into the appropriate `docs/` source, update `docs/README.md` and `docs/documentation-status.md`, then delete the completed working artifact. Do not delete an audit with unresolved acceptance gates before preserving its remaining work and status.
- Keep the four client architecture guides current under `docs/platforms/`: React Web/Tauri, native Qt desktop, native Android, and the Android WebView shell. Explain shared Core and bridge ownership without claiming a capability is implemented until the call path is verified.
- Keep repository skills under `.agents/skills/` current with the same client model: React Web/Tauri, native Desktop Qt, native Android Compose, and the Android WebView shell. Each skill must state which clients it covers, use native framework practices for those clients, describe actual capability boundaries, and link to the applicable cross-client or platform-specific skill. Do not imply parity or encryption/sync support from architecture intent alone. Retire obsolete skills and all their package/script references together.
- Keep the skill catalog in `.agents/skills/README.md` synchronized with installed skills and their current scope. Use active work artifacts only in repository-root `audits/`; consolidate accepted conclusions in `docs/` and keep audits out of docs.
- When comparing dialogs or modals, inventory every React entry point and state. Compare same-size viewports, dimensions, anchoring, backdrop, scrolling, visual tokens, controls, validation, empty/loading/error states, action ordering, keyboard behavior, initial/restored focus, and resize behavior. Track missing Qt dialogs as explicit parity gaps.

---

## 7. Testing Standards & Execution Performance

- **Targeted Test Execution First (Sub-Second Feedback)**:
  - During development, audits, and iterative changes, **DO NOT run the full global test suite (`npm test`)** unless requested or required for a release gate. Test counts and duration change; inspect the active package scripts instead of relying on fixed totals.
  - **Always use Targeted Testing**:
    - Specific module directory: `npm run test -- src/path/to/module/` (~1-3s).
    - Related dependency runner: `npm run test:related -- <modified_files>` (~2-3s).
    - Focused core services and domain tests: `npm run test:unit`.
    - Coverage measurement: `npm run test:coverage` (v8 engine).
- **Performance Budgets & Benchmarking Gates**:
  - Run the production performance budget gate: `npm run check:budgets` to verify that bundle sizes, CSS metrics, and vendor chunks adhere to thresholds.
  - Run reproducible micro-benchmarks: `npm run benchmark` to measure builds, cryptographic primitives, memory retention deltas, and data scale traversals.
- **Type Checking over Full Test Sweeps**:
  - To verify cross-project contract integrity quickly without running heavy DOM/worker runners, use `npm run typecheck`.
- **Full Regression Suite (`npm test`) Reservation**:
  - Run the global suite (`npm test`) **only when explicitly requested by the user** or before concluding a massive multi-module release milestone.
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
3. **Non-Regression Verification (Targeted & Fast)**:
   - Run targeted tests for the changed module (`npm run test -- <target_path>` or `npm run test:related -- <files>`) for sub-3-second verification.
   - Run `npm run typecheck` if type contracts across multiple layers were modified.
   - Do NOT run full `npm test` during iterative turns unless explicitly requested by the user.
4. **Atomic & Well-Commented Commits**:
   - **Atomic Scope**: Whenever committing modifications, split changes into self-contained, atomic commits representing a single logical change (e.g., isolating a bug fix, refactoring a single helper, or updating a type interface). Avoid giant, monolithic multi-purpose commits.
   - **Descriptive Messages (English Only)**: Write clear, meaningful commit messages (following conventional commits: `fix(...)`, `feat(...)`, `refactor(...)`, `perf(...)`, `test(...)`), including a concise summary title and a well-elaborated body detailing the *why* and *what* whenever necessary.

---

## 9. Modern Industry Standards & Creative Performance Engineering (Big Tech Best Practices)

To guarantee that Caderno operates with the responsiveness, fluidity, and elegance of elite industry applications (e.g., Notion, VS Code, Linear, Figma), code must strictly adhere to these 12 modern engineering standards:

1. **Zero-Latency Perceived UX (SWR / Optimistic Transitions)**:
   - Apply the Stale-While-Revalidate (RFC 5861) pattern and in-memory caches to transitions. If cached or backup data exists, render it synchronously for **0ms perceived latency**, revalidating silently in the background rather than freezing the UI with loading spinners.
2. **Zero-Rerender Visual Interactions (CSS-Driven Hover & Active States)**:
   - Never use React component state (`useState`, `isHovered`) for visual effects that native CSS handles natively. Leverage Tailwind composite utilities (`group-hover`, `peer`, `:hover`, `focus-within`) to offload interactions 100% to the GPU compositor without triggering React re-renders or garbage collection.
3. **Layout Thrashing & Forced Synchronous Reflow Prevention**:
   - Strictly guard calls to geometry-reading APIs (`getBoundingClientRect()`, `getComputedStyle()`, `elementFromPoint()`). Always check node equality, positional identifiers, or cache flags *before* querying DOM metrics in `requestAnimationFrame` loops. Batch DOM reads before writes.
4. **Off-Main-Thread Media & Image Optimization**:
   - Always specify native `loading="lazy"` and `decoding="async"` on images and media frames. Prevent main-thread decoding bottlenecks during fast scrolling.
5. **Effective Dynamic Code-Splitting**:
   - Isolate heavy editor extensions, PDF viewers, diagrams, and media engines behind clean `React.lazy` and `Suspense` boundaries. Avoid leaking static imports into root layout modals that break Vite/bundler chunk isolation.
6. **Algorithmic Indexing ($O(1)$ Hash Maps vs $O(N)$ Scans)**:
   - Pre-index entities into `Map` and `Set` collections before executing iterative lookups, transformations, or batch saves, maintaining constant-time execution regardless of vault size.
7. **GPU Compositor Acceleration (Transform & Opacity Only)**:
   - Never animate layout-triggering properties (`top`, `left`, `width`, `height`, `margin`, `padding`). Animate exclusively via hardware-accelerated CSS properties: `transform` (`translate3d`, `scale`, `rotate`) and `opacity`. Use `will-change` sparingly and only during active transitions.
8. **Passive Event Listeners & RAF Throttling**:
   - Always register scroll, mousewheel, and touch listeners with `{ passive: true }` (or `{ capture: true, passive: true }`) so the browser compositor never waits on JavaScript execution. Throttle high-frequency events (cursor tracking, resize, drag) using `requestAnimationFrame` or rate-limiting timestamps.
9. **Off-Main-Thread Heavy Computation (Web Workers & Schedulers)**:
   - Heavy compute tasks (AES/PBKDF2 cryptography, OCR parsing, PDF text extraction, diffing algorithms, full-text fuzzy indexing) must run in Web Workers or be chunked across microtasks using `scheduler.yield()` / `requestIdleCallback` to avoid dropping UI frames.
10. **Virtualization, DOM Bloat Prevention & Compositor Scroll Layer**:
    - Avoid mounting hundreds of heavy off-screen DOM nodes in lists (cards, flashcards, book grids, logs).
    - Leverage native CSS `content-visibility: auto` with `contain-intrinsic-size` for heavy composite cards (e.g., question batteries with markdown formulas, inputs, and options). For lightweight uniform list items, prefer static `contain: layout style`.
    - Prohibit `transition-all` on scrolling items; use targeted transitions (`transition-colors`, `transition-opacity`).
    - Standardize module scroll viewports with `.smooth-scroll-container` (`overflow-y: auto`, `overscroll-behavior-y: contain`, `transform: translateZ(0)`, `-webkit-overflow-scrolling: touch`).
11. **Store Subscription Slicing & Selector Isolation**:
    - Prevent whole-tree re-renders by selecting only the minimal required slice of state. Wrap high-frequency leaf components in `React.memo` with custom prop comparators to isolate render boundaries.
12. **Zero-Leak Lifecycle & Garbage Collection Discipline**:
    - Always clean up event listeners, timers (`clearTimeout`, `clearInterval`), Yjs CRDT observers, and abort in-flight asynchronous operations (`AbortController`) on unmount to prevent memory leaks and detached DOM node retention.

---

## 10. Immersive Minimalist Architecture & Zen Visual Design Standards

To ensure study, reading, and review experiences achieve absolute focus without cognitive or visual fatigue (inspired by Claude, Notion, Typeform, and Anki), all focus modes, readers, and inspectors must strictly adhere to the following 6 design pillars:

### 10.1. Full-Canvas Immersive Focus (Zen Canvas over Floating Boxes)
- **Eliminate Claustrophobic Modals**: Never trap the user inside floating popup boxes with stacked backdrops, borders, and margins (`max-w-3xl`, `max-h-[92vh]`, heavy outer shadows) when entering dedicated focus activities (e.g., question batteries, text/document readers, page history inspectors, media viewers).
- **Dedicated Viewport Canvas**: Mount immersive views directly onto a seamless, full-viewport canvas (`fixed inset-0 z-[100] bg-zinc-950 flex flex-col`). Background distraction is eliminated at the root level rather than dimmed behind a translucent overlay.
- **Escape Hatch**: Always provide a clear, effortless exit mechanism: a prominent `Esc` keyboard binding and a subtle, minimalist close/restore button in the header.

### 10.2. Refined Neutral & Monochrome Palette (Zero Visual Screaming)
- **Neutral Dark Canvas**: Use soothing, deep neutrals (`zinc-950` backgrounds, `zinc-900` elevated surfaces, `zinc-800` subtle hover states) instead of harsh pitch black or muddy grays.
- **Whisper-Thin Borders**: All borders must be subtle and delicate (`border-white/[0.04]` to `border-white/[0.08]`), avoiding high-contrast outlines that distract the eyes.
- **Muted, Purposeful Accent Colors**:
  - Prohibit screaming, high-saturation accent bars or loud purple backgrounds (`bg-brand-500` progress lines or oversized badges).
  - Accents must be functional and subdued:
    - **Success / Correct**: Soft esmerald (`bg-emerald-500/10 border-emerald-500/25 text-emerald-300`).
    - **Error / Incorrect**: Muted rose/coral (`bg-rose-500/10 border-rose-500/25 text-rose-300`).
    - **Warnings / Hints / Gabarito**: Gentle warm amber (`bg-amber-500/10 border-amber-500/25 text-amber-300`).
    - **Active / Neutral Focus**: Subtle slate/zinc highlight (`bg-white/10 text-white` or `ring-1 ring-white/20`).

### 10.3. Cognitive Load & Visual Noise Elimination
- **Single Source of Progress Truth**: Avoid redundant progress representations. If a scrollbar or step counter (`03 / 10`) is present, do not stack competing thick progress bars, badges, and percentage chips.
- **Suppress Inactive Metadata**: During active focus and question solving, hide non-essential tags, category pills, and duplicate counters. Reserve aggregate statistics and performance metrics for the post-completion summary screen.
- **Quiet Transitions**: Transitions must feel natural and effortless via hardware-accelerated CSS (`transition-all duration-150 ease-out`). Avoid jarring layout shifts, flashing backgrounds, or violent screen vibrations.

### 10.4. Ergonomic Typography & Generous Breathing Space
- **Optimal Reading Column**: Content must be constrained to a comfortable reading measure (`max-w-2xl` to `max-w-3xl` mx-auto) with ample vertical breathing room.
- **Legible Hierarchy**: Enunciados, questions, and body text should use comfortable sizing (`text-base` to `text-lg`), relaxed line heights (`leading-relaxed`), and high-contrast readable type (`text-zinc-100` / `text-white/95`).
- **Comfortable Option Stacking**: Layout options and choices vertically with generous hit areas and ample padding, avoiding cramped multi-column grids that cause eye fatigue.

### 10.5. Keyboard-First Fluidity (Zero-Mouse Fatigue)
- **Eliminate Cursor Hunting**: Never require the user to hunt for small buttons with the mouse between successive steps.
- **First-Class Shortcuts**:
  - Direct selection: `A`, `B`, `C`, `D` or `1`, `2`, `3`, `4`.
  - Action / Progression: `Enter` or `Space` to confirm or proceed to the next item.
  - Explanation / Gabarito toggle: `G` or `Alt+G`.
  - Navigation: `ArrowLeft` / `ArrowRight`.
  - Exit: `Escape`.
- **Subtle Visual Cues**: Display clean, understated shortcut badges (e.g., `[Enter]`, `[Esc]`, `A`) adjacent to actions to build muscle memory without cluttering the interface.

---

## 11. Mobile WebView & Responsive Adaptation Standards

To guarantee that Caderno delivers a first-class native Android experience inside the `apps/mobile-webview` shell while maintaining 100% functional and visual parity across desktop (Tauri) and browser web environments, code must strictly adhere to these standards:

### 11.1. Native Shell & Token Consistency
- **Unified Canvas Palette**: Native status bars, navigation bars, splash screens, and adaptive backgrounds must strictly align with Caderno's primary canvas token `#0f0e17` (`bg-dark-bg`), eliminating visual cut seams.
- **Single Source of Safe Area Insets**: Safe area insets (`--safe-area-top`, `--safe-area-bottom`, etc.) must be handled cleanly via CSS environment variables and injected CSS custom properties. Never apply native double-padding (e.g. native container `paddingBottom` combined with injected CSS `safe-area-bottom`).

### 11.2. Viewport & Layout Discipline (Zero Gambiarra)
- **Viewport Dimensioning**: Avoid rigid `w-screen` which triggers horizontal scrollbars on mobile browsers and WebViews due to overlay scrollbars or navigation gutters; use `w-full max-w-full overflow-hidden`.
- **Dynamic Viewport Height**: Use dynamic viewport units (`100dvh` / `100svh`) instead of legacy `100vh` to prevent mobile address bar and virtual keyboard layout crushing.
- **Adaptive Padding**: Avoid rigid desktop paddings (`p-8`, `p-12`) that consume excessive horizontal space on 360-412px viewports. Employ mobile-first responsive scale steps (e.g., `p-4 sm:p-6 md:p-8`).

### 11.3. Android Hardware Back Navigation Pipeline
- **Unified Event Pipeline**: All dismissible overlays (modals, drawers, dropdowns, floating pages, active chat sessions) must listen to the custom `caderno-back-press` event dispatched by `useAppBackPress`.
- **Hierarchical Interception**: Sub-components must intercept back navigation progressively (e.g., in chat: active conversation → chat session list → close sidebar) using `e.preventDefault()`, preventing accidental app exits.

### 11.4. Responsive Master-Detail & Capability Detection
- **Mobile Split Overlays**: High-density side-by-side layouts (e.g., Calendar + TaskFeed, Vault 3-panel list/detail) must transition gracefully to responsive tabs or master-detail drill-downs guarded by `md:` breakpoints on mobile screens.
- **Capability Detection over User-Agent Sniffing**: Never rely on fragile, scattered `navigator.userAgent` regexes for UI layout decisions. Use capability helpers `isTouchScreen()` and `isMobileScreen()` or responsive CSS media queries (`@media (max-width: 767px)`, `@media (pointer: coarse)`).

### 11.5. WebView Security & Touch Optimization
- **Touch Responsiveness**: Use `touch-action: manipulation` globally to eliminate the 300ms tap delay while preserving pinch-to-zoom on image canvases.
- **Text Selection Isolation**: Apply `-webkit-user-select: none` to chrome and navigation elements, while strictly whitelisting editable and study content (`.select-text`, `[data-selectable="true"]`, TipTap editor surfaces).
- **Hardened WebView Isolation**: Never expose unrestricted JavaScript interfaces or sensitive storage keys across unvalidated origins. Keep file access strictly bounded and all IPC communication validated.

---

## 12. Living User Guides & Continuous Documentation Synchronization

To ensure users never get lost as features grow in depth and power, Caderno enforces a strict, self-documenting in-app knowledge architecture:

### 12.1. Dedicated In-App Module Guides (`<Module>HelpModal.tsx`)
- Every primary application module (`library`, `questions`, `vault`, `focus`, `finance`, `culture`) as well as rich editor extensions (`habits`) must provide a dedicated, interactive User Guide modal (e.g., `LibraryHelpModal`, `QuestionsHelpModal`, `VaultHelpModal`, `FocusHelpModal`, `FinanceHelpModal`, `CultureHelpModal`, `HabitsHelpModal`).
- Guides must follow the Zen Design standard: modal dialog with categorized sidebar navigation, clear feature explanations, actionable step-by-step instructions, keyboard shortcut cheat sheets, and pro-tips.
- The guide trigger button (`HelpCircle` icon, labeled "Guia") must be prominently placed in the module's main navigation header or toolbar (e.g., adjacent to cloud sync, settings, or primary actions).

### 12.2. Mandatory Guide Synchronization on Any Feature Addition or Change
- **Zero Stale Documentation**: Whenever a new feature, filter, shortcut, UI layout, or business rule is added or modified in a module, **the corresponding module user guide (`<Module>HelpModal.tsx`) MUST be updated concurrently within the same task or commit**.
- Omitting guide updates when introducing or altering module functionality is strictly prohibited and considered a regression in project quality standards.
- Maintain accurate keyboard shortcut references across all guide tabs whenever shortcuts are assigned or adjusted.

---

## 13. Internationalization (i18n) & English-First Architectural Standard

To ensure Caderno operates as a world-class application catering to global standards while preserving seamless multilingual adaptability (like VS Code, Obsidian, and Linear), all UI presentation must strictly adhere to these internationalization principles:

### 13.1. English-First Default UI Standard
- **English as Canonical Base**: All user-facing screens, options, titles, tooltips, dialogs, button labels, placeholders, toasts, and status indicators must default to **English (`en`)**.
- **Source of Truth Dictionaries**: The primary translation dictionary is `apps/web-react/src/i18n/locales/en.json`. All newly introduced user-facing text must be defined first in `en.json` and mirrored in `apps/web-react/src/i18n/locales/pt.json` (and future locale dictionaries).

### 13.2. Modular & Typed JSON Dictionaries (Zero Hardcoded Strings)
- **No Raw Hardcoded UI Strings**: Never embed raw user-facing Portuguese or English text strings directly inside JSX/TSX elements. All visual strings must be accessed through the typed translation hook `const { t } = useI18n()`.
- **Strict TypeScript Schema & Autocomplete**: The i18n engine must enforce strict recursive type inference (`NestedKeyOf<TranslationSchema>`). Magic translation strings that do not exist in the dictionary schema are strictly prohibited and must trigger compile-time TypeScript errors.
- **Zero `any` & Safe Interpolation**: Dynamic translation values (e.g. `{{count}}`, `{{name}}`) must be validated and injected safely without any type escapes.

### 13.3. Settings Language Option & Multiplatform Persistence
- **Dedicated Settings Selector**: The user can toggle languages in Settings (`GeneralTab.tsx`). It is rendered at the top of the General tab with prominent language cards, EN/PT badges, and real-time active indicators.
- **Single Source of Preference Truth**: The user's language selection is stored in `AppSettings.language` (`'en' | 'pt-BR'`), defaulting strictly to `'en'`.
- **Seamless Reactive Switching**: Language switching is instant via `I18nProvider` without requiring application reload or freezing frames.
- **Cross-Platform Sync**: Language preferences automatically sync across desktop (Tauri), web browser (`localStorage` + IndexedDB / cloud config), and mobile webview, emitting `app-settings-changed` events across active windows.
- **Document Element Synchronization**: Active language is dynamically synced to `<html lang="en">` or `<html lang="pt-BR">` to support assistive technology, browser spellcheck, and `:lang()` CSS selectors.

### 13.4. 100% Dictionary Key Parity & Regression Testing
- **Automated Parity Enforcement**: Every translation key present in `apps/web-react/src/i18n/locales/en.json` MUST exist in `apps/web-react/src/i18n/locales/pt.json` and vice versa.
- **Vitest Parity Assertion**: The test suite in `apps/web-react/src/i18n/i18n.test.tsx` recursively asserts 100% key parity on every test run. Missing keys on either side fail the build immediately.
- **Graceful Fallback**: If a key is ever dynamically requested in `pt-BR` that is absent, the engine falls back to `en.json` first before returning the raw key path.

### 13.5. Standard Code Recipe
```tsx
import { useI18n } from '../i18n';

export function MyComponent() {
  const { t, language, setLanguage } = useI18n();

  return (
    <div>
      <h3>{t('settings.language.title')}</h3>
      <p>{t('settings.subtitle', { category: 'editor' })}</p>
      <button onClick={() => setLanguage(language === 'en' ? 'pt-BR' : 'en')}>
        {t('settings.language.switchLanguage')}
      </button>
    </div>
  );
}
```

---

## 14. Repository Layout & Core Commands

### 14.1 Product and Shared-Code Map

The repository contains four application targets and a shared Rust core. Keep product-specific code inside its owning app; place shared Rust domain logic in `core/synapse-core/` and platform bindings in `bridges/`.

```text
synapse/
├── apps/
│   ├── web-react/          # React 19 web app and its Tauri v2 desktop wrapper
│   │   ├── src/            # React UI, services, state, and web platform adapters
│   │   ├── public/         # Web assets and service worker
│   │   └── src-tauri/      # Tauri Rust backend for the hybrid app
│   ├── desktop-qt/         # Native Qt 6 / QML / C++ desktop app
│   ├── mobile-android/     # Native Android app (Kotlin / Compose)
│   └── mobile-webview/     # Expo Android shell hosting the React web app
├── bridges/                # Qt C ABI, UniFFI, and WebAssembly adapters
├── core/synapse-core/      # Shared Rust domain and persistence logic
├── docs/                   # Architecture, guides, module docs, and parity tracking
├── tools/scripts/          # Cross-product native build helpers
├── .agents/skills/         # Repository-specific engineering playbooks
├── Cargo.toml              # Root Rust workspace
└── package.json            # Root npm workspace command surface
```

The authoritative ownership, dependency boundaries, build commands, and migration notes live in [the repository layout guide](./docs/architecture/repository-layout.md).

Use consistent module IDs across clients while retaining framework-specific layers. React groups UI at `apps/web-react/src/components/<module>` and keeps orchestration, domain logic, and platform adapters in their established layer roots. Qt pairs `apps/desktop-qt/qml/<module>` with `apps/desktop-qt/src/controllers/<module>`. Native Android screens live in `features/<module>/ui`; the Expo WebView shell does not duplicate product modules. See [the cross-application module structure guide](./docs/architecture/module-structure.md).

### 14.2 Core Commands

Run npm commands from the repository root unless a command explicitly uses `--prefix` or changes into an app directory. The root npm scripts delegate to the React workspace; `apps/mobile-webview/` remains a separate Expo install with its own lockfile.

| Command | Purpose |
| :--- | :--- |
| `npm install` | Install dependencies for the root npm workspace (`apps/web-react`) |
| `npm run dev` | Launch the React/Vite app at `http://localhost:35174` |
| `npm run build` | Type-check and build the React/Tauri frontend |
| `npm run build:web` | Build the static web bundle into `apps/web-react/dist-web/` |
| `npm run typecheck` | Type-check the React workspace without emitting files |
| `npm run test -- src/services/crypto.test.ts` | Run a focused React workspace test |
| `npm run test:related -- src/services/crypto.ts` | Run tests related to changed React workspace files |
| `npm run lint` | Lint the React workspace |
| `npm run tauri -- dev` | Launch the React + Tauri desktop app |
| `npm run tauri -- build` | Package the React + Tauri desktop app |
| `npm --prefix apps/mobile-webview run start` | Start the Expo WebView shell |
| `cmake -S apps/desktop-qt -B apps/desktop-qt/build` | Configure the native Qt desktop app |
| `cargo test --workspace` | Run Rust workspace tests |

