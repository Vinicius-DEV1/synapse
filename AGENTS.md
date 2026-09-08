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

## 7. Testing Standards & Execution Performance

- **Targeted Test Execution First (Sub-Second Feedback)**:
  - During development, audits, and iterative changes, **DO NOT run the full global test suite (`npm test`)**, as running all 237 files takes over 2 minutes and severely halts productivity.
  - **Always use Targeted Testing**:
    - Specific module directory: `npx vitest run src/path/to/module/` (~1-3s).
    - Or related dependency runner: `npx vitest related --run <modified_files>` (~2-3s).
- **Type Checking over Full Test Sweeps**:
  - To verify cross-project contract integrity quickly without running heavy DOM/worker runners, use `npx tsc -b --noEmit`.
- **Full Regression Suite (`npm test`) Reservation**:
  - Run the global suite (`npm test`, all 237 test files) **only when explicitly requested by the user** or before concluding a massive multi-module release milestone.
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
   - Run targeted tests for the changed module (`npx vitest run <target_path>` or `npx vitest related --run <files>`) for sub-3-second verification.
   - Run `npx tsc -b --noEmit` if type contracts across multiple layers were modified.
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
   - Always register scroll, mousewheel, and touch listeners with `{ passive: true }` so the browser compositor never waits on JavaScript execution. Throttle high-frequency events (cursor tracking, resize, drag) using `requestAnimationFrame`.
9. **Off-Main-Thread Heavy Computation (Web Workers & Schedulers)**:
   - Heavy compute tasks (AES/PBKDF2 cryptography, OCR parsing, PDF text extraction, diffing algorithms, full-text fuzzy indexing) must run in Web Workers or be chunked across microtasks using `scheduler.yield()` / `requestIdleCallback` to avoid dropping UI frames.
10. **Virtualization & DOM Bloat Prevention**:
    - Avoid mounting hundreds of heavy off-screen DOM nodes in lists (cards, flashcards, book grids, logs). Leverage list virtualization or native CSS `content-visibility: auto` with `contain-intrinsic-size` to allow the browser to skip layout and paint of off-screen elements.
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

