---
name: code-hardening-optimization
description: >-
  Optimizes, cleans, reorganizes, and hardens code and directory structures for
  maximum efficiency, readability, and resilience, strictly preserving all existing
  features, functionality, and visual UI/design.
---

# Skill: Code Hardening, Refactoring & Structural Optimization

Activate this skill when the user requests performance improvements, refactoring of confusing or monolithic code, reorganization/standardization of disorganized files, error resilience, anti-pattern remediation, or code hardening in the **Caderno** project.

---

## 1. Fundamental & Inviolable Rules

> [!CAUTION]
> ### STRICT CONSTRAINTS
> 1. **DO NOT SIMPLIFY / DO NOT REMOVE FEATURES**:
>    - Under no circumstances should you remove any features, options, shortcuts, edge-case handling, or existing user capabilities.
>    - Observable application behavior must remain identical or superior (faster/more resilient), never degraded or stripped down.
> 2. **DO NOT ALTER VISUAL DESIGN OR LAYOUT**:
>    - Modifying UI layouts, colors, spacing, Tailwind/CSS classes, icons, or visual presentation without explicit user instruction is strictly prohibited.
>    - The focus of this skill is **strictly under the hood** (internal logic, resilience, efficiency, SOLID compliance, and clean architecture).

---

## 2. Optimization & Hardening Pillars

### 2.1. SOLID Refactoring & Anti-Monolith Decomposition
- **Single Responsibility Principle (SRP)**:
  - Decompose "God" components and bloated files (>300 lines) into focused sub-components, custom orchestration hooks, and pure domain utilities.
  - Separate presentation (JSX/CSS) from orchestration (`useCallback`, `useEffect`, state) and domain algorithms.
- **Open/Closed Principle (OCP)**:
  - Replace sprawling multi-branch `switch/case` statements with registry/lookup maps or strategy objects (e.g., `ViewFactory`, editor node extensions).
- **Interface Segregation & Dependency Inversion (ISP / DIP)**:
  - Ensure consuming components depend on narrow, specific interfaces rather than bloated monolithic types.
  - Decouple UI components from low-level storage or platform drivers via adapter interfaces.

### 2.2. Strict Type Safety & Zero `any` Hardening
- **Eradicate Unsafe Types**: Replace `any`, `as any`, and unvalidated `as unknown as T` with:
  - Discriminated unions for multi-state data models.
  - Custom Type Guards (`function isType(val: unknown): val is Type`).
  - Strict generic constraints (`<T extends BaseItem>`).
  - Explicit return types on all exported functions, hooks, and service methods.

### 2.3. Anti-Pattern Elimination & Fault Tolerance
- **Eliminate Silent Error Swallowing**: Replace empty `catch {}` blocks with structured logging, diagnostic metadata, and user-facing error fallbacks.
- **Prevent Memory Leaks & Stale Closures**:
  - Guarantee cleanup of event listeners, intervals/timeouts, Yjs CRDT observers, and pending asynchronous requests (`AbortController`).
  - Maintain correct and exhaustive dependency arrays in `useCallback`, `useMemo`, and `useEffect`.
- **Immutable State Discipline**: Ensure all state updates avoid in-place mutations (e.g., replace `array.push()` / `item.prop = x` with spread patterns or immutable reducers).
- **Defensive Null/Undefined Guards**: Safely handle empty arrays, missing optional properties, and malformed IndexedDB/IPC responses.

### 2.4. Performance & Efficiency (Big Tech & Modern Industry Standards)
- **Zero-Latency Perceived UX (SWR / Optimistic Caching)**:
  - Employ Stale-While-Revalidate (RFC 5861) and in-memory caches. If data or backup state exists, render synchronously for 0ms perceived latency and revalidate asynchronously in the background.
- **Zero-Rerender Visual Interactions (CSS-Driven Interactions)**:
  - Never use React `useState` for hover or focus states that native CSS handles natively. Leverage Tailwind composite utilities (`group-hover`, `:hover`, `peer`) to offload interactions 100% to the GPU compositor without triggering React re-renders or garbage collection.
- **Layout Thrashing & Forced Reflow Prevention**:
  - Strictly guard DOM geometry queries (`getBoundingClientRect()`, `elementFromPoint()`). Always check node equality, positional identifiers, or cache flags *before* querying DOM metrics in animation frame loops.
- **Off-Main-Thread Media & Image Optimization**:
  - Always specify native `loading="lazy"` and `decoding="async"` on images and media frames to prevent main-thread decoding bottlenecks during fast scrolling.
- **Dynamic Bundle Code-Splitting**:
  - Isolate heavy editor extensions, PDF viewers, diagrams, and media engines behind clean `React.lazy` and `Suspense` boundaries. Prevent static import leaks into root layout modals.
- **React Rendering Optimization**:
  - Stabilize reference identities for handlers and computed values (`useCallback`, `useMemo`).
  - Isolate high-frequency volatile state so parent subtrees do not needlessly re-render.
- **Async I/O Concurrency & Algorithmic Efficiency**:
  - Pre-index entities into $O(1)$ lookup structures (`Map`, `Set`) before executing iterative lookups or batch operations.
  - Batch independent async calls with `Promise.all` rather than sequential `await`s.

### 2.5. Structural Cleanliness & Language Standards
- **Cohesive Directory Organization**:
  - Group related sub-components, modals, hooks, types, and tests in dedicated feature subdirectories (e.g., `src/components/<feature>/modals/`, `src/components/<feature>/hooks/`).
  - Update all barrel exports and import paths cleanly.
- **English-Only Comments & Documentation**:
  - All added comments must be concise English explaining the *why* and concurrency/platform nuances.
  - **Clean Obsolete Comments**: Actively remove outdated notes, dead commented-out code, and obsolete TODOs.

---

## 3. Step-by-Step Optimization Workflow

### Step 1: Pre-Audit & Smell Identification
1. Inspect the target file/directory to identify bottlenecks, SOLID violations, God components, `any` usage, and missing lifecycle cleanups.
2. Formulate clear goals (e.g., modularize 600-line monolith into 3 sub-components + 1 hook, eliminate 8 `any`s, fix memory leak in event listener).

### Step 2: Implementation Plan Generation
- Create the formal `implementation_plan.md` artifact before modifying code.
- Detail the target file breakdown, new files/sub-modules, strict parity guarantees, and verification steps.

### Step 3: Atomic Refactoring
- Execute changes iteratively.
- Verify that all public API contracts, component props, and visual Tailwind tokens remain 100% identical.

### Step 4: Verification & Type Checking
- Run `npm test` / `vitest` to ensure non-regression.
- Confirm zero TypeScript type errors.

---

## 4. Delivery Checklist

Before completing the task, verify:
- [ ] Are all original features, edge cases, and keyboard shortcuts completely preserved?
- [ ] Are visual designs, layouts, Tailwind classes, and CSS tokens 100% identical?
- [ ] Were monolithic files successfully decomposed into single-responsibility modules?
- [ ] Are all instances of `any` eliminated in favor of strict, safe types?
- [ ] Are all asynchronous tasks, subscriptions, and timers properly cleaned up on unmount?
- [ ] Are all comments written in concise English with dead comments removed?
- [ ] Do multiplatform fallbacks (Tauri vs Web) remain fully operational?
